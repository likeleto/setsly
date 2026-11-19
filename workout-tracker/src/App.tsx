import { Routes, Route, useNavigate } from 'react-router-dom';
import MainScreen from '@/pages/MainScreen';
import InputScreen from '@/pages/InputScreen';
import HistoryScreen from '@/pages/HistoryScreen';
import AuthScreen from '@/components/AuthScreen';
import UserBar from '@/components/UserBar';
import { useAuth } from '@/auth/AuthContext';
import type { AuthResult } from '@/auth/errors';

function App() {
  const { status, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async (): Promise<AuthResult> => {
    const result = await signOut();
    if (result.ok) navigate('/');
    return result;
  };

  if (status === 'restoring') {
    return (
      <div className="app">
        <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center">
          <p role="status" className="text-sm text-muted-foreground">
            Проверяем сессию...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'signedOut' || !user) {
    return (
      <div className="app">
        <AuthScreen />
      </div>
    );
  }

  return (
    <div className="app">
      <UserBar user={user} onSignOut={handleSignOut} />
      <Routes>
        <Route path="/" element={<MainScreen />} />
        <Route path="/workout/:exerciseKey" element={<InputScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
      </Routes>
    </div>
  );
}

export default App;
