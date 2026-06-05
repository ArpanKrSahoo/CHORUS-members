import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import BrandIntro from "./components/BrandIntro";
import SessionLoading from "./components/SessionLoading";
import SplashScreen from "./components/SplashScreen";
import { useAuthSession } from "./hooks/useAuthSession";
import AdminPage from "./pages/AdminPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import NoticesPage from "./pages/NoticesPage";
import ProductionsPage from "./pages/ProductionsPage";
import ProtectedLayout from "./pages/ProtectedLayout";
import RehearsalsPage from "./pages/RehearsalsPage";
import PaymentsPage from "./pages/PaymentsPage";
import AdminPaymentsPage from "./pages/AdminPaymentsPage";
import "./styles.css";

const SPLASH_DURATION_MS = 2500;
const INTRO_DURATION_MS = 1800;

export default function App() {
  const [screenStep, setScreenStep] = useState("loading");
  const { isAdmin, isAuthReady, isDirector } = useAuthSession();

  useEffect(() => {
    const splashTimer = window.setTimeout(() => {
      setScreenStep("intro");
    }, SPLASH_DURATION_MS);

    const introTimer = window.setTimeout(() => {
      setScreenStep("app");
    }, SPLASH_DURATION_MS + INTRO_DURATION_MS);

    return () => {
      window.clearTimeout(splashTimer);
      window.clearTimeout(introTimer);
    };
  }, []);

  if (screenStep === "loading") return <SplashScreen />;
  if (screenStep === "intro") return <BrandIntro />;
  if (!isAuthReady) return <SessionLoading />;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/productions" element={<ProductionsPage />} />
        <Route path="/rehearsals" element={<RehearsalsPage />} />
        <Route path="/notices" element={<NoticesPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route
          path="/admin/payments"
          element={
            isAdmin ? <AdminPaymentsPage /> : <Navigate to="/home" replace />
          }
        />
        <Route
          path="/admin"
          element={
            isAdmin || isDirector ? <AdminPage /> : <Navigate to="/home" replace />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
