import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { EXERCISES, type Workout } from '@/types';
import { store } from '@/store';
import { useAuth } from '@/auth/AuthContext';
import { formatDate } from '@/utils/date';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ExerciseCard from '@/components/ExerciseCard';
import LegacyDataNotice from '@/components/LegacyDataNotice';

function getLastWorkoutSummary(workout: Workout): string {
  const summaries = workout.results.map((r) => {
    const exercise = EXERCISES.find((e) => e.key === r.exerciseKey);
    const totalApproaches = r.approaches.length;
    const totalReps = r.approaches.reduce((sum, a) => sum + a.reps, 0);
    const weightInfo = r.approaches.some((a) => a.hasExtraWeight)
      ? ' +вес'
      : '';
    return `${exercise?.name}${weightInfo}: ${totalApproaches}×${totalReps}`;
  });
  return summaries.join(' | ');
}

export default function MainScreen() {
  const { user } = useAuth();
  const [lastWorkout, setLastWorkout] = useState<Workout | null>(null);

  const refreshLastWorkout = useCallback(() => {
    setLastWorkout(user ? store.getLast(user.id) : null);
  }, [user]);

  useEffect(() => {
    refreshLastWorkout();
  }, [refreshLastWorkout]);

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-xl font-semibold">Workout Tracker</h1>
        <div className="flex gap-2">
          <Link to="/history">
            <Button variant="secondary" size="sm">
              История
            </Button>
          </Link>
        </div>
      </div>

      <LegacyDataNotice
        userId={user.id}
        email={user.email}
        onClaimed={refreshLastWorkout}
      />

      <div>
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Выберите упражнение
        </div>
        <div className="grid grid-cols-2 gap-4">
          {EXERCISES.map((exercise) => (
            <ExerciseCard key={exercise.key} exercise={exercise} />
          ))}
        </div>
      </div>

      {lastWorkout && (
        <Card>
          <CardContent className="space-y-2 p-5">
            <div className="text-sm font-medium text-muted-foreground">
              Последняя тренировка
            </div>
            <div className="font-medium">
              {formatDate(lastWorkout.date)} в {lastWorkout.time}
            </div>
            <div className="text-sm text-muted-foreground">
              {getLastWorkoutSummary(lastWorkout)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
