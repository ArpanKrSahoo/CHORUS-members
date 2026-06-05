import React, { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, NavLink, Link } from "react-router-dom";
import { useAuthSession } from "../hooks/useAuthSession";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { ASSETS } from "../constants/assets";

export default function ProtectedLayout() {
  const { currentUser, isAdmin, isAuthReady, isDirector, userRole } = useAuthSession();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!isAuthReady) return null;
  if (!currentUser) return <Navigate to="/login" replace />;

  async function handleLogout() {
    setIsAccountMenuOpen(false);
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
            <NavLink to="/payments" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              Submit Payment
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin/payments" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                Payments Registry
              </NavLink>
            )}
            {(isAdmin || isDirector) && (
              <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                Admin
              </NavLink>
            )}
          </nav>

          <div className="navbar-user-panel" ref={accountMenuRef}>
            <button
              aria-expanded={isAccountMenuOpen}
              aria-haspopup="menu"
              className="account-menu-trigger"
              onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
              type="button"
            >
              <span className="user-info-text">
                <span className="user-role-tag">{userRole || "Member"}</span>
                <span className="user-email-label" title={currentUser.email}>{currentUser.email}</span>
              </span>
            </button>
            {isAccountMenuOpen ? (
              <div className="account-menu" role="menu">
                <button
                  className="navbar-signout-btn"
                  onClick={handleLogout}
                  role="menuitem"
                  type="button"
                >
                  Sign Out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="page-content">
        <Outlet context={{ currentUser, isAdmin, isDirector, userRole, onLogout: handleLogout }} />
      </main>
    </div>
  );
}
