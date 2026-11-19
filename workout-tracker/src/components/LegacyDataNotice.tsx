import { useState } from 'react';
import { store } from '@/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface LegacyDataNoticeProps {
  userId: string;
  email: string;
  onClaimed: () => void;
}

type Step = 'prompt' | 'confirm' | 'done';

export default function LegacyDataNotice({
  userId,
  email,
  onClaimed,
}: LegacyDataNoticeProps) {
  const [count, setCount] = useState(() => store.getUnownedCount());
  const [step, setStep] = useState<Step>('prompt');
  const [transferred, setTransferred] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || (count === 0 && step !== 'done')) {
    return null;
  }

  const handleClaim = () => {
    const claimed = store.claimUnowned(userId);
    setTransferred(claimed);
    setCount(0);
    setStep('done');
    onClaimed();
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        {step === 'done' ? (
          <>
            <div className="text-sm font-medium">Старые записи перенесены</div>
            <p className="text-sm text-muted-foreground">
              Перенесено записей: {transferred}. Теперь они принадлежат{' '}
              {email} и больше не появятся у другого пользователя.
            </p>
          </>
        ) : step === 'confirm' ? (
          <>
            <div className="text-sm font-medium">
              Перенести {count} записей в аккаунт {email}?
            </div>
            <p className="text-sm text-muted-foreground">
              После переноса записи будут принадлежать только этому аккаунту.
              Действие необратимо.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="success" onClick={handleClaim}>
                Да, перенести
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setStep('prompt')}
              >
                Отмена
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm font-medium">
              Найдены старые тренировки без владельца: {count}
            </div>
            <p className="text-sm text-muted-foreground">
              Они не показываются ни одному пользователю. Перенести их в аккаунт{' '}
              {email}?
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setStep('confirm')}>
                Перенести
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setDismissed(true)}
              >
                Оставить как есть
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
