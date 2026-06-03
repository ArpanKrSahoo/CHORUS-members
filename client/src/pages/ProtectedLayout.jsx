import React from "react";
import { Navigate, Outlet, NavLink, Link } from "react-router-dom";
import { useAuthSession } from "../hooks/useAuthSession";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { ASSETS } from "../constants/assets";

export default function ProtectedLayout() {
  const { currentUser, isAdmin, isAuthReady, userRole } = useAuthSession();

  if (!isAuthReady) return null;
  if (!currentUser) return <Navigate to="/login" replace />;

  async function handleLogout() {
    if (auth) await signOut(auth);
  }

  return (
    <div className="protected-shell">
      <header className="workspace-navbar">
        <div className="navbar-container">
          <Link to="/home" className="navbar-brand">
            <img className="navbar-logo" src={ASSETS.logo} alt="CHORUS logo" />
            <span className="navbar-brand-name">CHORUS</span>
          </Link>

          <nav className="navbar-links" aria-label="Main Navigation">
            <NavLink to="/home" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              Home
            </NavLink>
            <NavLink to="/rehearsals" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              Rehearsals
            </NavLink>
            <NavLink to="/notices" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              Notices
            </NavLink>
            <NavLink to="/productions" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              Productions
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                Admin
              </NavLink>
            )}
          </nav>

          <div className="navbar-user-panel">
            <div className="user-info-text">
              <span className="user-role-tag">{userRole || "Member"}</span>
              <span className="user-email-label" title={currentUser.email}>{currentUser.email}</span>
            </div>
            <button className="navbar-signout-btn" onClick={handleLogout} type="button">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="page-content">
        <Outlet context={{ currentUser, isAdmin, userRole, onLogout: handleLogout }} />
      </main>
    </div>
  );
}
