import { useEffect, type JSX } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AdminRoute } from '../components/AdminRoute';
import { LoginPage } from '../pages/LoginPage';
import { TicketListPage } from '../pages/TicketListPage';
import { TicketDetailPage } from '../pages/TicketDetailPage';
import { UsersPage } from '../pages/UsersPage';
import { useAuthStore } from '../stores/authStore';

function AuthBootstrap({ children }: { children: JSX.Element }): JSX.Element {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  return children;
}

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthBootstrap>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/tickets" element={<TicketListPage />} />
              <Route path="/tickets/:id" element={<TicketDetailPage />} />
              <Route element={<AdminRoute />}>
                <Route path="/users" element={<UsersPage />} />
              </Route>
              <Route path="/" element={<Navigate to="/tickets" replace />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/tickets" replace />} />
        </Routes>
      </AuthBootstrap>
    </BrowserRouter>
  );
}
