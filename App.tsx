import React, { Suspense } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ResourceProvider } from './contexts/ResourceContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { AutoLogoutHandler } from './components/AutoLogoutHandler';
import { LayoutProvider } from './contexts/LayoutContext';

// Lazy Load Pages for Performance Optimization
const StudentList = React.lazy(() => import('./pages/StudentList').then(module => ({ default: module.StudentList })));
const StudentDetails = React.lazy(() => import('./pages/StudentDetails').then(module => ({ default: module.StudentDetails })));
const NewStudent = React.lazy(() => import('./pages/NewStudent').then(module => ({ default: module.NewStudent })));
const TeacherPortal = React.lazy(() => import('./pages/TeacherPortal').then(module => ({ default: module.TeacherPortal })));
const TeacherSchedule = React.lazy(() => import('./pages/TeacherSchedule').then(module => ({ default: module.TeacherSchedule })));
const ClassSchedule = React.lazy(() => import('./pages/ClassSchedule').then(module => ({ default: module.ClassSchedule })));
const ResourceAdmin = React.lazy(() => import('./pages/ResourceAdmin').then(module => ({ default: module.ResourceAdmin })));
const ResourceSchedule = React.lazy(() => import('./pages/ResourceSchedule').then(module => ({ default: module.ResourceSchedule })));
const AcademicCalendar = React.lazy(() => import('./pages/AcademicCalendar').then(module => ({ default: module.AcademicCalendar })));
const Login = React.lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));

// Loading Component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-sm font-medium text-slate-500 animate-pulse">Carregando...</span>
    </div>
  </div>
);

import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LayoutProvider>
          <ResourceProvider>
            <AutoLogoutHandler />
            <Toaster richColors position="top-center" />
            <Router>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={
                    <ProtectedRoute>
                      <StudentList />
                    </ProtectedRoute>
                  } />
                  <Route path="/student/:id" element={
                    <ProtectedRoute>
                      <StudentDetails />
                    </ProtectedRoute>
                  } />
                  <Route path="/new-student" element={
                    <ProtectedRoute>
                      <NewStudent />
                    </ProtectedRoute>
                  } />
                  <Route path="/student/edit/:id" element={
                    <ProtectedRoute>
                      <NewStudent />
                    </ProtectedRoute>
                  } />
                  <Route path="/teacher-portal" element={
                    <ProtectedRoute>
                      <TeacherPortal />
                    </ProtectedRoute>
                  } />
                  <Route path="/teacher-schedule" element={
                    <ProtectedRoute>
                      <TeacherSchedule />
                    </ProtectedRoute>
                  } />
                  <Route path="/class-schedule" element={
                    <ProtectedRoute>
                      <ClassSchedule />
                    </ProtectedRoute>
                  } />
                  <Route path="/resources" element={
                    <ProtectedRoute>
                      <ResourceAdmin />
                    </ProtectedRoute>
                  } />
                  <Route path="/resource-schedule" element={
                    <ProtectedRoute>
                      <ResourceSchedule />
                    </ProtectedRoute>
                  } />
                  <Route path="/academic-calendar" element={
                    <ProtectedRoute>
                      <AcademicCalendar />
                    </ProtectedRoute>
                  } />
                </Routes>
              </Suspense>
            </Router>
          </ResourceProvider>
        </LayoutProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!user || !profile) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

export default App;