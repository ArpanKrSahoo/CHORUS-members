import React, { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, NavLink, Link } from "react-router-dom";
import { useAuthSession } from "../hooks/useAuthSession";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { ASSETS } from "../constants/assets";

export default function ProtectedLayout() {
  const { currentUser, isAdmin, isAuthReady, isDirector, userRole } = useAuthSession();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const adminDropdownRef = useRef(null);
  const navbarRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
      if (!adminDropdownRef.current?.contains(event.target)) {
        setIsAdminDropdownOpen(false);
      }
      // If clicking outside the navbar shell, close mobile menu
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
        setIsAdminDropdownOpen(false);
        setIsMobileMenuOpen(false);
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
    setIsMobileMenuOpen(false);
    if (auth) await signOut(auth);
  }

  return (
    <div className="protected-shell">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="global-video-bg"
      >
        <source src="https://archive.org/download/PatherPanchali1955720p/Pather%20Panchali%20%281955%29%20%5B720p%5D.mp4" type="video/mp4" />
      </video>
      <header className="workspace-navbar" ref={navbarRef}>
        <div className="navbar-container">
          <Link to="/home" className="navbar-brand" onClick={() => setIsMobileMenuOpen(false)}>
            <img className="navbar-logo" src={ASSETS.logo} alt="CHORUS logo" />
            <span className="navbar-brand-name">CHORUS</span>
          </Link>

          {/* Burger SVG Button */}
          <button
            className={`navbar-burger-btn ${isMobileMenuOpen ? "active" : ""}`}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle navigation menu"
            type="button"
          >
            {isMobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>

          {/* Responsive Menu Wrapper */}
          <div className={`navbar-menu-wrapper ${isMobileMenuOpen ? "mobile-open" : ""}`}>
            <nav className="navbar-links" aria-label="Main Navigation">
              <NavLink to="/home" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setIsMobileMenuOpen(false)}>
                Home
              </NavLink>
              <NavLink to="/rehearsals" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setIsMobileMenuOpen(false)}>
                Rehearsals
              </NavLink>
              <NavLink to="/notices" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setIsMobileMenuOpen(false)}>
                Notices
              </NavLink>
              <NavLink to="/productions" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setIsMobileMenuOpen(false)}>
                Productions
              </NavLink>
              <NavLink to="/payments" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setIsMobileMenuOpen(false)}>
                Submit Payment
              </NavLink>

              {/* Admin Toggle Dropdown */}
              {(isAdmin || isDirector) && (
                <div className="navbar-admin-dropdown" ref={adminDropdownRef}>
                  <button
                    className="nav-link dropdown-trigger"
                    onClick={() => setIsAdminDropdownOpen((isOpen) => !isOpen)}
                    aria-expanded={isAdminDropdownOpen}
                    aria-haspopup="menu"
                    type="button"
                  >
                    Admin <span className={`dropdown-caret ${isAdminDropdownOpen ? "open" : ""}`}>▼</span>
                  </button>
                  {isAdminDropdownOpen && (
                    <div className="dropdown-menu" role="menu">
                      <NavLink
                        to="/admin?tab=members"
                        className="dropdown-item"
                        onClick={() => {
                          setIsAdminDropdownOpen(false);
                          setIsMobileMenuOpen(false);
                        }}
                        role="menuitem"
                      >
                        Registry Directory
                      </NavLink>
                      <NavLink
                        to="/admin?tab=notices"
                        className="dropdown-item"
                        onClick={() => {
                          setIsAdminDropdownOpen(false);
                          setIsMobileMenuOpen(false);
                        }}
                        role="menuitem"
                      >
                        Notices Management
                      </NavLink>
                      {isAdmin && (
                        <NavLink
                          to="/admin?tab=rehearsals"
                          className="dropdown-item"
                          onClick={() => {
                            setIsAdminDropdownOpen(false);
                            setIsMobileMenuOpen(false);
                          }}
                          role="menuitem"
                        >
                          Rehearsals Management
                        </NavLink>
                      )}
                      <NavLink
                        to="/admin?tab=productions"
                        className="dropdown-item"
                        onClick={() => {
                          setIsAdminDropdownOpen(false);
                          setIsMobileMenuOpen(false);
                        }}
                        role="menuitem"
                      >
                        Productions Management
                      </NavLink>
                      {isAdmin && (
                        <NavLink
                          to="/admin?tab=attendance"
                          className="dropdown-item"
                          onClick={() => {
                            setIsAdminDropdownOpen(false);
                            setIsMobileMenuOpen(false);
                          }}
                          role="menuitem"
                        >
                          Attendance Sheet
                        </NavLink>
                      )}
                      {isAdmin && (
                        <NavLink
                          to="/admin/payments"
                          className="dropdown-item"
                          onClick={() => {
                            setIsAdminDropdownOpen(false);
                            setIsMobileMenuOpen(false);
                          }}
                          role="menuitem"
                        >
                          Payments Registry
                        </NavLink>
                      )}
                    </div>
                  )}
                </div>
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
        </div>
      </header>

      <main className="page-content">
        <Outlet context={{ currentUser, isAdmin, isDirector, userRole, onLogout: handleLogout }} />
      </main>
    </div>
  );
}
