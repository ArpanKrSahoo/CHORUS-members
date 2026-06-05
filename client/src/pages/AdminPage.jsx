import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { PREDEFINED_ADMIN_EMAILS } from "../constants/adminEmails";
import { db, secondaryAuth } from "../lib/firebase";
import { formatDateTime, getLocalDateTimeValue } from "../utils/dateTime";

const initialMemberForm = {
  name: "",
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

const initialProductionForm = {
  directorEmails: [],
  roles: [],
  title: "",
};

const emptyProductionRole = {
  description: "",
  memberEmail: "",
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

function getProductionRoles(form) {
  return form.roles
    .filter((role) => role.description.trim() && role.memberEmail)
    .map((role) => ({
      description: role.description.trim(),
      memberEmail: role.memberEmail,
    }));
}

function getUniqueDirectorEmails(emails) {
  return Array.from(new Set(emails.map(normalizeEmail).filter(Boolean)));
}

function canManageProduction(production, currentUser, isAdmin) {
  if (isAdmin) return true;
  if (!currentUser?.email) return false;

  return production.directorEmails?.includes(normalizeEmail(currentUser.email));
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { currentUser, isAdmin, isDirector } = useOutletContext();
  const canManageWorkspace = isAdmin || isDirector;
  const [memberForm, setMemberForm] = useState(initialMemberForm);
  const [noticeForm, setNoticeForm] = useState(initialNoticeForm);
  const [rehearsalForm, setRehearsalForm] = useState(initialRehearsalForm);
  const [productionForm, setProductionForm] = useState(initialProductionForm);
  const [members, setMembers] = useState([]);
  const [notices, setNotices] = useState([]);
  const [rehearsals, setRehearsals] = useState([]);
  const [productions, setProductions] = useState([]);
  const [editingNoticeId, setEditingNoticeId] = useState("");
  const [editingRehearsalId, setEditingRehearsalId] = useState("");
  const [editingProductionId, setEditingProductionId] = useState("");
  const [memberStatus, setMemberStatus] = useState("");
  const [noticeStatus, setNoticeStatus] = useState("");
  const [rehearsalStatus, setRehearsalStatus] = useState("");
  const [productionStatus, setProductionStatus] = useState("");
  const [noteDrafts, setNoteDrafts] = useState({});
  const [roleDrafts, setRoleDrafts] = useState({});
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [isSavingNotice, setIsSavingNotice] = useState(false);
  const [isSavingRehearsal, setIsSavingRehearsal] = useState(false);
  const [isSavingProduction, setIsSavingProduction] = useState(false);

  const directorOptions = useMemo(
    () => members.filter((member) => member.role === "director" || member.role === "admin"),
    [members],
  );

  const [selectedAttendanceRehearsalId, setSelectedAttendanceRehearsalId] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [savedAttendanceSheet, setSavedAttendanceSheet] = useState(null);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState("");

  const selectedAttendanceRehearsal = useMemo(
    () => rehearsals.find((rehearsal) => rehearsal.id === selectedAttendanceRehearsalId) || null,
    [rehearsals, selectedAttendanceRehearsalId],
  );

  useEffect(() => {
    if (!db || !selectedAttendanceRehearsalId) {
      setAttendanceRecords({});
      setSavedAttendanceSheet(null);
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
        setSavedAttendanceSheet(data);
      } else {
        setAttendanceRecords({});
        setSavedAttendanceSheet(null);
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

    if (!isAdmin) {
      setAttendanceStatus("Only admins can authorize attendance.");
      return;
    }

    if (!db || !selectedAttendanceRehearsalId) {
      setAttendanceStatus("Rehearsal or Firebase not configured.");
      return;
    }

    if (!selectedAttendanceRehearsal?.title || !selectedAttendanceRehearsal?.rehearsalAt) {
      setAttendanceStatus("Selected rehearsal details are missing. Please update the rehearsal first.");
      return;
    }

    setIsSavingAttendance(true);

    const records = {};
    members.forEach((member) => {
      const status = attendanceRecords[member.email] || "absent";
      const savedRecord = savedAttendanceSheet?.records?.[member.email];
      const markedAt =
        savedRecord?.status === status && savedRecord?.markedAt
          ? savedRecord.markedAt
          : Timestamp.now();

      records[member.email] = {
        status,
        markedAt,
      };
    });

    try {
      await setDoc(doc(db, "attendance", selectedAttendanceRehearsalId), {
        rehearsalId: selectedAttendanceRehearsalId,
        rehearsal: {
          id: selectedAttendanceRehearsalId,
          title: selectedAttendanceRehearsal.title,
          rehearsalAt: selectedAttendanceRehearsal.rehearsalAt,
        },
        updatedAt: serverTimestamp(),
        updatedBy: normalizeEmail(currentUser?.email || "admin"),
        records,
      });
      setAttendanceStatus("Attendance sheet saved successfully.");
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

  useEffect(() => {
    if (!db) return undefined;

    const productionsQuery = query(
      collection(db, "productions"),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(productionsQuery, (snapshot) => {
      setProductions(
        snapshot.docs.map((productionDoc) => ({
          id: productionDoc.id,
          ...productionDoc.data(),
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

  function updateProductionField(field, value) {
    setProductionForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function addProductionFormRole() {
    setProductionForm((currentForm) => ({
      ...currentForm,
      roles: [...currentForm.roles, emptyProductionRole],
    }));
  }

  function updateProductionFormRole(index, field, value) {
    setProductionForm((currentForm) => ({
      ...currentForm,
      roles: currentForm.roles.map((role, roleIndex) =>
        roleIndex === index ? { ...role, [field]: value } : role,
      ),
    }));
  }

  function removeProductionFormRole(index) {
    setProductionForm((currentForm) => ({
      ...currentForm,
      roles: currentForm.roles.filter((_, roleIndex) => roleIndex !== index),
    }));
  }

  async function handleAddMember(event) {
    event.preventDefault();
    setMemberStatus("");

    if (!isAdmin) {
      setMemberStatus("Only admins can manage members.");
      return;
    }

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
        name: memberForm.name.trim(),
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

  async function handleUpdateMemberRole(memberEmail, role) {
    setMemberStatus("");

    if (!isAdmin || !db) {
      setMemberStatus("Only admins can update member roles.");
      return;
    }

    try {
      await updateDoc(doc(db, "members", memberEmail), {
        role,
        updatedAt: serverTimestamp(),
      });
      setMemberStatus("Member role updated.");
    } catch (error) {
      setMemberStatus(getStatusMessage(error, "Unable to update role."));
    }
  }

  async function handleUpdateMemberName(memberEmail, name) {
    setMemberStatus("");

    if (!isAdmin || !db) {
      setMemberStatus("Only admins can update member names.");
      return;
    }

    try {
      await updateDoc(doc(db, "members", memberEmail), {
        name: name.trim(),
        updatedAt: serverTimestamp(),
      });
      setMemberStatus("Member name updated.");
    } catch (error) {
      setMemberStatus(getStatusMessage(error, "Unable to update name."));
    }
  }

  async function handleSaveNotice(event) {
    event.preventDefault();
    setNoticeStatus("");

    if (!canManageWorkspace) {
      setNoticeStatus("Only admins and directors can save notices.");
      return;
    }

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

    if (!isAdmin) {
      setRehearsalStatus("Only admins can save rehearsal dates.");
      return;
    }

    if (!db) {
      setRehearsalStatus("Firebase is not configured.");
      return;
    }

    setIsSavingRehearsal(true);

    const rehearsalDate = new Date(rehearsalForm.rehearsalAt);
    if (Number.isNaN(rehearsalDate.getTime())) {
      setRehearsalStatus("Choose a valid rehearsal date and time.");
      setIsSavingRehearsal(false);
      return;
    }

    const rehearsalPayload = {
      location: rehearsalForm.location.trim(),
      note: rehearsalForm.note.trim(),
      rehearsalAt: Timestamp.fromDate(rehearsalDate),
      title: rehearsalForm.title.trim(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingRehearsalId) {
        const batch = writeBatch(db);
        batch.update(doc(db, "rehearsals", editingRehearsalId), rehearsalPayload);

        const attendanceRef = doc(db, "attendance", editingRehearsalId);
        const attendanceSnapshot = await getDoc(attendanceRef);
        if (attendanceSnapshot.exists()) {
          batch.update(attendanceRef, {
            rehearsal: {
              id: editingRehearsalId,
              title: rehearsalPayload.title,
              rehearsalAt: rehearsalPayload.rehearsalAt,
            },
            updatedAt: serverTimestamp(),
            updatedBy: normalizeEmail(currentUser?.email || "admin"),
          });
        }

        await batch.commit();
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

  async function handleSaveProduction(event) {
    event.preventDefault();
    setProductionStatus("");

    if (!canManageWorkspace || !db || !currentUser?.email) {
      setProductionStatus("Only admins and directors can save productions.");
      return;
    }

    const currentEmail = normalizeEmail(currentUser.email);
    const selectedDirectors = isAdmin
      ? productionForm.directorEmails
      : [currentEmail];
    const directorEmails = getUniqueDirectorEmails(selectedDirectors);

    if (directorEmails.length === 0) {
      setProductionStatus("Attach at least one director before saving the production.");
      return;
    }

    const productionPayload = {
      directorEmails,
      roles: getProductionRoles(productionForm),
      title: productionForm.title.trim(),
      updatedAt: serverTimestamp(),
    };

    setIsSavingProduction(true);

    try {
      if (editingProductionId) {
        const production = productions.find((item) => item.id === editingProductionId);
        if (!production || !canManageProduction(production, currentUser, isAdmin)) {
          setProductionStatus("You can only edit assigned productions.");
          return;
        }

        await updateDoc(doc(db, "productions", editingProductionId), {
          ...productionPayload,
          directorEmails: isAdmin ? directorEmails : production.directorEmails ?? [],
          notes: production.notes ?? [],
        });
        setProductionStatus("Production updated.");
      } else {
        await addDoc(collection(db, "productions"), {
          ...productionPayload,
          createdAt: serverTimestamp(),
          notes: [],
        });
        setProductionStatus("Production added.");
      }

      setEditingProductionId("");
      setProductionForm(initialProductionForm);
    } catch (error) {
      setProductionStatus(getStatusMessage(error, "Unable to save production."));
    } finally {
      setIsSavingProduction(false);
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

  function startProductionEdit(production) {
    setEditingProductionId(production.id);
    setProductionForm({
      ...initialProductionForm,
      directorEmails: production.directorEmails ?? [],
      roles: production.roles ?? [],
      title: production.title ?? "",
    });
  }

  async function deleteNotice(noticeId) {
    if (!db || !canManageWorkspace) return;
    await deleteDoc(doc(db, "notices", noticeId));
  }

  async function deleteRehearsal(rehearsalId) {
    if (!db || !isAdmin) return;
    await deleteDoc(doc(db, "rehearsals", rehearsalId));
  }

  async function deleteProduction(production) {
    if (!db || !canManageProduction(production, currentUser, isAdmin)) return;
    await deleteDoc(doc(db, "productions", production.id));
  }

  async function addProductionDirector(production, directorEmail) {
    if (!db || !isAdmin || !directorEmail) return;
    setProductionStatus("");

    const directorEmails = getUniqueDirectorEmails([
      ...(production.directorEmails ?? []),
      directorEmail,
    ]);

    try {
      await updateDoc(doc(db, "productions", production.id), {
        directorEmails,
        updatedAt: serverTimestamp(),
      });
      setProductionStatus("Production director added.");
    } catch (error) {
      setProductionStatus(getStatusMessage(error, "Unable to add production director."));
    }
  }

  async function removeProductionDirector(production, directorEmail) {
    if (!db || !isAdmin || !directorEmail) return;
    setProductionStatus("");

    const directorEmails = getUniqueDirectorEmails(
      (production.directorEmails ?? []).filter((email) => normalizeEmail(email) !== directorEmail),
    );

    if (directorEmails.length === 0) {
      setProductionStatus("A production must keep at least one attached director.");
      return;
    }

    try {
      await updateDoc(doc(db, "productions", production.id), {
        directorEmails,
        updatedAt: serverTimestamp(),
      });
      setProductionStatus("Production director updated.");
    } catch (error) {
      setProductionStatus(getStatusMessage(error, "Unable to update production directors."));
    }
  }

  async function addProductionRole(production) {
    if (!db || !canManageProduction(production, currentUser, isAdmin)) return;

    const roleDraft = roleDrafts[production.id] ?? {
      description: "",
      memberEmail: "",
    };

    if (!roleDraft.description.trim() || !roleDraft.memberEmail) return;

    await updateDoc(doc(db, "productions", production.id), {
      roles: [
        ...(production.roles ?? []),
        {
          description: roleDraft.description.trim(),
          memberEmail: roleDraft.memberEmail,
        },
      ],
      updatedAt: serverTimestamp(),
    });

    setRoleDrafts((currentDrafts) => ({
      ...currentDrafts,
      [production.id]: { description: "", memberEmail: "" },
    }));
  }

  async function removeProductionRole(production, roleIndex) {
    if (!db || !canManageProduction(production, currentUser, isAdmin)) return;

    await updateDoc(doc(db, "productions", production.id), {
      roles: (production.roles ?? []).filter((_, index) => index !== roleIndex),
      updatedAt: serverTimestamp(),
    });
  }

  async function addProductionNote(production) {
    if (!db || !currentUser?.email || !canManageProduction(production, currentUser, isAdmin)) {
      return;
    }

    const body = noteDrafts[production.id]?.trim();
    if (!body) return;

    await updateDoc(doc(db, "productions", production.id), {
      notes: [
        ...(production.notes ?? []),
        {
          authorEmail: normalizeEmail(currentUser.email),
          body,
          createdAt: new Date().toISOString(),
        },
      ],
      updatedAt: serverTimestamp(),
    });

    setNoteDrafts((currentDrafts) => ({
      ...currentDrafts,
      [production.id]: "",
    }));
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
        {isAdmin ? (
          <form className="admin-form" onSubmit={handleAddMember}>
            <div className="form-header-row">
              <h2>Add Member</h2>
              <span className="form-icon">Member</span>
            </div>
            <label>
              <span>Full Name</span>
              <input
                placeholder="e.g. Arpan Kumar Sahoo"
                onChange={(event) => updateMemberField("name", event.target.value)}
                required
                type="text"
                value={memberForm.name}
              />
            </label>
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
              <p className={`form-status-alert ${memberStatus.includes("success") || memberStatus.includes("updated") ? "success" : "error"}`}>
                {memberStatus}
              </p>
            ) : null}
            <button className="admin-submit-btn" disabled={isSavingMember} type="submit">
              {isSavingMember ? "Adding Member..." : "Add Member"}
            </button>
          </form>
        ) : null}

        <form className="admin-form" onSubmit={handleSaveNotice}>
          <div className="form-header-row">
            <h2>{editingNoticeId ? "Edit Notice" : "Add Notice"}</h2>
            <span className="form-icon">Notice</span>
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

        {isAdmin ? (
          <form className="admin-form" onSubmit={handleSaveRehearsal}>
            <div className="form-header-row">
              <h2>{editingRehearsalId ? "Edit Rehearsal" : "Add Rehearsal"}</h2>
              <span className="form-icon">Rehearsal</span>
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
        ) : null}

        <form className="admin-form" onSubmit={handleSaveProduction}>
          <div className="form-header-row">
            <h2>{editingProductionId ? "Edit Production" : "Add Production"}</h2>
            <span className="form-icon">Production</span>
          </div>
          <label>
            <span>Drama Name</span>
            <input
              placeholder="e.g. Char Adhyay"
              onChange={(event) => updateProductionField("title", event.target.value)}
              required
              type="text"
              value={productionForm.title}
            />
          </label>
          {isAdmin ? (
            <label>
              <span>Attached Director(s)</span>
              <select
                multiple
                onChange={(event) =>
                  updateProductionField(
                    "directorEmails",
                    Array.from(event.target.selectedOptions, (option) => option.value),
                  )
                }
                required
                value={productionForm.directorEmails}
              >
                {directorOptions.map((member) => (
                  <option key={member.email} value={member.email}>
                    {member.email}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="form-status-alert success">
              This production will be attached to {currentUser?.email}.
            </p>
          )}
          <div className="card-list admin-card-list">
            <span>Cast / Role List</span>
            {productionForm.roles.map((role, index) => (
              <div className="editable-item" key={`production-form-role-${index}`}>
                <div className="item-info">
                  <label>
                    <span>Role Description</span>
                    <input
                      placeholder="e.g. Father of the main character"
                      onChange={(event) =>
                        updateProductionFormRole(index, "description", event.target.value)
                      }
                      type="text"
                      value={role.description}
                    />
                  </label>
                  <label>
                    <span>Member Playing Role</span>
                    <select
                      onChange={(event) =>
                        updateProductionFormRole(index, "memberEmail", event.target.value)
                      }
                      value={role.memberEmail}
                    >
                      <option value="">Select member</option>
                      {members.map((member) => (
                        <option key={member.email} value={member.email}>
                          {member.email}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="item-actions">
                  <button
                    className="item-delete-btn"
                    onClick={() => removeProductionFormRole(index)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button className="item-edit-btn" onClick={addProductionFormRole} type="button">
              Add Cast Role
            </button>
          </div>
          {productionStatus ? (
            <p className={`form-status-alert ${productionStatus.includes("added") || productionStatus.includes("updated") ? "success" : "error"}`}>
              {productionStatus}
            </p>
          ) : null}
          <button className="admin-submit-btn" disabled={isSavingProduction} type="submit">
            {isSavingProduction ? "Saving..." : "Save Production"}
          </button>
          {editingProductionId ? (
            <button
              className="admin-cancel-btn"
              onClick={() => {
                setEditingProductionId("");
                setProductionForm(initialProductionForm);
              }}
              type="button"
            >
              Cancel Edit
            </button>
          ) : null}
        </form>
      </section>

      {isAdmin ? (
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
                {selectedAttendanceRehearsal ? (
                  <div className="attendance-rehearsal-summary">
                    <strong>{selectedAttendanceRehearsal.title}</strong>
                    <small>{formatDateTime(selectedAttendanceRehearsal.rehearsalAt)}</small>
                  </div>
                ) : null}

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
                  {isSavingAttendance
                    ? "Saving Attendance Sheet..."
                    : savedAttendanceSheet
                      ? "Update Attendance Sheet"
                      : "Save Attendance Sheet"}
                </button>
              </form>
            ) : (
              <p className="empty-state">Select a rehearsal date from the dropdown to start logging attendance.</p>
            )}
          </article>
        </section>
      ) : null}

      <section className="admin-list-grid">
        {isAdmin ? (
          <article className="admin-list-panel">
            <h2>Registry Directory</h2>
            <div className="table-list">
              {members.map((member) => (
                <div className="table-row member-registry-row" key={member.email}>
                  <input
                    type="text"
                    className="member-name-input"
                    placeholder="Set Proper Name"
                    disabled={member.source === "Predefined admin"}
                    onBlur={(event) => handleUpdateMemberName(member.email, event.target.value)}
                    defaultValue={member.name || ""}
                  />
                  <span className="member-email-col">{member.email}</span>
                  <select
                    className="member-role-badge"
                    disabled={member.source === "Predefined admin"}
                    onChange={(event) => handleUpdateMemberRole(member.email, event.target.value)}
                    value={member.role}
                  >
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                    <option value="director">director</option>
                  </select>
                  <small className="member-source-label">{member.source}</small>
                </div>
              ))}
            </div>
          </article>
        ) : null}

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

        {isAdmin ? (
          <article className="admin-list-panel">
            <h2>Scheduled Rehearsals</h2>
            <div className="card-list admin-card-list">
              {rehearsals.map((rehearsal) => (
                <div className="editable-item rehearsal-admin-card" key={rehearsal.id}>
                  <div className="item-info">
                    <strong>{rehearsal.title}</strong>
                    <p className="rehearsal-time-label">{formatDateTime(rehearsal.rehearsalAt)}</p>
                    {rehearsal.location ? <p className="rehearsal-location-label">{rehearsal.location}</p> : null}
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
        ) : null}

        <article className="admin-list-panel">
          <h2>Live Productions</h2>
          <div className="card-list admin-card-list">
            {productions.map((production) => {
              const canEditProduction = canManageProduction(production, currentUser, isAdmin);
              const attachedDirectorEmails = getUniqueDirectorEmails(production.directorEmails ?? []);
              const availableDirectorOptions = directorOptions.filter(
                (member) => !attachedDirectorEmails.includes(normalizeEmail(member.email)),
              );
              const roleDraft = roleDrafts[production.id] ?? {
                description: "",
                memberEmail: "",
              };

              return (
                <div className="editable-item rehearsal-admin-card" key={production.id}>
                  <div className="item-info">
                    <strong>{production.title}</strong>
                    <div className="production-director-manager">
                      <span>Director(s)</span>
                      <div className="production-director-list">
                        {attachedDirectorEmails.map((directorEmail) => (
                          <span className="production-director-chip" key={directorEmail}>
                            {directorEmail}
                            {isAdmin && attachedDirectorEmails.length > 1 ? (
                              <button
                                aria-label={`Remove ${directorEmail} from ${production.title}`}
                                onClick={() => removeProductionDirector(production, directorEmail)}
                                type="button"
                              >
                                Remove
                              </button>
                            ) : null}
                          </span>
                        ))}
                      </div>
                      {isAdmin ? (
                        <select
                          aria-label={`Add director to ${production.title}`}
                          onChange={(event) => {
                            addProductionDirector(production, event.target.value);
                            event.target.value = "";
                          }}
                          value=""
                        >
                          <option value="">Add director</option>
                          {availableDirectorOptions.map((member) => (
                            <option key={member.email} value={member.email}>
                              {member.email}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                    {(production.roles ?? []).map((role, index) => (
                      <p key={`${role.description}-${role.memberEmail}`}>
                        {role.description}: {role.memberEmail}
                        {canEditProduction ? (
                          <button type="button" onClick={() => removeProductionRole(production, index)}>
                            Remove
                          </button>
                        ) : null}
                      </p>
                    ))}
                    {(production.notes ?? []).map((note) => (
                      <p key={`${note.authorEmail}-${note.createdAt}`}>
                        Note: {note.body} ({note.authorEmail})
                      </p>
                    ))}
                    {canEditProduction ? (
                      <>
                        <label>
                          <span>Add Role Description</span>
                          <input
                            onChange={(event) =>
                              setRoleDrafts((currentDrafts) => ({
                                ...currentDrafts,
                                [production.id]: {
                                  ...roleDraft,
                                  description: event.target.value,
                                },
                              }))
                            }
                            type="text"
                            value={roleDraft.description}
                          />
                        </label>
                        <label>
                          <span>Member Playing Role</span>
                          <select
                            onChange={(event) =>
                              setRoleDrafts((currentDrafts) => ({
                                ...currentDrafts,
                                [production.id]: {
                                  ...roleDraft,
                                  memberEmail: event.target.value,
                                },
                              }))
                            }
                            value={roleDraft.memberEmail}
                          >
                            <option value="">Select member</option>
                            {members.map((member) => (
                              <option key={member.email} value={member.email}>
                                {member.email}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button className="item-edit-btn" type="button" onClick={() => addProductionRole(production)}>
                          Add Role
                        </button>
                        <label>
                          <span>Production Note</span>
                          <textarea
                            onChange={(event) =>
                              setNoteDrafts((currentDrafts) => ({
                                ...currentDrafts,
                                [production.id]: event.target.value,
                              }))
                            }
                            rows={3}
                            value={noteDrafts[production.id] ?? ""}
                          />
                        </label>
                        <button className="item-edit-btn" type="button" onClick={() => addProductionNote(production)}>
                          Add Note
                        </button>
                      </>
                    ) : null}
                  </div>
                  {canEditProduction ? (
                    <div className="item-actions">
                      <button className="item-edit-btn" type="button" onClick={() => startProductionEdit(production)}>
                        Edit
                      </button>
                      <button className="item-delete-btn" type="button" onClick={() => deleteProduction(production)}>
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {productions.length === 0 ? (
              <p className="empty-state">No live productions added yet.</p>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  );
}
