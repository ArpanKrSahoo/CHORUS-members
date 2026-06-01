import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthSession } from "../hooks/useAuthSession";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";

export default function ProtectedLayout() {
  const { currentUser, isAdmin, isAuthReady, userRole } = useAuthSession();

  if (!isAuthReady) return null;
  if (!currentUser) return <Navigate to="/login" replace />;

  async function handleLogout() {
    if (auth) await signOut(auth);
  }

  return (
    <div className="protected-shell">
      <main className="page-content">
        <Outlet context={{ currentUser, isAdmin, userRole, onLogout: handleLogout }} />
      </main>
    </div>
  );
}
