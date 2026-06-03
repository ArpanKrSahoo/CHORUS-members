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
      <div className="login-input-group">
        <label htmlFor="login-email">Email Address</label>
        <input
          id="login-email"
          autoComplete="email"
          inputMode="email"
          name="email"
          placeholder="e.g. member@chorus.com"
          onChange={(event) => onEmailChange(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>

      <div className="login-input-group">
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          autoComplete="current-password"
          name="password"
          placeholder="••••••••"
          onChange={(event) => onPasswordChange(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>

      {errorMessage ? <div className="login-error-card">{errorMessage}</div> : null}

      <button className="login-submit-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Opening Stage..." : "Enter Stage"}
      </button>
    </form>
  );
}
