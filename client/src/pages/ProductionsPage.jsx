import React from "react";
import { useNavigate } from "react-router-dom";

export default function ProductionsPage() {
  const navigate = useNavigate();

  return (
    <div className="inner-page">
      <header className="page-header page-header--with-action">
        <div>
          <h1>Live Productions</h1>
          <p>No live productions have been added yet.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => navigate("/home")}>
          Home
        </button>
      </header>

      <p className="empty-state">Production management will be connected later.</p>
    </div>
  );
}
