import React from "react";

const productions = [
  { title: "Summer Gala 2025", date: "12 Jul 2025", venue: "City Hall Auditorium", status: "Upcoming" },
  { title: "Spring Concert", date: "3 Apr 2025", venue: "Park Theatre", status: "Completed" },
  { title: "Winter Showcase", date: "20 Dec 2024", venue: "Community Centre", status: "Completed" },
];

export default function ProductionsPage() {
  return (
    <div className="inner-page">
      <header className="page-header">
        <h1>Live Productions</h1>
        <p>All scheduled and past performances</p>
      </header>
      <div className="card-list">
        {productions.map((p) => (
          <article className="info-card" key={p.title}>
            <div className="info-card__badge" data-status={p.status.toLowerCase()}>
              {p.status}
            </div>
            <h2>{p.title}</h2>
            <p>{p.date} · {p.venue}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
