import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { type Approach } from '@/types';

interface ApproachRowProps {
  approach: Approach;
  index: number;
  onChange: (id: string, field: 'reps' | 'extraWeightKg' | 'hasExtraWeight', value: number | boolean) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export default function ApproachRow({
  approach,
  index,
  onChange,
  onRemove,
  canRemove,
}: ApproachRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-3">
      <span className="font-semibold text-muted-foreground tabular-nums">
        {String(index + 1).padStart(2, '0')}
      </span>

      <Input
        type="number"
        className="h-8 w-20 border-border text-sm"
        placeholder="Повт."
        min={1}
        value={approach.reps || ''}
        onChange={(e) =>
          onChange(approach.id, 'reps', parseInt(e.target.value) || 0)
        }
      />

      <div className="flex items-center gap-2">
        <Switch
          checked={approach.hasExtraWeight}
          onCheckedChange={() =>
            onChange(approach.id, 'hasExtraWeight', !approach.hasExtraWeight)
          }
        />
        <span className="text-sm text-muted-foreground">+вес</span>
      </div>

      {approach.hasExtraWeight && (
        <Input
          type="number"
          className="h-8 w-20 border-border text-sm"
          placeholder="Кг"
          min={0}
          step={2.5}
          value={approach.extraWeightKg || ''}
          onChange={(e) =>
            onChange(approach.id, 'extraWeightKg', parseFloat(e.target.value) || 0)
          }
        />
      )}

      {canRemove && (
        <Button
          variant="destructive"
          size="xs"
          className="ml-auto h-7 w-7 p-0"
          onClick={() => onRemove(approach.id)}
          title="Удалить подход"
        >
          ✕
        </Button>
      )}
    </div>
  );
}
