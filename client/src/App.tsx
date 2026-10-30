import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  LayoutDashboard,
  FileStack,
  SearchCode,
  BarChart3,
  Settings,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { SearchPage } from './pages/SearchPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
          <Navbar />

          <div className="flex-1 flex overflow-hidden">
            <Sidebar />

            <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="max-w-7xl mx-auto">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/documents" element={<DocumentsPage />} />
                  <Route path="/documents/:id" element={<DocumentDetailPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </div>
            </main>
          </div>

          {/* Mobile Bottom Navigation */}
          <nav className="md:hidden sticky bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md px-2 py-2 flex items-center justify-around">
            {[
              { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { to: '/documents', label: 'Documents', icon: FileStack },
              { to: '/search', label: 'RAG Search', icon: SearchCode },
              { to: '/analytics', label: 'Analytics', icon: BarChart3 },
              { to: '/settings', label: 'Settings', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium ${
                      isActive ? 'text-indigo-400' : 'text-slate-400'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;

