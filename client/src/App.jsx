import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { ToastProvider } from "./context/ToastContext";
import ToastContainer from "./components/ui/ToastContainer";
import AuroraBackdrop from "./components/ui/AuroraBackdrop";

/**
 * Routes are code-split so the first paint only carries the page you asked
 * for. This matters most for the meeting route, which pulls in WebRTC, the
 * canvas recorder and the whiteboard — none of which a visitor landing on
 * the login screen should have to download first.
 */
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ResendVerification = lazy(() => import("./pages/ResendVerification"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const Activity = lazy(() => import("./pages/Activity"));
const Feedback = lazy(() => import("./pages/Feedback"));
const MeetingRoom = lazy(() => import("./pages/MeetingRoom"));
const NotFound = lazy(() => import("./pages/NotFound"));

/**
 * Route-level fallback. Deliberately quiet — a spinner that flashes for
 * 80ms reads as jank, so this is just the app's own background plus a
 * subtle pulse, which looks like the page is still painting rather than
 * like an interruption.
 */
function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <AuroraBackdrop />
      <div className="w-10 h-10 rounded-full aurora-bg opacity-60 animate-pulse" />
    </div>
  );
}

/**
 * RequireAuth
 * Minimal route guard for /settings. Checks for a JWT the same way
 * services/api.js does (localStorage "token"), rather than only the
 * AuthContext user object, so a hard refresh on /settings doesn't bounce
 * someone to /login before the app has re-hydrated. Scoped to this one
 * route so it can't change behavior anywhere else in the app.
 */
function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <ToastContainer />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Login />} />
            {/* Login also answers at /login: the verification emails and the
                post-verify redirect both point there, and "/" alone would be
                an odd destination to name in an email. Same component, so
                nothing about the existing "/" entry point changes. */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />
            <Route path="/resend-verification" element={<ResendVerification />} />
            {/* Password reset. The :token route is the destination of the
                emailed link, so its shape has to match buildResetUrl() in
                the server's passwordResetService. */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <Settings />
                </RequireAuth>
              }
            />
            <Route
              path="/activity"
              element={
                <RequireAuth>
                  <Activity />
                </RequireAuth>
              }
            />
            <Route
              path="/feedback"
              element={
                <RequireAuth>
                  <Feedback />
                </RequireAuth>
              }
            />
            <Route path="/meeting/:meetingId" element={<MeetingRoom />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
