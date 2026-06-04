import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";

function formatNoteDate(value) {
  if (!value) return "";

  const noteDate = new Date(value);
  if (Number.isNaN(noteDate.getTime())) return "";

  return noteDate.toLocaleString(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ProductionsPage() {
  const navigate = useNavigate();
  const [productions, setProductions] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setErrorMessage("Firebase is not configured.");
      setIsLoading(false);
      return undefined;
    }

    const productionsQuery = query(
      collection(db, "productions"),
      orderBy("createdAt", "desc"),
    );

    return onSnapshot(
      productionsQuery,
      (snapshot) => {
        setProductions(
          snapshot.docs.map((productionDoc) => ({
            id: productionDoc.id,
            ...productionDoc.data(),
          })),
        );
        setIsLoading(false);
      },
      (error) => {
        setErrorMessage(error.message || "Unable to load productions.");
        setIsLoading(false);
      },
    );
  }, []);

  return (
    <div className="inner-page">
      <header className="page-header page-header--with-action">
        <div className="header-title-block">
          <h1 className="themed-page-title">প্রযোজনা (Live Productions)</h1>
          <p className="themed-page-subtitle">Production archives, script folders, and performance materials.</p>
        </div>
        <button className="workspace-back-btn" type="button" onClick={() => navigate("/home")}>
          ← Back to Lobby
        </button>
      </header>

      {isLoading ? <p className="workspace-loading-state">Retrieving productions...</p> : null}
      {errorMessage ? <p className="workspace-error-card">{errorMessage}</p> : null}
      {!isLoading && !errorMessage && productions.length === 0 ? (
        <div className="workspace-empty-container">
          <div className="empty-state-icon" aria-hidden="true">Production</div>
          <p className="workspace-empty-state">No live productions have been added yet.</p>
          <span className="empty-state-sub">Scripts, stage plans, and roles registry are currently being cataloged.</span>
        </div>
      ) : null}

      <div className="themed-card-list">
        {productions.map((production) => (
          <article className="info-card rehearsal-card" key={production.id}>
            <span className="info-card__date">
              Director(s): {(production.directorEmails ?? []).join(", ")}
            </span>
            <h2 className="rehearsal-card-title">{production.title}</h2>

            {(production.roles ?? []).length > 0 ? (
              <>
                <h3>Cast Roles</h3>
                {(production.roles ?? []).map((role) => (
                  <p key={`${role.description}-${role.memberEmail}`} className="rehearsal-card-note">
                    <strong>{role.description}:</strong> {role.memberEmail}
                  </p>
                ))}
              </>
            ) : null}

            {(production.notes ?? []).length > 0 ? (
              <>
                <h3>Production Notes</h3>
                {(production.notes ?? []).map((note) => (
                  <p key={`${note.authorEmail}-${note.createdAt}`} className="rehearsal-card-note">
                    {note.body}
                    <br />
                    <small>
                      {note.authorEmail}
                      {formatNoteDate(note.createdAt) ? ` - ${formatNoteDate(note.createdAt)}` : ""}
                    </small>
                  </p>
                ))}
              </>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
