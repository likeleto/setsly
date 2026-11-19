import { Button } from '@/components/ui/button';
import {
  getDemoUserInitials,
  type DemoUser,
} from '@/auth/demoUsers';

interface UserBarProps {
  user: DemoUser;
  onSignOut: () => void;
}

export default function UserBar({ user, onSignOut }: UserBarProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {getDemoUserInitials(user.name)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{user.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {user.email}
          </div>
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={onSignOut}>
        Выйти
      </Button>
    </div>
  );
}
