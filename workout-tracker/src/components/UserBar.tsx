import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getSignOutErrorMessage, type AuthResult } from '@/auth/errors';
import { getUserInitials, type AuthUser } from '@/auth/user';

interface UserBarProps {
  user: AuthUser;
  onSignOut: () => Promise<AuthResult>;
}

export default function UserBar({ user, onSignOut }: UserBarProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signingOutRef = useRef(false);

  const handleSignOut = async () => {
    if (signingOutRef.current) return;

    signingOutRef.current = true;
    setError(null);
    setIsSigningOut(true);

    try {
      const result = await onSignOut();

      if (!result.ok) {
        signingOutRef.current = false;
        setIsSigningOut(false);
        setError(getSignOutErrorMessage(result.error));
      }
    } catch {
      signingOutRef.current = false;
      setIsSigningOut(false);
      setError(getSignOutErrorMessage('unknown'));
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {getUserInitials(user.displayName)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {user.displayName}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {user.email}
            </div>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={isSigningOut}
          onClick={() => void handleSignOut()}
        >
          {isSigningOut ? 'Выход...' : 'Выйти'}
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
