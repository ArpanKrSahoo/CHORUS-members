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
        <div>
          <h1>Rehearsal Dates</h1>
          <p>Live dates are shown until their scheduled time has passed.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => navigate("/home")}>
          Home
        </button>
      </header>

      {isLoading ? <p className="empty-state">Loading rehearsal dates...</p> : null}
      {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
      {!isLoading && !errorMessage && liveRehearsals.length === 0 ? (
        <p className="empty-state">No live rehearsal dates.</p>
      ) : null}

      <div className="card-list">
        {liveRehearsals.map((rehearsal) => (
          <article className="info-card" key={rehearsal.id}>
            <span className="info-card__date">
              {formatDateTime(rehearsal.rehearsalAt)}
            </span>
            <h2>{rehearsal.title}</h2>
            {rehearsal.location ? <p>{rehearsal.location}</p> : null}
            {rehearsal.note ? <p>{rehearsal.note}</p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
