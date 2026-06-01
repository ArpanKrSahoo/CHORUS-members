import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuthSession } from "../hooks/useAuthSession";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";

export default function ProtectedLayout() {
  const { currentUser, isAuthReady } = useAuthSession();

  if (!isAuthReady) return null;
  if (!currentUser) return <Navigate to="/login" replace />;

  async function handleLogout() {
    if (auth) await signOut(auth);
  }

  return (
    <div className="protected-shell">
      <Navbar onLogout={handleLogout} />
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}
