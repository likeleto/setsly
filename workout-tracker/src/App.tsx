import { Routes, Route, useNavigate } from 'react-router-dom';
import MainScreen from '@/pages/MainScreen';
import InputScreen from '@/pages/InputScreen';
import HistoryScreen from '@/pages/HistoryScreen';
import AuthScreen from '@/components/AuthScreen';
import UserBar from '@/components/UserBar';
import { useAuth } from '@/auth/AuthContext';

function App() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="app">
        <AuthScreen />
      </div>
    );
  }

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

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
