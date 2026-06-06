import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  cloudinaryConfigStatus,
  uploadPaymentReceipt,
  validatePaymentReceipt,
} from "../lib/cloudinary";
import { db } from "../lib/firebase";
import { formatDateTime } from "../utils/dateTime";

export default function PaymentsPage() {
  const { currentUser } = useOutletContext();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [pastPayments, setPastPayments] = useState([]);
  const [memberProfile, setMemberProfile] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusType, setStatusType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState("monthly");
  const [description, setDescription] = useState("");

  // Get current calendar month (YYYY-MM)
  const currentMonth = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  // Format month for display
  const formatMonthName = (monthString) => {
    const [year, month] = monthString.split("-");
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleDateString("default", { month: "long", year: "numeric" });
  };

  // Fetch Member Name and Profile
  useEffect(() => {
    if (!db || !currentUser?.email) return;
    const docRef = doc(db, "members", currentUser.email.toLowerCase());
    getDoc(docRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMemberProfile(data);
        if (data.name) {
          setName(data.name);
        }
      }
    });
  }, [currentUser]);

  // Fetch past payments of logged-in user
  useEffect(() => {
    if (!db || !currentUser?.email) return;
    const q = query(
      collection(db, "payments"),
      where("email", "==", currentUser.email.toLowerCase()),
      orderBy("submittedAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setPastPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [currentUser]);

  // Determine if payment for current month has already been uploaded
  const currentMonthPayment = useMemo(() => {
    return pastPayments.find((p) => p.month === currentMonth);
  }, [pastPayments, currentMonth]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    const validationError = validatePaymentReceipt(file);
    setReceiptFile(validationError ? null : file);
    setStatusMsg(validationError);
    setStatusType(validationError ? "error" : "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg("");
    setStatusType("");

    if (!name.trim()) {
      setStatusMsg("Please provide your Full Name.");
      setStatusType("error");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setStatusMsg("Please enter a valid amount.");
      setStatusType("error");
      return;
    }

    if (category === "other" && !description.trim()) {
      setStatusMsg("Please provide a description for the payment.");
      setStatusType("error");
      return;
    }

    const fileError = validatePaymentReceipt(receiptFile);
    if (fileError) {
      setStatusMsg(fileError);
      setStatusType("error");
      return;
    }

    if (!db) {
      setStatusMsg("Firebase configurations missing.");
      setStatusType("error");
      return;
    }

    if (!cloudinaryConfigStatus.isConfigured) {
      setStatusMsg(`Cloudinary is missing: ${cloudinaryConfigStatus.missingKeys.join(", ")}`);
      setStatusType("error");
      return;
    }

    setIsSubmitting(true);
    try {
      const email = currentUser.email.toLowerCase();

      setStatusMsg("Uploading receipt...");
      setStatusType("info");
      const receiptUpload = await uploadPaymentReceipt(receiptFile, {
        email,
        month: currentMonth,
      });

      setStatusMsg("Saving payment transaction...");
      const paymentRef = doc(collection(db, "payments"));
      const memberRef = doc(db, "members", email);

      await runTransaction(db, async (transaction) => {
        transaction.set(paymentRef, {
          email,
          name: name.trim(),
          month: currentMonth,
          amount: parseFloat(amount),
          receiptBytes: receiptUpload.bytes,
          receiptFormat: receiptUpload.format,
          receiptOriginalName: receiptUpload.originalFilename,
          receiptPublicId: receiptUpload.publicId,
          receiptResourceType: receiptUpload.resourceType,
          receiptUrl: receiptUpload.secureUrl,
          screenshotUrl: receiptUpload.secureUrl,
          submittedAt: serverTimestamp(),
          status: "pending",
          category,
          description: category === "other" ? description.trim() : "",
        });

        if (!memberProfile?.name || memberProfile.name !== name.trim()) {
          transaction.update(memberRef, {
            name: name.trim(),
            updatedAt: serverTimestamp(),
          });
        }
      });

      setStatusMsg("Upload Complete! Payment registered successfully.");
      setStatusType("success");
      setAmount("");
      setReceiptFile(null);
      setCategory("monthly");
      setDescription("");
      
      // Update local profile state
      setMemberProfile((prev) => ({ ...prev, name: name.trim() }));
    } catch (error) {
      console.error(error);
      setStatusMsg(error.message || "Failed to submit payment details.");
      setStatusType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="inner-page payments-page-container">
      <header className="page-header">
        <h1 className="themed-page-title">মাসিক পেমেন্ট (Monthly Payment Portal)</h1>
        <p className="themed-page-subtitle">Submit monthly dues, upload transaction receipts, and view payment logs.</p>
      </header>

      <div className="payments-grid">
        {/* Payment Submission Section */}
        <section className="payment-form-card">
          {currentMonthPayment ? (
            <div className="payment-success-overlay">
              <span className="success-icon">✓</span>
              <h2>Upload Complete</h2>
              <p>You have submitted payment details for <strong>{formatMonthName(currentMonth)}</strong>.</p>
              <div className="receipt-details">
                <div className="receipt-row">
                  <span>Name:</span>
                  <strong>{currentMonthPayment.name}</strong>
                </div>
                <div className="receipt-row">
                  <span>Payment Category:</span>
                  <strong>
                    {currentMonthPayment.category === "other"
                      ? `Other: ${currentMonthPayment.description || ""}`
                      : "Monthly club payment"}
                  </strong>
                </div>
                <div className="receipt-row">
                  <span>Amount:</span>
                  <strong>₹{currentMonthPayment.amount}</strong>
                </div>
                <div className="receipt-row">
                  <span>Submitted At:</span>
                  <span>{currentMonthPayment.submittedAt ? formatDateTime(currentMonthPayment.submittedAt) : "Just now"}</span>
                </div>
                <div className="receipt-row">
                  <span>Verification Status:</span>
                  <span className={`status-badge status-${currentMonthPayment.status}`}>
                    {currentMonthPayment.status.toUpperCase()}
                  </span>
                </div>
                <div className="receipt-row">
                  <span>Receipt:</span>
                  <a
                    href={currentMonthPayment.receiptUrl || currentMonthPayment.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-receipt-link"
                  >
                    View Receipt
                  </a>
                </div>
              </div>
              <p className="reopen-tip">The form will automatically reopen on the 1st of next month.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-header-row">
                <h2>Submit Monthly Dues</h2>
                <span className="form-icon">Monthly payment: {formatMonthName(currentMonth)}</span>
              </div>

              <label>
                <span>Full Name (Proper Name)</span>
                <input
                  type="text"
                  placeholder="e.g. Ankit Saha"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </label>

              <label>
                <span>Target Month</span>
                <input
                  type="text"
                  value={formatMonthName(currentMonth)}
                  disabled
                />
              </label>

              <label>
                <span>Amount Paid (₹)</span>
                <input
                  type="number"
                  placeholder="e.g. 100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  disabled={isSubmitting}
                  min="1"
                />
              </label>

              <label>
                <span>Payment Category</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="monthly">Monthly club payment</option>
                  <option value="other">Others</option>
                </select>
              </label>

              {category === "other" && (
                <label>
                  <span>Description (One-line reason)</span>
                  <textarea
                    placeholder="e.g. Stage prop contribution, picnic fee"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    disabled={isSubmitting}
                    rows={2}
                    maxLength={200}
                  />
                </label>
              )}

              <label>
                <span>Payment Receipt</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  required
                  disabled={isSubmitting}
                />
              </label>

              {statusMsg && (
                <p className={`form-status-alert ${statusType}`}>
                  {statusMsg}
                </p>
              )}

              <button className="admin-submit-btn" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Processing Submission..." : "Upload Payment Details"}
              </button>
            </form>
          )}
        </section>

        {/* Payment History Section */}
        <section className="payment-history-card">
          <div className="section-title-row">
            <h2>আমার পেমেন্ট ইতিহাস (My Payment History)</h2>
          </div>
          <div className="payment-history-list">
            {pastPayments.length > 0 ? (
              <div className="history-table-wrapper">
                <table className="payments-history-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Purpose / Category</th>
                      <th>Amount</th>
                      <th>Submitted On</th>
                      <th>Status</th>
                      <th>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastPayments.map((p) => (
                      <tr key={p.id}>
                        <td><strong>{formatMonthName(p.month)}</strong></td>
                        <td>
                          {p.category === "other"
                            ? `Other: ${p.description || ""}`
                            : "Monthly club payment"}
                        </td>
                        <td>₹{p.amount}</td>
                        <td>{p.submittedAt ? formatDateTime(p.submittedAt) : "Pending upload"}</td>
                        <td>
                          <span className={`status-badge status-${p.status}`}>
                            {p.status}
                          </span>
                        </td>
                        <td>
                          <a href={p.receiptUrl || p.screenshotUrl} target="_blank" rel="noopener noreferrer" className="view-receipt-link">
                            View Receipt
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted-text">No payment records found.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
