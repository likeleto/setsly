import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { EXERCISES, type Workout } from '@/types';
import {
  store,
  getWorkoutErrorMessage,
  type WorkoutErrorCode,
} from '@/store';
import { useAuth } from '@/auth/AuthContext';
import { formatDate } from '@/utils/date';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ExerciseCard from '@/components/ExerciseCard';

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
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<WorkoutErrorCode | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    if (!user) {
      setLastWorkout(null);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    void store
      .getLast(user.id)
      .then((result) => {
        if (!active) return;

        if (result.ok) {
          setLastWorkout(result.data);
        } else {
          setLastWorkout(null);
          setLoadError(result.error);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLastWorkout(null);
        setLoadError('unknown');
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, reloadKey]);

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

      {isLoading ? (
        <Card>
          <CardContent className="p-5">
            <p role="status" className="text-sm text-muted-foreground">
              Загрузка последней тренировки...
            </p>
          </CardContent>
        </Card>
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
      ) : lastWorkout ? (
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
      ) : null}
    </div>
  );
}
