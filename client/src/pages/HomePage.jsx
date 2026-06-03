import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { ASSETS } from "../constants/assets";
import { db } from "../lib/firebase";
import { formatDateTime, getTimestampDateValue } from "../utils/dateTime";

const CLUB_NAME = "CHORUS";

const homeItems = [
  { label: "Rehearsal Dates", path: "/rehearsals" },
  { label: "Notices", path: "/notices" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { currentUser, isAdmin, onLogout } = useOutletContext();
  const [notices, setNotices] = useState([]);
  const [rehearsals, setRehearsals] = useState([]);

  useEffect(() => {
    if (!db) return undefined;

    const noticesQuery = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    return onSnapshot(noticesQuery, (snapshot) => {
      setNotices(
        snapshot.docs.map((noticeDoc) => ({
          id: noticeDoc.id,
          ...noticeDoc.data(),
        })),
      );
    });
  }, []);

  useEffect(() => {
    if (!db) return undefined;

    const rehearsalsQuery = query(
      collection(db, "rehearsals"),
      orderBy("rehearsalAt", "asc"),
    );
    return onSnapshot(rehearsalsQuery, (snapshot) => {
      setRehearsals(
        snapshot.docs.map((rehearsalDoc) => ({
          id: rehearsalDoc.id,
          ...rehearsalDoc.data(),
        })),
      );
    });
  }, []);

  const liveRehearsals = useMemo(() => {
    const now = new Date();
    return rehearsals
      .filter((rehearsal) => getTimestampDateValue(rehearsal.rehearsalAt) >= now)
      .slice(0, 3);
  }, [rehearsals]);

  return (
    <section className="home-panel" aria-labelledby="page-heading">
      {isAdmin ? (
        <button
          className="admin-shortcut"
          onClick={() => navigate("/admin")}
          type="button"
        >
          Admin
        </button>
      ) : null}
      <div className="home-header">
        <img className="home-logo" src={ASSETS.logo} alt={`${CLUB_NAME} logo`} />
        <h1 id="page-heading">CHORUS</h1>
        <p>Member workspace</p>
      </div>
      <div className="home-grid">
        {homeItems.map((item) => (
          <button
            className="home-tile"
            key={item.label}
            onClick={() => navigate(item.path)}
            type="button"
          >
            <span aria-hidden="true" />
            <h2>{item.label}</h2>
            {item.path === "/rehearsals" ? (
              <small>
                {liveRehearsals.length > 0
                  ? formatDateTime(liveRehearsals[0].rehearsalAt)
                  : "No upcoming dates"}
              </small>
            ) : null}
            {item.path === "/notices" ? (
              <small>
                {notices.length > 0 ? `${notices.length} notice previews` : "No notices"}
              </small>
            ) : null}
          </button>
        ))}
      </div>

      <section className="home-preview-grid" aria-label="Latest updates">
        <article className="home-preview">
          <div className="section-title-row">
            <h2>Live Rehearsals</h2>
            <button type="button" onClick={() => navigate("/rehearsals")}>
              View
            </button>
          </div>
          {liveRehearsals.length > 0 ? (
            liveRehearsals.map((rehearsal) => (
              <div className="preview-item" key={rehearsal.id}>
                <strong>{rehearsal.title}</strong>
                <span>{formatDateTime(rehearsal.rehearsalAt)}</span>
              </div>
            ))
          ) : (
            <p className="muted-text">No live rehearsal dates.</p>
          )}
        </article>

        <article className="home-preview">
          <div className="section-title-row">
            <h2>Notice Board</h2>
            <button type="button" onClick={() => navigate("/notices")}>
              View
            </button>
          </div>
          {notices.length > 0 ? (
            notices.map((notice) => (
              <div className="preview-item" key={notice.id}>
                <strong>{notice.title}</strong>
                <span>{notice.body}</span>
              </div>
            ))
          ) : (
            <p className="muted-text">No notices have been added.</p>
          )}
        </article>
      </section>

      <footer className="user-footer">
        <p>
          <span>Logged in as</span>
          <strong>{currentUser.email ?? "Unknown user"}</strong>
        </p>
        <button type="button" onClick={onLogout}>
          Sign out
        </button>
      </footer>
    </section>
  );
}
