import React from "react";

export default function LoginForm({
  email,
  errorMessage,
  isSubmitting,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  password,
}) {
  return (
    <form className="login-form" onSubmit={onSubmit}>
      <label>
        <span>Username</span>
        <input
          autoComplete="email"
          inputMode="email"
          name="email"
          onChange={(event) => onEmailChange(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>

      <label>
        <span>Password</span>
        <input
          autoComplete="current-password"
          name="password"
          onChange={(event) => onPasswordChange(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>

      {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
