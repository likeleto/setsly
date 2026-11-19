import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DEMO_USERS, getDemoUserInitials } from '@/auth/demoUsers';

interface GoogleAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (userId: string) => void;
  busyUserId: string | null;
  error: string | null;
}

export default function GoogleAccountDialog({
  open,
  onOpenChange,
  onSelect,
  busyUserId,
  error,
}: GoogleAccountDialogProps) {
  const isBusy = busyUserId !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isBusy) onOpenChange(nextOpen);
      }}
    >
      <DialogContent showCloseButton={!isBusy}>
        <DialogHeader>
          <DialogTitle>Имитация выбора аккаунта Google</DialogTitle>
          <DialogDescription>
            Настоящий Google не подключён. Выберите один из демонстрационных
            аккаунтов.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {DEMO_USERS.map((user) => (
            <Button
              key={user.id}
              type="button"
              variant="outline"
              className="h-auto w-full justify-start gap-3 px-3 py-3 text-left"
              disabled={isBusy}
              onClick={() => onSelect(user.id)}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {getDemoUserInitials(user.name)}
              </span>
              <span className="flex min-w-0 flex-col items-start">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              </span>
              <span className="ml-auto shrink-0 text-xs font-normal text-muted-foreground">
                {busyUserId === user.id ? 'Входим...' : 'Выбрать'}
              </span>
            </Button>
          ))}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Это имитация выбора аккаунта. Настоящий Google не используется.
        </p>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            disabled={isBusy}
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
