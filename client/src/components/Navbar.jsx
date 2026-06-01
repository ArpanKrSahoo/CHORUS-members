import React from "react";
import { NavLink } from "react-router-dom";
import { ASSETS } from "../constants/assets";

const CLUB_NAME = "CHORUS";

export default function Navbar({ onLogout }) {
  const navItems = [
    { label: "Home", path: "/home" },
    { label: "Productions", path: "/productions" },
    { label: "Rehearsals", path: "/rehearsals" },
    { label: "Notices", path: "/notices" },
  ];

  return (
    <nav className="app-navbar">
      <div className="navbar-brand">
        <img src={ASSETS.logo} alt={`${CLUB_NAME} logo`} className="navbar-logo" />
        <span className="navbar-title">{CLUB_NAME}</span>
      </div>
      <ul className="navbar-links">
        {navItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                isActive ? "nav-link nav-link--active" : "nav-link"
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <button className="icon-button navbar-logout" onClick={onLogout} type="button" aria-label="Sign out">
        Sign out
      </button>
    </nav>
  );
}
