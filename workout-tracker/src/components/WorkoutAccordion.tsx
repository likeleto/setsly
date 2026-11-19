import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EXERCISES, type Workout, type ExerciseResult } from '@/types';
import { formatDate } from '@/utils/date';

interface WorkoutAccordionProps {
  workout: Workout;
  onRemove: (id: string) => void;
}

function ExerciseResultItem({ result }: { result: ExerciseResult }) {
  const exercise = EXERCISES.find((e) => e.key === result.exerciseKey);

  return (
    <div className="mb-4 last:mb-0">
      <h3 className="mb-1 text-sm font-medium text-muted-foreground">
        {exercise?.name}
      </h3>
      <div className="flex flex-col gap-1">
        {result.approaches.map((approach) => (
          <div key={approach.id} className="flex items-center gap-2 text-sm">
            <span className="w-5 text-muted-foreground">{approach.reps}×</span>
            {approach.hasExtraWeight && (
              <Badge variant="secondary" className="h-5 bg-primary text-primary-foreground px-1.5 py-0 text-xs">
                +{approach.extraWeightKg}кг
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WorkoutAccordion({ workout, onRemove }: WorkoutAccordionProps) {
  const [expanded, setExpanded] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);

  const handleToggle = () => {
    if (expanded) setIsRemoveConfirmOpen(false);
    setExpanded(!expanded);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div
        className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-muted/50"
        onClick={handleToggle}
      >
        <div>
          <div className="font-medium">{formatDate(workout.date)}</div>
          <div className="text-sm text-muted-foreground">{workout.time}</div>
        </div>
        <span className="text-muted-foreground">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          {workout.results.map((result) => (
            <ExerciseResultItem key={result.exerciseKey} result={result} />
          ))}
          {isRemoveConfirmOpen ? (
            <div className="mt-4 space-y-3 rounded-lg border border-border bg-background p-3">
              <div className="text-sm font-medium">
                Удалить тренировку от {formatDate(workout.date)}?
              </div>
              <p className="text-sm text-muted-foreground">
                Действие необратимо.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(workout.id);
                  }}
                >
                  Да, удалить
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsRemoveConfirmOpen(false);
                  }}
                >
                  Отмена
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              className="mt-4"
              onClick={(e) => {
                e.stopPropagation();
                setIsRemoveConfirmOpen(true);
              }}
            >
              Удалить тренировку
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
