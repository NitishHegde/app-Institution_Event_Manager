import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PublicLayout from './layouts/PublicLayout';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import EventDetailsPage from './pages/EventDetailsPage';
import {
  ParticipationPage,
  CoordinationPage
} from './pages/PlaceholderPages';
import AnalyticsPage from './pages/AnalyticsPage';
import ManageEventPage from './pages/ManageEventPage';
import ManageEventDetailsPage from './pages/ManageEventDetailsPage';
import EventAttendancePage from './pages/EventAttendancePage';
import EventPodiumPage from './pages/EventPodiumPage';
import FindStudentPage from './pages/FindStudentPage';
import StaffProfilePage from './pages/StaffProfilePage';
import StudentProfilePage from './pages/StudentProfilePage';
import { useAuth } from './context/AuthContext';

function ProfileRoute() {
  const { user } = useAuth();
  if (user?.role === 'STAFF') {
    return <StaffProfilePage />;
  }
  return <StudentProfilePage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Layout wraps all pages to share background aesthetics */}
          <Route element={<PublicLayout />}>
            
            {/* Landing page (Guest & Authenticated shared context) */}
            <Route path="/" element={<LandingPage />} />

            {/* Guest-only routes (redirects to /home if logged in) */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Authenticated workspace routes */}
            <Route element={<ProtectedRoute />}>
              <Route
                element={
                  <>
                    <Navbar />
                    <Outlet />
                  </>
                }
              >
                <Route path="/home" element={<HomePage />} />
                <Route path="/events/:eventId" element={<EventDetailsPage />} />
                <Route path="/participation" element={<ParticipationPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/coordination" element={<CoordinationPage />} />
                <Route path="/profile" element={<ProfileRoute />} />
                <Route path="/manage-event" element={<ManageEventPage />} />
                <Route path="/manage-event/:eventId" element={<ManageEventDetailsPage />} />
                <Route path="/manage-event/:eventId/attendance" element={<EventAttendancePage />} />
                <Route path="/manage-event/:eventId/podium" element={<EventPodiumPage />} />
                <Route path="/find-student" element={<FindStudentPage />} />
              </Route>
            </Route>

          </Route>

          {/* Global Fallback Protection */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}