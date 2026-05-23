import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Toaster } from "sonner";
import AppShell from "@/components/AppShell";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import AuthCallback from "@/pages/AuthCallback";
import Onboarding from "@/pages/Onboarding";
import Today from "@/pages/Today";
import Tasks from "@/pages/Tasks";
import CalendarPage from "@/pages/Calendar";
import Focus from "@/pages/Focus";
import WeeklyReview from "@/pages/WeeklyReview";
import Pricing from "@/pages/Pricing";
import Settings from "@/pages/Settings";
import Insights from "@/pages/Insights";
import Goals from "@/pages/Goals";
import Journal from "@/pages/Journal";

import "@/App.css";

function AppRouter() {
  const location = useLocation();
  // Synchronously detect Emergent OAuth callback (URL fragment) — render BEFORE other routes
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/pricing" element={<Pricing />} />

      <Route path="/onboarding" element={
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      } />

      <Route path="/today" element={<ProtectedRoute><AppShell><Today /></AppShell></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><AppShell><Tasks /></AppShell></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><AppShell><CalendarPage /></AppShell></ProtectedRoute>} />
      <Route path="/focus" element={<ProtectedRoute><Focus /></ProtectedRoute>} />
      <Route path="/review" element={<ProtectedRoute><AppShell><WeeklyReview /></AppShell></ProtectedRoute>} />
      <Route path="/insights" element={<ProtectedRoute><AppShell><Insights /></AppShell></ProtectedRoute>} />
      <Route path="/goals" element={<ProtectedRoute><AppShell><Goals /></AppShell></ProtectedRoute>} />
      <Route path="/journal" element={<ProtectedRoute><AppShell><Journal /></AppShell></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppShell><Settings /></AppShell></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "hsl(var(--velari-surface))",
                color: "hsl(var(--velari-text))",
                border: "1px solid hsl(var(--velari-border))",
                borderRadius: "12px",
                fontFamily: "Manrope, ui-sans-serif",
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
