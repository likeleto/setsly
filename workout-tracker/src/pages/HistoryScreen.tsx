import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  store,
  getWorkoutErrorMessage,
  type WorkoutErrorCode,
} from '@/store';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { type Workout } from '@/types';
import { compareWorkoutsByDateDesc } from '@/utils/date';
import WorkoutAccordion from '@/components/WorkoutAccordion';

export default function HistoryScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<WorkoutErrorCode | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<{
    id: string;
    code: WorkoutErrorCode;
  } | null>(null);
  const removingRef = useRef(false);

  useEffect(() => {
    let active = true;

    if (!user) {
      setWorkouts([]);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    setRemoveError(null);

    void store
      .getAll(user.id)
      .then((result) => {
        if (!active) return;

        if (result.ok) {
          setWorkouts(result.data);
        } else {
          setWorkouts([]);
          setLoadError(result.error);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setWorkouts([]);
        setLoadError('unknown');
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, reloadKey]);

  const handleBack = () => {
    navigate('/');
  };

  const handleRemoveWorkout = useCallback(
    async (id: string) => {
      // Синхронная защита от повторного клика до ре-рендера.
      if (!user || removingRef.current) return;

      removingRef.current = true;
      setRemovingId(id);
      setRemoveError(null);

      try {
        const result = await store.remove(id);

        if (result.ok) {
          setWorkouts((prev) =>
            prev.filter((workout) => workout.id !== id)
          );
        } else {
          setRemoveError({ id, code: result.error });
          if (result.error === 'not_found') {
            setReloadKey((key) => key + 1);
          }
        }
      } catch {
        setRemoveError({ id, code: 'unknown' });
      } finally {
        removingRef.current = false;
        setRemovingId(null);
      }
    },
    [user]
  );

  const sortedWorkouts = [...workouts].sort(compareWorkoutsByDateDesc);

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-xl font-semibold">История тренировок</h1>
        <Button variant="secondary" size="sm" onClick={handleBack}>
          ← Назад
        </Button>
      </div>

      {isLoading ? (
        <div
          role="status"
          className="py-16 text-center text-sm text-muted-foreground"
        >
          Загрузка истории...
        </div>
      ) : loadError ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <p role="alert" className="text-sm text-destructive">
              {getWorkoutErrorMessage(loadError, 'load')}
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Повторить
            </Button>
          </CardContent>
        </Card>
      ) : workouts.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="text-5xl">📋</div>
          <p className="text-sm text-muted-foreground">Записей пока нет</p>
          <Button
            variant="link"
            className="text-primary"
            onClick={() => navigate('/')}
          >
            Начать тренировку
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedWorkouts.map((workout) => (
            <WorkoutAccordion
              key={workout.id}
              workout={workout}
              onRemove={handleRemoveWorkout}
              isRemoving={removingId === workout.id}
              removeError={
                removeError?.id === workout.id ? removeError.code : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
