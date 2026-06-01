import React from "react";

const rehearsals = [
  { day: "Monday", time: "6:00 PM – 8:30 PM", location: "Studio A", note: "Full ensemble" },
  { day: "Wednesday", time: "7:00 PM – 9:00 PM", location: "Studio B", note: "Soprano & Alto sections" },
  { day: "Friday", time: "5:30 PM – 7:30 PM", location: "Main Hall", note: "Dress rehearsal (pre-show weeks)" },
];

export default function RehearsalsPage() {
  return (
    <div className="inner-page">
      <header className="page-header">
        <h1>Rehearsal Dates</h1>
        <p>Regular weekly schedule</p>
      </header>
      <div className="card-list">
        {rehearsals.map((r) => (
          <article className="info-card" key={r.day}>
            <h2>{r.day}</h2>
            <p className="info-card__time">{r.time}</p>
            <p>{r.location} · <em>{r.note}</em></p>
          </article>
        ))}
      </div>
    </div>
  );
}
