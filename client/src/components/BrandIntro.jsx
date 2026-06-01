import React from "react";
import { ASSETS } from "../constants/assets";

const CLUB_NAME = "CHORUS";

export default function BrandIntro() {
  return (
    <main className="intro-shell" aria-label={`${CLUB_NAME} introduction`}>
      <section className="intro-card">
        <img className="intro-logo" src={ASSETS.logo} alt={`${CLUB_NAME} logo`} />
        <div className="intro-title-group">
          <h1>{CLUB_NAME}</h1>
          <div className="intro-dots" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="progress-track" aria-hidden="true">
          <span />
        </div>
      </section>
    </main>
  );
}
