import React from "react";

const notices = [
  {
    title: "Uniform collection — this Sunday",
    date: "28 May 2025",
    body: "Please collect your new performance uniforms from the wardrobe room between 10 AM and 1 PM.",
  },
  {
    title: "Ticket sales now open",
    date: "20 May 2025",
    body: "Tickets for Summer Gala 2025 are on sale. Each member is allocated two complimentary tickets.",
  },
  {
    title: "End-of-year dinner — RSVP needed",
    date: "10 May 2025",
    body: "Please RSVP for the end-of-year dinner by 1 June. Reply to this notice or contact the secretary.",
  },
];

export default function NoticesPage() {
  return (
    <div className="inner-page">
      <header className="page-header">
        <h1>Notices</h1>
        <p>Latest announcements from the committee</p>
      </header>
      <div className="card-list">
        {notices.map((n) => (
          <article className="info-card" key={n.title}>
            <span className="info-card__date">{n.date}</span>
            <h2>{n.title}</h2>
            <p>{n.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
