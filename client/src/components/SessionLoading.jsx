import React from "react";
import { ASSETS } from "../constants/assets";

const CLUB_NAME = "CHORUS";

export default function SessionLoading() {
  return (
    <main className="app-shell">
      <section className="loading-card">
        <img className="loading-logo" src={ASSETS.logo} alt={`${CLUB_NAME} logo`} />
        <h1>{CLUB_NAME}</h1>
      </section>
    </main>
  );
}
