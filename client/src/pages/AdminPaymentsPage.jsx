import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { formatDateTime } from "../utils/dateTime";

export default function AdminPaymentsPage() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [actionStatus, setActionStatus] = useState("");

  // Fetch all payment submissions
  useEffect(() => {
    if (!db) return;
    const paymentsQuery = query(collection(db, "payments"), orderBy("submittedAt", "desc"));
    return onSnapshot(paymentsQuery, (snap) => {
      setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Fetch all members to map proper names
  useEffect(() => {
    if (!db) return;
    const membersQuery = query(collection(db, "members"));
    return onSnapshot(membersQuery, (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Map member emails to proper names for easy lookup
  const memberNameMap = useMemo(() => {
    const map = {};
    members.forEach((m) => {
      if (m.email) {
        map[m.email.toLowerCase()] = m.name || "";
      }
    });
    return map;
  }, [members]);

  // Extract all unique months present in payments for filtering dropdown
  const uniqueMonths = useMemo(() => {
    const months = new Set();
    payments.forEach((p) => {
      if (p.month) months.add(p.month);
    });
    return Array.from(months).sort().reverse();
  }, [payments]);

  // Format month string
  const formatMonthName = (monthString) => {
    if (!monthString) return "";
    const [year, month] = monthString.split("-");
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleDateString("default", { month: "long", year: "numeric" });
  };

  // Handle Approve / Reject payment status updates
  const handleUpdateStatus = async (paymentId, newStatus) => {
    setActionStatus("");
    try {
      const paymentRef = doc(db, "payments", paymentId);
      await updateDoc(paymentRef, { status: newStatus });
      setActionStatus(`Payment status updated to ${newStatus}.`);
    } catch (error) {
      console.error(error);
      setActionStatus(error.message || "Failed to update payment status.");
    }
  };

  // Filter payments list based on user search, status, and month
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const email = p.email || "";
      const nameInProfile = memberNameMap[email.toLowerCase()] || "";
      const nameInPayment = p.name || "";
      
      const matchesSearch =
        email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nameInProfile.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nameInPayment.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesMonth = monthFilter === "all" || p.month === monthFilter;

      return matchesSearch && matchesStatus && matchesMonth;
    });
  }, [payments, memberNameMap, searchTerm, statusFilter, monthFilter]);

  return (
    <div className="inner-page admin-payments-page-container">
      <header className="page-header page-header--with-action">
        <div className="header-title-block">
          <h1 className="themed-page-title">পেমেন্ট রেজিস্ট্রি (Payments Registry)</h1>
          <p className="themed-page-subtitle">Verify screenshots, approve monthly fees, and track group transactions.</p>
        </div>
        <button className="workspace-back-btn" type="button" onClick={() => navigate("/admin")}>
          ← Back to Admin Panel
        </button>
      </header>

      {/* Filter and Control Bar */}
      <section className="payments-filter-bar">
        <div className="filter-input-group">
          <label htmlFor="search-input">Search member:</label>
          <input
            id="search-input"
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-input-group">
          <label htmlFor="status-select">Status:</label>
          <select
            id="status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="filter-input-group">
          <label htmlFor="month-select">Month:</label>
          <select
            id="month-select"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            <option value="all">All Months</option>
            {uniqueMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthName(m)}
              </option>
            ))}
          </select>
        </div>
      </section>

      {actionStatus && (
        <p className={`form-status-alert ${actionStatus.includes("updated") ? "success" : "error"}`}>
          {actionStatus}
        </p>
      )}

      {/* Payments Registry Grid/Table */}
      <section className="admin-list-panel">
        <div className="table-list-wrapper">
          <table className="admin-payments-table">
            <thead>
              <tr>
                <th>Member (Proper Name)</th>
                <th>Email Address</th>
                <th>Target Month</th>
                <th>Category / Purpose</th>
                <th>Amount</th>
                <th>Submitted On</th>
                <th>Status</th>
                <th>Receipt File</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => {
                const paymentEmail = p.email || "";
                const properName = memberNameMap[paymentEmail.toLowerCase()] || p.name || "N/A";
                const receiptUrl = p.receiptUrl || p.screenshotUrl;
                const isPdfReceipt = (p.receiptFormat || "").toLowerCase() === "pdf";
                const isImageReceipt = !isPdfReceipt && (p.receiptResourceType || "image") === "image";
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="member-name-block">
                        <strong>{properName}</strong>
                      </div>
                    </td>
                    <td>{paymentEmail}</td>
                    <td>{formatMonthName(p.month)}</td>
                    <td>
                      {p.category === "other" ? (
                        <span className="other-payment-label">
                          <strong>Other:</strong> {p.description || "N/A"}
                        </span>
                      ) : (
                        <span>Monthly club payment</span>
                      )}
                    </td>
                    <td><strong>₹{p.amount}</strong></td>
                    <td>{p.submittedAt ? formatDateTime(p.submittedAt) : "N/A"}</td>
                    <td>
                      <span className={`status-badge status-${p.status}`}>
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {receiptUrl ? (
                        isImageReceipt ? (
                          <button
                            type="button"
                            className="preview-thumbnail-btn"
                            onClick={() => setSelectedReceipt(receiptUrl)}
                          >
                            <img
                              src={receiptUrl}
                              alt="Receipt thumb"
                              className="receipt-thumbnail"
                            />
                            <span>Click to Zoom</span>
                          </button>
                        ) : (
                          <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="view-receipt-link">
                            Open PDF
                          </a>
                        )
                      ) : (
                        <span className="muted-text">No receipt</span>
                      )}
                    </td>
                    <td>
                      <div className="action-button-group">
                        <button
                          type="button"
                          className="action-btn btn-approve"
                          disabled={p.status === "approved"}
                          onClick={() => handleUpdateStatus(p.id, "approved")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="action-btn btn-reject"
                          disabled={p.status === "rejected"}
                          onClick={() => handleUpdateStatus(p.id, "rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty-table-state">
                    No payment submissions match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Lightbox Modal for Zooming Receipt Images */}
      {selectedReceipt && (
        <div className="lightbox-overlay" onClick={() => setSelectedReceipt(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close"
              onClick={() => setSelectedReceipt(null)}
            >
              ×
            </button>
            <img src={selectedReceipt} alt="Payment Receipt Zoomed" className="lightbox-image" />
          </div>
        </div>
      )}
    </div>
  );
}
