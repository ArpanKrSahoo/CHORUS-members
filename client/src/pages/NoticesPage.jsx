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
        <div>
          <h1>Notices</h1>
          <p>Latest announcements from the committee.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => navigate("/home")}>
          Home
        </button>
      </header>

      {isLoading ? <p className="empty-state">Loading notices...</p> : null}
      {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
      {!isLoading && !errorMessage && notices.length === 0 ? (
        <p className="empty-state">No notices have been published yet.</p>
      ) : null}

      <div className="card-list">
        {notices.map((notice) => (
          <article className="info-card" key={notice.id}>
            <span className="info-card__date">
              {formatNoticeDate(notice.createdAt)}
            </span>
            <h2>{notice.title}</h2>
            <p>{notice.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
