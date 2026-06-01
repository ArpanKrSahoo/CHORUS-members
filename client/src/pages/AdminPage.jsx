import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="inner-page admin-page">
      <header className="page-header page-header--with-action">
        <div>
          <h1>Admin</h1>
          <p>Manage members, notices, and rehearsal dates.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => navigate("/home")}>
          Home
        </button>
      </header>

      <section className="admin-grid">
        <form className="admin-form" onSubmit={handleAddMember}>
          <h2>Add Member</h2>
          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              onChange={(event) => updateMemberField("email", event.target.value)}
              required
              type="email"
              value={memberForm.email}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              autoComplete="new-password"
              minLength={6}
              onChange={(event) => updateMemberField("password", event.target.value)}
              required
              type="password"
              value={memberForm.password}
            />
          </label>
          <label>
            <span>Role</span>
            <select
              onChange={(event) => updateMemberField("role", event.target.value)}
              value={memberForm.role}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="director">Director</option>
            </select>
          </label>
          {memberStatus ? <p className="form-status">{memberStatus}</p> : null}
          <button className="primary-button" disabled={isSavingMember} type="submit">
            {isSavingMember ? "Adding..." : "Add Member"}
          </button>
        </form>

        <form className="admin-form" onSubmit={handleSaveNotice}>
          <h2>{editingNoticeId ? "Edit Notice" : "Add Notice"}</h2>
          <label>
            <span>Title</span>
            <input
              onChange={(event) => updateNoticeField("title", event.target.value)}
              required
              type="text"
              value={noticeForm.title}
            />
          </label>
          <label>
            <span>Body</span>
            <textarea
              onChange={(event) => updateNoticeField("body", event.target.value)}
              required
              rows={5}
              value={noticeForm.body}
            />
          </label>
          {noticeStatus ? <p className="form-status">{noticeStatus}</p> : null}
          <button className="primary-button" disabled={isSavingNotice} type="submit">
            {isSavingNotice ? "Saving..." : "Save Notice"}
          </button>
          {editingNoticeId ? (
            <button
              className="secondary-button"
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
          <h2>{editingRehearsalId ? "Edit Rehearsal" : "Add Rehearsal"}</h2>
          <label>
            <span>Title</span>
            <input
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
            <span>Location</span>
            <input
              onChange={(event) => updateRehearsalField("location", event.target.value)}
              type="text"
              value={rehearsalForm.location}
            />
          </label>
          <label>
            <span>Note</span>
            <textarea
              onChange={(event) => updateRehearsalField("note", event.target.value)}
              rows={4}
              value={rehearsalForm.note}
            />
          </label>
          {rehearsalStatus ? <p className="form-status">{rehearsalStatus}</p> : null}
          <button className="primary-button" disabled={isSavingRehearsal} type="submit">
            {isSavingRehearsal ? "Saving..." : "Save Rehearsal"}
          </button>
          {editingRehearsalId ? (
            <button
              className="secondary-button"
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

      <section className="admin-list-grid">
        <article className="admin-list-panel">
          <h2>Members</h2>
          <div className="table-list">
            {members.map((member) => (
              <div className="table-row" key={member.email}>
                <span>{member.email}</span>
                <strong>{member.role}</strong>
                <small>{member.source}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-list-panel">
          <h2>Notices</h2>
          <div className="card-list">
            {notices.map((notice) => (
              <div className="editable-item" key={notice.id}>
                <div>
                  <strong>{notice.title}</strong>
                  <p>{notice.body}</p>
                </div>
                <div className="item-actions">
                  <button type="button" onClick={() => startNoticeEdit(notice)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => deleteNotice(notice.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {notices.length === 0 ? <p className="empty-state">No notices added.</p> : null}
          </div>
        </article>

        <article className="admin-list-panel">
          <h2>Rehearsals</h2>
          <div className="card-list">
            {rehearsals.map((rehearsal) => (
              <div className="editable-item" key={rehearsal.id}>
                <div>
                  <strong>{rehearsal.title}</strong>
                  <p>{formatDateTime(rehearsal.rehearsalAt)}</p>
                  {rehearsal.location ? <p>{rehearsal.location}</p> : null}
                </div>
                <div className="item-actions">
                  <button type="button" onClick={() => startRehearsalEdit(rehearsal)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => deleteRehearsal(rehearsal.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {rehearsals.length === 0 ? (
              <p className="empty-state">No rehearsal dates added.</p>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  );
}
