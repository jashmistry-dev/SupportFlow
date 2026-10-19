import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { PageLoadingState } from './components/PageLoadingState.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { TicketListPage } from './pages/TicketListPage.tsx';
import { CreateTicketPage } from './pages/CreateTicketPage.tsx';
import { TicketDetailPage } from './pages/TicketDetailPage.tsx';
import { AdminUsersPage } from './pages/AdminUsersPage.tsx';
import { AdminSetupPage } from './pages/AdminSetupPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoadingState />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isAuthRoute =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/admin-setup';

  const effectiveRole = user?.role || (location.pathname === '/admin-setup' ? 'ADMIN' : 'REQUESTER');

  React.useEffect(() => {
    document.documentElement.setAttribute('data-role', effectiveRole);
  }, [effectiveRole]);

  // For unauthenticated login/register/admin-setup screens, render focused layout
  if (!user || isAuthRoute) {
    return (
      <div
        data-role={effectiveRole}
        className="min-h-screen bg-[#F5F7FA] dark:bg-[#111821] text-[#202B3C] dark:text-[#F1F5F9] transition-colors flex flex-col justify-between"
      >
        <main className="flex-1 flex flex-col justify-center">{children}</main>
        <footer className="py-4 text-center text-xs text-[#8B95A5] dark:text-[#6B7B92] border-t border-[#E1E6EE] dark:border-[#344153]">
          SupportFlow — Internal Technical Support System
        </footer>
      </div>
    );
  }

  // Authenticated workspace shell with persistent vertical sidebar & top bar
  return (
    <div
      data-role={effectiveRole}
      className="h-screen w-screen flex overflow-hidden bg-[#F5F7FA] dark:bg-[#111821] text-[#202B3C] dark:text-[#F1F5F9] transition-colors"
    >
      {/* Vertical Sidebar */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        {/* Scrollable Content Viewport */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppShell>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/admin-setup" element={<AdminSetupPage />} />

              {/* Protected App Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tickets"
                element={
                  <ProtectedRoute>
                    <TicketListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/my-work"
                element={
                  <ProtectedRoute>
                    <TicketListPage isMyWork={true} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tickets/new"
                element={
                  <ProtectedRoute>
                    <CreateTicketPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tickets/:id"
                element={
                  <ProtectedRoute>
                    <TicketDetailPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute>
                    <AdminUsersPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
