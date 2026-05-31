import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SplashScreen from "./components/SplashScreen";
import BrandIntro from "./components/BrandIntro";
import SessionLoading from "./components/SessionLoading";
import LoginPage from "./pages/LoginPage";
import ProtectedLayout from "./pages/ProtectedLayout";
import HomePage from "./pages/HomePage";
import ProductionsPage from "./pages/ProductionsPage";
import RehearsalsPage from "./pages/RehearsalsPage";
import NoticesPage from "./pages/NoticesPage";
import { useAuthSession } from "./hooks/useAuthSession";
import "./styles.css";

const SPLASH_DURATION_MS = 2500;
const INTRO_DURATION_MS = 1800;

export default function App() {
  const [screenStep, setScreenStep] = useState("loading");
  const { isAuthReady } = useAuthSession();

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
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected — all authenticated pages live inside ProtectedLayout */}
        <Route element={<ProtectedLayout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/productions" element={<ProductionsPage />} />
          <Route path="/rehearsals" element={<RehearsalsPage />} />
          <Route path="/notices" element={<NoticesPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}