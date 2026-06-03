import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";

function formatNoticeDate(timestamp) {
  if (!timestamp?.toDate) {
    return "Recently";
  }

  return timestamp.toDate().toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function NoticesPage() {
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setErrorMessage("Firebase is not configured.");
      setIsLoading(false);
      return undefined;
    }

    const noticesQuery = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      noticesQuery,
      (snapshot) => {
        setNotices(
          snapshot.docs.map((noticeDoc) => ({
            id: noticeDoc.id,
            ...noticeDoc.data(),
          })),
        );
        setIsLoading(false);
      },
      (error) => {
        setErrorMessage(error.message || "Unable to load notices.");
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  return (
    <div className="inner-page">
      <header className="page-header page-header--with-action">
        <div className="header-title-block">
          <h1 className="themed-page-title">বিজ্ঞপ্তি বোর্ড (Notice Board)</h1>
          <p className="themed-page-subtitle">Latest official statements and announcements from the committee.</p>
        </div>
        <button className="workspace-back-btn" type="button" onClick={() => navigate("/home")}>
          ← Back to Lobby
        </button>
      </header>

      {isLoading ? <p className="workspace-loading-state">Retrieving bulletin items...</p> : null}
      {errorMessage ? <p className="workspace-error-card">{errorMessage}</p> : null}
      {!isLoading && !errorMessage && notices.length === 0 ? (
        <p className="workspace-empty-state">No announcements have been published on the board yet.</p>
      ) : null}

      <div className="themed-card-list">
        {notices.map((notice) => (
          <article className="info-card notice-card" key={notice.id}>
            <span className="info-card__date">
              <span className="announcement-badge">📢</span> {formatNoticeDate(notice.createdAt)}
            </span>
            <h2 className="notice-card-title">
              <span className="theatrical-bullet">📌</span> {notice.title}
            </h2>
            <p className="notice-card-body">{notice.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
