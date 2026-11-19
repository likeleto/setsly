import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { store } from '@/store';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { type Workout } from '@/types';
import { compareWorkoutsByDateDesc } from '@/utils/date';
import WorkoutAccordion from '@/components/WorkoutAccordion';

export default function HistoryScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  const refreshWorkouts = useCallback(() => {
    setWorkouts(user ? store.getAll(user.id) : []);
  }, [user]);

  useEffect(() => {
    refreshWorkouts();
  }, [refreshWorkouts]);

  const handleBack = () => {
    navigate('/');
  };

  const handleRemoveWorkout = useCallback(
    (id: string) => {
      if (!user) return;
      if (store.remove(id, user.id)) {
        setWorkouts((prev) => prev.filter((workout) => workout.id !== id));
      }
    },
    [user]
  );

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

      {workouts.length === 0 ? (
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
          {[...workouts]
            .sort(compareWorkoutsByDateDesc)
            .map((workout) => (
              <WorkoutAccordion
                key={workout.id}
                workout={workout}
                onRemove={handleRemoveWorkout}
              />
            ))}
        </div>
      )}
    </div>
  );
}
