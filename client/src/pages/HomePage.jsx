import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { formatDateTime, getTimestampDateValue } from "../utils/dateTime";
import { ASSETS } from "../constants/assets";

const CLUB_NAME = "CHORUS";

const homeItems = [
  { label: "Rehearsal Dates", path: "/rehearsals", tag: "Rehearsals" },
  { label: "Notice Board", path: "/notices", tag: "Notices" },
  { label: "Live Productions", path: "/productions", tag: "Productions" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useOutletContext();
  const [notices, setNotices] = useState([]);
  const [rehearsals, setRehearsals] = useState([]);
  const [attendanceSheets, setAttendanceSheets] = useState([]);

  useEffect(() => {
    if (!db) return undefined;

    const attendanceQuery = query(collection(db, "attendance"));
    return onSnapshot(attendanceQuery, (snapshot) => {
      setAttendanceSheets(
        snapshot.docs.map((doc) => doc.data())
      );
    });
  }, []);

  const attendanceStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let total = 0;

    attendanceSheets.forEach((sheet) => {
      const record = sheet.records?.[currentUser?.email];
      if (record) {
        total++;
        if (record.status === "present") present++;
        else if (record.status === "absent") absent++;
        else if (record.status === "late") late++;
      }
    });

    const percent = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, late, total, percent };
  }, [attendanceSheets, currentUser?.email]);

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
    <section className="home-panel-container" aria-labelledby="page-heading">
      <div className="home-hero-banner">
        <div className="home-hero-brand-container">
          <img src={ASSETS.logo} className="home-hero-logo" alt={`${CLUB_NAME} logo`} />
          <span className="barlow-hero-headline">
            {CLUB_NAME}
          </span>
        </div>
        <h1 id="page-heading" style={{ textAlign: "center", marginBottom: "16px" }}>রঙ্গমঞ্চ সদস্য লবি</h1>
        <p className="subtitle" style={{ margin: "0 auto", textAlign: "center" }}>
          Welcome to the {CLUB_NAME} creative workspace. Review schedules, committee notes, and scripts.
        </p>
      </div>

      <div className="home-grid">
        {homeItems.map((item) => (
          <button
            className="home-tile"
            key={item.label}
            onClick={() => navigate(item.path)}
            type="button"
          >
            <span className="tile-pattern-accent" aria-hidden="true" />
            <div className="tile-content">
              <h2>{item.label}</h2>
              {item.path === "/rehearsals" ? (
                <small>
                  {liveRehearsals.length > 0
                    ? `Next: ${formatDateTime(liveRehearsals[0].rehearsalAt)}`
                    : "No upcoming rehearsals"}
                </small>
              ) : null}
              {item.path === "/notices" ? (
                <small>
                  {notices.length > 0 ? `${notices.length} active announcements` : "No notices"}
                </small>
              ) : null}
              {item.path === "/productions" ? (
                <small>View files & script library</small>
              ) : null}
            </div>
          </button>
        ))}
      </div>

      {/* Attendance Scorecard Card */}
      <section className="attendance-scorecard-section">
        <div className="home-preview-card attendance-stats-card">
          <div className="section-title-row">
            <h2>আমার উপস্থিতি কার্ড (My Attendance)</h2>
            <span className="attendance-percentage-tag">{attendanceStats.percent}% Present</span>
          </div>

          <div className="attendance-stats-content">
            <div className="attendance-metrics-grid">
              <div className="metric-box present">
                <span className="metric-value">{attendanceStats.present}</span>
                <span className="metric-label">Present Calls</span>
              </div>
              <div className="metric-box absent">
                <span className="metric-value">{attendanceStats.absent}</span>
                <span className="metric-label">Absent Calls</span>
              </div>
              <div className="metric-box late">
                <span className="metric-value">{attendanceStats.late}</span>
                <span className="metric-label">Late Calls</span>
              </div>
              <div className="metric-box total">
                <span className="metric-value">{attendanceStats.total}</span>
                <span className="metric-label">Total Calls</span>
              </div>
            </div>

            <div className="attendance-progress-bar-container">
              <div 
                className="attendance-progress-fill" 
                style={{ width: `${attendanceStats.percent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-preview-grid" aria-label="Latest updates">
        <article className="home-preview-card">
          <div className="section-title-row">
            <h2>Call Sheet Snippet</h2>
            <button className="preview-action-btn" type="button" onClick={() => navigate("/rehearsals")}>
              All Calls
            </button>
          </div>
          <div className="preview-items-list">
            {liveRehearsals.length > 0 ? (
              liveRehearsals.map((rehearsal) => (
                <div className="preview-item" key={rehearsal.id}>
                  <strong>{rehearsal.title}</strong>
                  <span>{formatDateTime(rehearsal.rehearsalAt)}</span>
                </div>
              ))
            ) : (
              <p className="muted-text">No upcoming rehearsals scheduled.</p>
            )}
          </div>
        </article>

        <article className="home-preview-card">
          <div className="section-title-row">
            <h2>Notice Board Summary</h2>
            <button className="preview-action-btn" type="button" onClick={() => navigate("/notices")}>
              All Notices
            </button>
          </div>
          <div className="preview-items-list">
            {notices.slice(0, 3).length > 0 ? (
              notices.slice(0, 3).map((notice) => (
                <div className="preview-item" key={notice.id}>
                  <strong>{notice.title}</strong>
                  <span>{notice.body}</span>
                </div>
              ))
            ) : (
              <p className="muted-text">No active notices published.</p>
            )}
          </div>
        </article>
      </section>

      <footer className="home-lobby-footer">
        <p className="tagline">“নাটক শুধু বিনোদন নয়, সমাজকে চেনার দর্পণ।”</p>
      </footer>
    </section>
  );
}
