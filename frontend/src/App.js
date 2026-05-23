import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Toaster } from "sonner";
import AppShell from "@/components/AppShell";
import PageTransition from "@/components/PageTransition";

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
import NotFound from "@/pages/NotFound";

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

      <Route path="/today" element={<ProtectedRoute><AppShell><PageTransition><Today /></PageTransition></AppShell></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><AppShell><PageTransition><Tasks /></PageTransition></AppShell></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><AppShell><PageTransition><CalendarPage /></PageTransition></AppShell></ProtectedRoute>} />
      <Route path="/focus" element={<ProtectedRoute><Focus /></ProtectedRoute>} />
      <Route path="/review" element={<ProtectedRoute><AppShell><PageTransition><WeeklyReview /></PageTransition></AppShell></ProtectedRoute>} />
      <Route path="/insights" element={<ProtectedRoute><AppShell><PageTransition><Insights /></PageTransition></AppShell></ProtectedRoute>} />
      <Route path="/goals" element={<ProtectedRoute><AppShell><PageTransition><Goals /></PageTransition></AppShell></ProtectedRoute>} />
      <Route path="/journal" element={<ProtectedRoute><AppShell><PageTransition><Journal /></PageTransition></AppShell></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppShell><PageTransition><Settings /></PageTransition></AppShell></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
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
