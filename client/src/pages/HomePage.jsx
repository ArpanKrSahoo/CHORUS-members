import React from "react";
import { useNavigate } from "react-router-dom";
import { ASSETS } from "../constants/assets";

const CLUB_NAME = "CHORUS";

const homeItems = [
  { label: "Live Productions", path: "/productions" },
  { label: "Rehearsal Dates", path: "/rehearsals" },
  { label: "Notices", path: "/notices" },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <section className="home-panel" aria-labelledby="page-heading">
      <div className="home-header">
        <img className="home-logo" src={ASSETS.logo} alt={`${CLUB_NAME} logo`} />
        <h1 id="page-heading">CHORUS Production</h1>
        <p>At a Glance</p>
      </div>
      <div className="home-grid">
        {homeItems.map((item) => (
          <article
            className="home-tile"
            key={item.label}
            onClick={() => navigate(item.path)}
            style={{ cursor: "pointer" }}
          >
            <span aria-hidden="true" />
            <h2>{item.label}</h2>
          </article>
        ))}
      </div>
    </section>
  );
}
