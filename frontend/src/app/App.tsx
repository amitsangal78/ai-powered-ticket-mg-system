import type { JSX } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { LoginPage } from '../pages/LoginPage';
import { TicketListPage } from '../pages/TicketListPage';

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/tickets" element={<TicketListPage />} />
          <Route path="/" element={<Navigate to="/tickets" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/tickets" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
