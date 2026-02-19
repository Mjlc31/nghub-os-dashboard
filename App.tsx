import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import RouteGuard from './components/RouteGuard';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import Events from './pages/Events';
import Academy from './pages/Academy';
import Finance from './pages/Finance';
import Messaging from './pages/Messaging';
import Settings from './pages/Settings';
import Toast, { ToastMessage, ToastType } from './components/ui/Toast';

const App: React.FC = () => {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const addToast = (type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Auth onLogin={() => { }} onNotify={addToast} />} />

        <Route element={<RouteGuard />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard onNavigate={() => { }} />} />
            <Route path="/crm" element={<CRM onNotify={addToast} />} />
            <Route path="/events" element={<Events onNotify={addToast} />} />
            <Route path="/academy" element={<Academy />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/messaging" element={<Messaging onNotify={addToast} />} />
            <Route path="/settings" element={<Settings onNotify={addToast} />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toast toasts={toasts} removeToast={removeToast} />
    </BrowserRouter>
  );
};

export default App;