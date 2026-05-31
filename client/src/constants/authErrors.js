export const AUTH_ERROR_MESSAGES = {
  "auth/invalid-credential": "The email or password is incorrect.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-password": "Enter your password.",
  "auth/user-disabled": "This account has been disabled.",
};

export function getAuthErrorMessage(error) {
  return AUTH_ERROR_MESSAGES[error.code] ?? "Unable to log in. Please try again.";
}
