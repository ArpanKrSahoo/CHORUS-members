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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { formatDateTime } from "../utils/dateTime";

// Helper function to compress images using HTML5 Canvas
const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.3) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas to Blob conversion failed"));
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function PaymentsPage() {
  const { currentUser } = useOutletContext();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
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
    if (e.target.files && e.target.files[0]) {
      setScreenshotFile(e.target.files[0]);
    }
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

    if (!screenshotFile) {
      setStatusMsg("Please select a payment screenshot.");
      setStatusType("error");
      return;
    }

    if (!storage || !db) {
      setStatusMsg("Firebase configurations missing.");
      setStatusType("error");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Compress Image to Low Quality
      setStatusMsg("Compressing screenshot to low quality...");
      setStatusType("info");
      const compressedBlob = await compressImage(screenshotFile);

      // 2. Upload to Firebase Storage
      setStatusMsg("Uploading screenshot...");
      const fileExtension = screenshotFile.name.split(".").pop() || "jpg";
      const fileName = `${currentMonth}_${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, `screenshots/${currentUser.email.toLowerCase()}/${fileName}`);
      
      const uploadResult = await uploadBytes(storageRef, compressedBlob);
      const downloadUrl = await getDownloadURL(uploadResult.ref);

      // 3. Write Payment and sync user's Name in profile if not already set
      setStatusMsg("Saving payment transaction...");
      const email = currentUser.email.toLowerCase();
      const paymentRef = doc(collection(db, "payments"));
      const memberRef = doc(db, "members", email);

      await runTransaction(db, async (transaction) => {
        // Set payment record
        transaction.set(paymentRef, {
          email,
          name: name.trim(),
          month: currentMonth,
          amount: parseFloat(amount),
          screenshotUrl: downloadUrl,
          submittedAt: serverTimestamp(),
          status: "pending",
          category,
          description: category === "other" ? description.trim() : "",
        });

        // If member profile doesn't have a name yet, sync it
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
      setScreenshotFile(null);
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
                  placeholder="e.g. Arpan Kumar Sahoo"
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
                  placeholder="e.g. 500"
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
                <span>Payment Screenshot (Low Quality Storage Enabled)</span>
                <input
                  type="file"
                  accept="image/*"
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
                          <a href={p.screenshotUrl} target="_blank" rel="noopener noreferrer" className="view-receipt-link">
                            View Image
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
