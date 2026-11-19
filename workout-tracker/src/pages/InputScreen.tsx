import { useNavigate, useParams } from 'react-router-dom';
import {
  EXERCISES,
  type ExerciseKey,
  type Approach,
  type OwnedWorkout,
} from '@/types';
import { store } from '@/store';
import { useAuth } from '@/auth/AuthContext';
import { generateId } from '@/utils/id';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import ApproachRow from '@/components/ApproachRow';

function createEmptyApproach(): Approach {
  return {
    id: generateId(),
    reps: 1,
    hasExtraWeight: false,
    extraWeightKg: 0,
  };
}

export default function InputScreen() {
  const { exerciseKey } = useParams<{ exerciseKey: ExerciseKey }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const exercise = EXERCISES.find((e) => e.key === exerciseKey);

  const [approaches, setApproaches] = useState<Approach[]>([createEmptyApproach()]);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!exercise) {
      navigate('/');
    }
  }, [exercise, navigate]);

  if (!exercise || !user) {
    return null;
  }

  const handleApproachChange = (id: string, field: 'reps' | 'extraWeightKg' | 'hasExtraWeight', value: number | boolean) => {
    if (field === 'hasExtraWeight' && value === false) {
      setApproaches((prev) =>
        prev.map((a) => (a.id === id ? { ...a, hasExtraWeight: false, extraWeightKg: 0 } : a))
      );
      return;
    }
    setApproaches((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const addApproach = () => {
    setApproaches((prev) => [...prev, createEmptyApproach()]);
  };

  const removeApproach = (id: string) => {
    setApproaches((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSave = useCallback(() => {
    // Синхронная защита от двойного клика: isSaving обновляется только после ре-рендера.
    if (savingRef.current) return;

    setSaveError(null);

    const hasEmpty = approaches.some((a) => a.reps < 1);
    if (hasEmpty) {
      setValidationError('Введите количество повторений');
      return;
    }

    setValidationError(null);
    savingRef.current = true;
    setIsSaving(true);

    const now = new Date();
    const workout: OwnedWorkout = {
      id: generateId(),
      userId: user.id,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
      results: [
        {
          exerciseKey: exercise.key,
          approaches,
        },
      ],
    };

    try {
      if (!store.add(workout)) {
        setSaveError(
          'Не удалось сохранить тренировку: нет активного пользователя. Войдите снова и повторите.'
        );
        savingRef.current = false;
        setIsSaving(false);
        return;
      }
    } catch {
      setSaveError(
        'Не удалось сохранить тренировку: хранилище браузера переполнено или недоступно.'
      );
      savingRef.current = false;
      setIsSaving(false);
      return;
    }

    setApproaches([createEmptyApproach()]);
    savingRef.current = false;
    setIsSaving(false);
    navigate('/');
  }, [approaches, exercise, navigate, user]);

  const handleCancel = () => {
    const hasData = approaches.some((a) => a.reps > 1);
    if (!hasData && approaches.length === 1) {
      navigate('/');
      return;
    }

    setIsCancelConfirmOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <span className="text-3xl">{exercise.icon}</span>
        <h2 className="text-lg font-semibold">{exercise.name}</h2>
      </div>

      <div>
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Подходы
        </div>
        <div className="space-y-3">
          {approaches.map((approach, index) => (
            <ApproachRow
              key={approach.id}
              approach={approach}
              index={index}
              onChange={handleApproachChange}
              onRemove={removeApproach}
              canRemove={approaches.length > 1}
            />
          ))}
        </div>
      </div>

      {validationError && (
        <div className="text-sm text-destructive">
          {validationError}
        </div>
      )}

      {saveError && (
        <div className="text-sm text-destructive">
          {saveError}
        </div>
      )}

      {isCancelConfirmOpen ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="text-sm font-medium">Отменить ввод?</div>
          <p className="text-sm text-muted-foreground">
            Все введённые подходы будут потеряны.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" size="sm" onClick={() => navigate('/')}>
              Да, отменить
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCancelConfirmOpen(false)}
            >
              Продолжить ввод
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={addApproach}>
              + Добавить подход
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              variant="success"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Сохранение...' : 'Сохранить тренировку'}
            </Button>
            <Button variant="secondary" className="w-full" onClick={handleCancel}>
              Отмена
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
