import React from "react";

export default function SplashScreen() {
  const chorusRows = Array.from({ length: 5 }, (_, index) => index);

  return (
    <main className="splash-shell" aria-label="Loading CHORUS">
      <section className="splash-card">
        <div className="chorus-marquee" aria-hidden="true">
          {chorusRows.map((row) => (
            <p key={row}>CHORUS CHORUS CHORUS</p>
          ))}
        </div>
        <div className="progress-track" aria-hidden="true">
          <span />
        </div>
      </section>
    </main>
  );
}
