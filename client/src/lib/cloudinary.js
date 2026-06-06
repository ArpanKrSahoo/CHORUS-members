const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_UPLOAD_FOLDER = import.meta.env.VITE_CLOUDINARY_UPLOAD_FOLDER || "chorus/payments";

const CLOUDINARY_UPLOAD_URL = CLOUDINARY_CLOUD_NAME
  ? `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`
  : "";

export const cloudinaryConfigStatus = {
  isConfigured: Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET),
  missingKeys: [
    !CLOUDINARY_CLOUD_NAME ? "VITE_CLOUDINARY_CLOUD_NAME" : "",
    !CLOUDINARY_UPLOAD_PRESET ? "VITE_CLOUDINARY_UPLOAD_PRESET" : "",
  ].filter(Boolean),
};

export const ALLOWED_PAYMENT_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const MAX_PAYMENT_RECEIPT_BYTES = 8 * 1024 * 1024;

export function validatePaymentReceipt(file) {
  if (!file) return "Please select a payment receipt file.";
  if (!ALLOWED_PAYMENT_RECEIPT_TYPES.includes(file.type)) {
    return "Upload a JPG, PNG, WEBP, or PDF receipt.";
  }
  if (file.size > MAX_PAYMENT_RECEIPT_BYTES) {
    return "Receipt file must be 8 MB or smaller.";
  }
  return "";
}

export async function uploadPaymentReceipt(file, { email, month }) {
  const validationError = validatePaymentReceipt(file);
  if (validationError) {
    throw new Error(validationError);
  }

  if (!cloudinaryConfigStatus.isConfigured) {
    throw new Error(`Cloudinary is missing: ${cloudinaryConfigStatus.missingKeys.join(", ")}`);
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", CLOUDINARY_UPLOAD_FOLDER);
  formData.append("context", `email=${email}|month=${month}|source=chorus-payments`);

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error?.message || "Cloudinary upload failed.");
  }

  return {
    bytes: result.bytes ?? file.size,
    format: result.format || file.type,
    originalFilename: result.original_filename || file.name,
    publicId: result.public_id,
    resourceType: result.resource_type || "auto",
    secureUrl: result.secure_url,
  };
}
