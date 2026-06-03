export const PREDEFINED_ADMIN_EMAILS = [
  "kunal.mitra2024@chorus.com",
  "arpan.kumarsahoo2024@chorus.com",
];

export function isPredefinedAdminEmail(email) {
  if (!email) return false;

  return PREDEFINED_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
