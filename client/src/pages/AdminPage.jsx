import React, { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { PREDEFINED_ADMIN_EMAILS } from "../constants/adminEmails";
import { db, secondaryAuth } from "../lib/firebase";
import { formatDateTime, getLocalDateTimeValue } from "../utils/dateTime";

const initialMemberForm = {
  email: "",
  password: "",
  role: "member",
};

const initialNoticeForm = {
  body: "",
  title: "",
};

const initialRehearsalForm = {
  location: "",
  note: "",
  rehearsalAt: "",
  title: "",
};

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function getStatusMessage(error, fallback) {
  return error?.message || fallback;
}

function mergePredefinedAdmins(members) {
  const memberMap = new Map(members.map((member) => [member.email, member]));

  PREDEFINED_ADMIN_EMAILS.forEach((email) => {
    if (!memberMap.has(email)) {
      memberMap.set(email, {
        email,
        id: email,
        role: "admin",
        source: "Predefined admin",
      });
    }
  });

  return Array.from(memberMap.values()).sort((a, b) =>
    a.email.localeCompare(b.email),
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { currentUser } = useOutletContext();
  const [memberForm, setMemberForm] = useState(initialMemberForm);
  const [noticeForm, setNoticeForm] = useState(initialNoticeForm);
  const [rehearsalForm, setRehearsalForm] = useState(initialRehearsalForm);
  const [members, setMembers] = useState([]);
  const [notices, setNotices] = useState([]);
  const [rehearsals, setRehearsals] = useState([]);
  const [editingNoticeId, setEditingNoticeId] = useState("");
  const [editingRehearsalId, setEditingRehearsalId] = useState("");
  const [memberStatus, setMemberStatus] = useState("");
  const [noticeStatus, setNoticeStatus] = useState("");
  const [rehearsalStatus, setRehearsalStatus] = useState("");
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [isSavingNotice, setIsSavingNotice] = useState(false);
  const [isSavingRehearsal, setIsSavingRehearsal] = useState(false);

  const [selectedAttendanceRehearsalId, setSelectedAttendanceRehearsalId] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState("");

  useEffect(() => {
    if (!db || !selectedAttendanceRehearsalId) {
      setAttendanceRecords({});
      return undefined;
    }

    const docRef = doc(db, "attendance", selectedAttendanceRehearsalId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const records = {};
        if (data.records) {
          Object.keys(data.records).forEach((email) => {
            records[email] = data.records[email].status;
          });
        }
        setAttendanceRecords(records);
      } else {
        setAttendanceRecords({});
      }
    });
  }, [selectedAttendanceRehearsalId]);

  function handleToggleStatus(email, status) {
    setAttendanceRecords((prev) => ({
      ...prev,
      [email]: status,
    }));
  }

  async function handleSaveAttendance(event) {
    event.preventDefault();
    setAttendanceStatus("");

    if (!db || !selectedAttendanceRehearsalId) {
      setAttendanceStatus("Rehearsal or Firebase not configured.");
      return;
    }

    setIsSavingAttendance(true);

    const records = {};
    members.forEach((member) => {
      const status = attendanceRecords[member.email] || "absent";
      records[member.email] = {
        status,
        markedAt: Timestamp.now(),
      };
    });

    try {
      await setDoc(doc(db, "attendance", selectedAttendanceRehearsalId), {
        rehearsalId: selectedAttendanceRehearsalId,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.email || "Admin",
        records,
      });
      setAttendanceStatus("Attendance roll authorized successfully.");
    } catch (error) {
      setAttendanceStatus(error.message || "Failed to authorize attendance.");
    } finally {
      setIsSavingAttendance(false);
    }
  }

  useEffect(() => {
    if (!db) return undefined;

    const membersQuery = query(collection(db, "members"), orderBy("email", "asc"));
    return onSnapshot(membersQuery, (snapshot) => {
      const databaseMembers = snapshot.docs.map((memberDoc) => ({
        id: memberDoc.id,
        source: "Database",
        ...memberDoc.data(),
      }));
      setMembers(mergePredefinedAdmins(databaseMembers));
    });
  }, []);

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

  function updateMemberField(field, value) {
    setMemberForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function updateNoticeField(field, value) {
    setNoticeForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function updateRehearsalField(field, value) {
    setRehearsalForm((currentForm) => ({ ...currentForm, [field]: value })); 
  }

  async function handleAddMember(event) {
    event.preventDefault();
    setMemberStatus("");

    if (!db || !secondaryAuth) {
      setMemberStatus("Firebase is not configured.");
      return;
    }

    setIsSavingMember(true);
    try {
      const email = normalizeEmail(memberForm.email);
      const credential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        memberForm.password,
      );

      await setDoc(doc(db, "members", email), {
        authUid: credential.user.uid,
        createdAt: serverTimestamp(),
        email,
        role: memberForm.role,
      });

      await signOut(secondaryAuth);
      setMemberForm(initialMemberForm);
      setMemberStatus("Member added successfully.");
    } catch (error) {
      setMemberStatus(getStatusMessage(error, "Unable to add member."));
    } finally {
      setIsSavingMember(false);
    }
  }

  async function handleSaveNotice(event) {
    event.preventDefault();
    setNoticeStatus("");

    if (!db) {
      setNoticeStatus("Firebase is not configured.");
      return;
    }

    setIsSavingNotice(true);

    const noticePayload = {
      body: noticeForm.body.trim(),
      title: noticeForm.title.trim(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingNoticeId) {
        await updateDoc(doc(db, "notices", editingNoticeId), noticePayload);
        setNoticeStatus("Notice updated.");
      } else {
        await addDoc(collection(db, "notices"), {
          ...noticePayload,
          createdAt: serverTimestamp(),
        });
        setNoticeStatus("Notice published.");
      }

      setEditingNoticeId("");
      setNoticeForm(initialNoticeForm);
    } catch (error) {
      setNoticeStatus(getStatusMessage(error, "Unable to save notice."));
    } finally {
      setIsSavingNotice(false);
    }
  }

  async function handleSaveRehearsal(event) {
    event.preventDefault();
    setRehearsalStatus("");

    if (!db) {
      setRehearsalStatus("Firebase is not configured.");
      return;
    }

    setIsSavingRehearsal(true);

    const rehearsalPayload = {
      location: rehearsalForm.location.trim(),
      note: rehearsalForm.note.trim(),
      rehearsalAt: Timestamp.fromDate(new Date(rehearsalForm.rehearsalAt)),
      title: rehearsalForm.title.trim(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingRehearsalId) {
        await updateDoc(doc(db, "rehearsals", editingRehearsalId), rehearsalPayload);
        setRehearsalStatus("Rehearsal updated.");
      } else {
        await addDoc(collection(db, "rehearsals"), {
          ...rehearsalPayload,
          createdAt: serverTimestamp(),
        });
        setRehearsalStatus("Rehearsal added.");
      }

      setEditingRehearsalId("");
      setRehearsalForm(initialRehearsalForm);
    } catch (error) {
      setRehearsalStatus(getStatusMessage(error, "Unable to save rehearsal."));
    } finally {
      setIsSavingRehearsal(false);
    }
  }

  function startNoticeEdit(notice) {
    setEditingNoticeId(notice.id);
    setNoticeForm({
      body: notice.body ?? "",
      title: notice.title ?? "",
    });
  }

  function startRehearsalEdit(rehearsal) {
    setEditingRehearsalId(rehearsal.id);
    setRehearsalForm({
      location: rehearsal.location ?? "",
      note: rehearsal.note ?? "",
      rehearsalAt: getLocalDateTimeValue(rehearsal.rehearsalAt),
      title: rehearsal.title ?? "",
    });
  }

  async function deleteNotice(noticeId) {
    if (!db) return;
    await deleteDoc(doc(db, "notices", noticeId));
  }

  async function deleteRehearsal(rehearsalId) {
    if (!db) return;
    await deleteDoc(doc(db, "rehearsals", rehearsalId));
  }

  return (
    <div className="inner-page admin-page-container">
      <header className="page-header page-header--with-action">
        <div className="header-title-block">
          <h1 className="themed-page-title">নিয়ন্ত্রণ কক্ষ (Admin Panel)</h1>
          <p className="themed-page-subtitle">Manage group registry, issue new notices, and set rehearsal call times.</p>
        </div>
        <button className="workspace-back-btn" type="button" onClick={() => navigate("/home")}>
          ← Back to Lobby
        </button>
      </header>

      <section className="admin-grid">
        <form className="admin-form" onSubmit={handleAddMember}>
          <div className="form-header-row">
            <h2>Add Member</h2>
            <span className="form-icon">👤</span>
          </div>
          <label>
            <span>Email Address</span>
            <input
              autoComplete="email"
              placeholder="member@chorus.com"
              onChange={(event) => updateMemberField("email", event.target.value)}
              required
              type="email"
              value={memberForm.email}
            />
          </label>
          <label>
            <span>Temporary Password</span>
            <input
              autoComplete="new-password"
              placeholder="Min 6 characters"
              minLength={6}
              onChange={(event) => updateMemberField("password", event.target.value)}
              required
              type="password"
              value={memberForm.password}
            />
          </label>
          <label>
            <span>Assigned Role</span>
            <select
              onChange={(event) => updateMemberField("role", event.target.value)}
              value={memberForm.role}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="director">Director</option>
            </select>
          </label>
          {memberStatus ? (
            <p className={`form-status-alert ${memberStatus.includes("success") ? "success" : "error"}`}>
              {memberStatus}
            </p>
          ) : null}
          <button className="admin-submit-btn" disabled={isSavingMember} type="submit">
            {isSavingMember ? "Adding Member..." : "Add Member"}
          </button>
        </form>

        <form className="admin-form" onSubmit={handleSaveNotice}>
          <div className="form-header-row">
            <h2>{editingNoticeId ? "Edit Notice" : "Add Notice"}</h2>
            <span className="form-icon">📌</span>
          </div>
          <label>
            <span>Notice Title</span>
            <input
              placeholder="e.g. Schedule Update"
              onChange={(event) => updateNoticeField("title", event.target.value)}
              required
              type="text"
              value={noticeForm.title}
            />
          </label>
          <label>
            <span>Notice Body</span>
            <textarea
              placeholder="Type announcement details here..."
              onChange={(event) => updateNoticeField("body", event.target.value)}
              required
              rows={5}
              value={noticeForm.body}
            />
          </label>
          {noticeStatus ? (
            <p className={`form-status-alert ${noticeStatus.includes("published") || noticeStatus.includes("updated") ? "success" : "error"}`}>
              {noticeStatus}
            </p>
          ) : null}
          <button className="admin-submit-btn" disabled={isSavingNotice} type="submit">
            {isSavingNotice ? "Saving..." : "Save Notice"}
          </button>
          {editingNoticeId ? (
            <button
              className="admin-cancel-btn"
              onClick={() => {
                setEditingNoticeId("");
                setNoticeForm(initialNoticeForm);
              }}
              type="button"
            >
              Cancel Edit
            </button>
          ) : null}
        </form>

        <form className="admin-form" onSubmit={handleSaveRehearsal}>
          <div className="form-header-row">
            <h2>{editingRehearsalId ? "Edit Rehearsal" : "Add Rehearsal"}</h2>
            <span className="form-icon">🎭</span>
          </div>
          <label>
            <span>Rehearsal Title</span>
            <input
              placeholder="e.g. Act I Run-through"
              onChange={(event) => updateRehearsalField("title", event.target.value)}
              required
              type="text"
              value={rehearsalForm.title}
            />
          </label>
          <label>
            <span>Date and Time</span>
            <input
              onChange={(event) => updateRehearsalField("rehearsalAt", event.target.value)}
              required
              type="datetime-local"
              value={rehearsalForm.rehearsalAt}
            />
          </label>
          <label>
            <span>Location / Stage Room</span>
            <input
              placeholder="e.g. Stage Room A"
              onChange={(event) => updateRehearsalField("location", event.target.value)}
              type="text"
              value={rehearsalForm.location}
            />
          </label>
          <label>
            <span>Director's Instruction Note</span>
            <textarea
              placeholder="e.g. Actors in scene 1-3 must prepare..."
              onChange={(event) => updateRehearsalField("note", event.target.value)}
              rows={4}
              value={rehearsalForm.note}
            />
          </label>
          {rehearsalStatus ? (
            <p className={`form-status-alert ${rehearsalStatus.includes("added") || rehearsalStatus.includes("updated") ? "success" : "error"}`}>
              {rehearsalStatus}
            </p>
          ) : null}
          <button className="admin-submit-btn" disabled={isSavingRehearsal} type="submit">
            {isSavingRehearsal ? "Saving..." : "Save Rehearsal"}
          </button>
          {editingRehearsalId ? (
            <button
              className="admin-cancel-btn"
              onClick={() => {
                setEditingRehearsalId("");
                setRehearsalForm(initialRehearsalForm);
              }}
              type="button"
            >
              Cancel Edit
            </button>
          ) : null}
        </form>
      </section>

      <section className="admin-attendance-section">
        <article className="admin-list-panel attendance-manager-panel">
          <div className="attendance-header-row">
            <h2>Stage Manager Attendance Sheet</h2>
            <div className="rehearsal-dropdown-block">
              <label htmlFor="attendance-rehearsal-select">Select Rehearsal Call:</label>
              <select
                id="attendance-rehearsal-select"
                onChange={(event) => setSelectedAttendanceRehearsalId(event.target.value)}
                value={selectedAttendanceRehearsalId}
              >
                <option value="">-- Choose a Rehearsal Date --</option>
                {rehearsals.map((rehearsal) => (
                  <option key={rehearsal.id} value={rehearsal.id}>
                    {rehearsal.title} ({formatDateTime(rehearsal.rehearsalAt)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedAttendanceRehearsalId ? (
            <form className="attendance-form-sheet" onSubmit={handleSaveAttendance}>
              <div className="attendance-actions-bar">
                <button
                  type="button"
                  className="bulk-action-btn"
                  onClick={() => {
                    const records = {};
                    members.forEach((m) => { records[m.email] = "present"; });
                    setAttendanceRecords(records);
                  }}
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  className="bulk-action-btn"
                  onClick={() => {
                    const records = {};
                    members.forEach((m) => { records[m.email] = "absent"; });
                    setAttendanceRecords(records);
                  }}
                >
                  Mark All Absent
                </button>
              </div>

              <div className="attendance-members-list">
                {members.map((member) => {
                  const status = attendanceRecords[member.email] || "absent";
                  return (
                    <div className="attendance-member-row" key={member.email}>
                      <div className="member-details">
                        <span className="member-email">{member.email}</span>
                        <span className="member-role" data-role={member.role}>{member.role}</span>
                      </div>
                      <div className="status-toggle-group">
                        <button
                          type="button"
                          className={`status-btn present ${status === "present" ? "active" : ""}`}
                          onClick={() => handleToggleStatus(member.email, "present")}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          className={`status-btn absent ${status === "absent" ? "active" : ""}`}
                          onClick={() => handleToggleStatus(member.email, "absent")}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          className={`status-btn late ${status === "late" ? "active" : ""}`}
                          onClick={() => handleToggleStatus(member.email, "late")}
                        >
                          Late
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {attendanceStatus ? (
                <p className={`form-status-alert ${attendanceStatus.includes("successfully") ? "success" : "error"}`}>
                  {attendanceStatus}
                </p>
              ) : null}

              <button className="admin-submit-btn attendance-save-btn" disabled={isSavingAttendance} type="submit">
                {isSavingAttendance ? "Authorizing Attendance Sheet..." : "Authorize Attendance Sheet"}
              </button>
            </form>
          ) : (
            <p className="empty-state">Select a rehearsal date from the dropdown to start logging attendance.</p>
          )}
        </article>
      </section>

      <section className="admin-list-grid">
        <article className="admin-list-panel">
          <h2>Registry Directory</h2>
          <div className="table-list">
            {members.map((member) => (
              <div className="table-row" key={member.email}>
                <span className="member-email-col">{member.email}</span>
                <span className="member-role-badge" data-role={member.role}>{member.role}</span>
                <small className="member-source-label">{member.source}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-list-panel">
          <h2>Published Notices</h2>
          <div className="card-list admin-card-list">
            {notices.map((notice) => (
              <div className="editable-item notice-admin-card" key={notice.id}>
                <div className="item-info">
                  <strong>{notice.title}</strong>
                  <p>{notice.body}</p>
                </div>
                <div className="item-actions">
                  <button className="item-edit-btn" type="button" onClick={() => startNoticeEdit(notice)}>
                    Edit
                  </button>
                  <button className="item-delete-btn" type="button" onClick={() => deleteNotice(notice.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {notices.length === 0 ? <p className="empty-state">No notices published yet.</p> : null}
          </div>
        </article>

        <article className="admin-list-panel">
          <h2>Scheduled Rehearsals</h2>
          <div className="card-list admin-card-list">
            {rehearsals.map((rehearsal) => (
              <div className="editable-item rehearsal-admin-card" key={rehearsal.id}>
                <div className="item-info">
                  <strong>{rehearsal.title}</strong>
                  <p className="rehearsal-time-label">📅 {formatDateTime(rehearsal.rehearsalAt)}</p>
                  {rehearsal.location ? <p className="rehearsal-location-label">📍 {rehearsal.location}</p> : null}
                </div>
                <div className="item-actions">
                  <button className="item-edit-btn" type="button" onClick={() => startRehearsalEdit(rehearsal)}>
                    Edit
                  </button>
                  <button className="item-delete-btn" type="button" onClick={() => deleteRehearsal(rehearsal.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {rehearsals.length === 0 ? (
              <p className="empty-state">No rehearsal dates scheduled yet.</p>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  );
}

