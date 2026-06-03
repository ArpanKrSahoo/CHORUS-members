import React from "react";
import { useNavigate } from "react-router-dom";

export default function ProductionsPage() {
  const navigate = useNavigate();

  return (
    <div className="inner-page">
      <header className="page-header page-header--with-action">
        <div className="header-title-block">
          <h1 className="themed-page-title">প্রযোজনা (Live Productions)</h1>
          <p className="themed-page-subtitle">Production archives, script folders, and performance materials.</p>
        </div>
        <button className="workspace-back-btn" type="button" onClick={() => navigate("/home")}>
          ← Back to Lobby
        </button>
      </header>

      <div className="workspace-empty-container">
        <div className="empty-state-icon" aria-hidden="true">🎬</div>
        <p className="workspace-empty-state">Production management will be connected in the next stage.</p>
        <span className="empty-state-sub">Scripts, stage plans, and roles registry are currently being cataloged.</span>
      </div>
    </div>
  );
}
