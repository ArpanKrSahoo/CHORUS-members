import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { formatDateTime, getTimestampDateValue } from "../utils/dateTime";

export default function RehearsalsPage() {
  const navigate = useNavigate();
  const [rehearsals, setRehearsals] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setErrorMessage("Firebase is not configured.");
      setIsLoading(false);
      return undefined;
    }

    const rehearsalsQuery = query(
      collection(db, "rehearsals"),
      orderBy("rehearsalAt", "asc"),
    );

    return onSnapshot(
      rehearsalsQuery,
      (snapshot) => {
        setRehearsals(
          snapshot.docs.map((rehearsalDoc) => ({
            id: rehearsalDoc.id,
            ...rehearsalDoc.data(),
          })),
        );
        setIsLoading(false);
      },
      (error) => {
        setErrorMessage(error.message || "Unable to load rehearsal dates.");
        setIsLoading(false);
      },
    );
  }, []);

  const liveRehearsals = useMemo(() => {
    const now = new Date();
    return rehearsals.filter(
      (rehearsal) => getTimestampDateValue(rehearsal.rehearsalAt) >= now,
    );
  }, [rehearsals]);

  return (
    <div className="inner-page">
      <header className="page-header page-header--with-action">
        <div className="header-title-block">
          <h1 className="themed-page-title">মহড়া সূচী (Rehearsals)</h1>
          <p className="themed-page-subtitle">Live rehearsal call times are shown until scheduled slot has passed.</p>
        </div>
        <button className="workspace-back-btn" type="button" onClick={() => navigate("/home")}>
          ← Back to Lobby
        </button>
      </header>

      {isLoading ? <p className="workspace-loading-state">Retrieving call sheets...</p> : null}
      {errorMessage ? <p className="workspace-error-card">{errorMessage}</p> : null}
      {!isLoading && !errorMessage && liveRehearsals.length === 0 ? (
        <p className="workspace-empty-state">No live rehearsal calls have been listed yet.</p>
      ) : null}

      <div className="themed-card-list">
        {liveRehearsals.map((rehearsal) => (
          <article className="info-card rehearsal-card" key={rehearsal.id}>
            <span className="info-card__date">
              <span className="calendar-icon">📅</span> {formatDateTime(rehearsal.rehearsalAt)}
            </span>
            <h2 className="rehearsal-card-title">
              <span className="theatrical-bullet">🎭</span> {rehearsal.title}
            </h2>
            {rehearsal.location ? (
              <p className="rehearsal-card-location">
                <span className="location-icon">📍</span> <strong>Stage/Room:</strong> {rehearsal.location}
              </p>
            ) : null}
            {rehearsal.note ? (
              <p className="rehearsal-card-note">
                <span className="note-icon">📝</span> <strong>Director Notes:</strong> {rehearsal.note}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
