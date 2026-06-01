import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ASSETS } from "../constants/assets";
import { getAuthErrorMessage } from "../constants/authErrors";
import { useAuthSession } from "../hooks/useAuthSession";
import { auth } from "../lib/firebase";
import LoginForm from "../components/LoginForm";

const CLUB_NAME = "CHORUS";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { currentUser, isAuthReady } = useAuthSession();

  // Already logged in → go straight to home
  if (isAuthReady && currentUser) {
    return <Navigate to="/home" replace />;
  }

  async function handleLogin(event) {
    event.preventDefault();
    setErrorMessage("");

    if (!auth) {
      setErrorMessage("Firebase configuration is required before login.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword("");
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-board" aria-labelledby="page-heading">
        <aside className="brand-rail" aria-label={`${CLUB_NAME} club identity`}>
          {"CHORUS".split("").map((letter) => (
            <span key={letter}>{letter}</span>
          ))}
        </aside>

        <div className="hero-art" aria-hidden="true">
          <div className="poster-stack">
            <img className="poster-logo" src={ASSETS.logo} alt="" />
          </div>
        </div>

        <div className="login-panel">
          <div className="brand-block">
            <img className="panel-logo" src={ASSETS.logo} alt={`${CLUB_NAME} logo`} />
            <h1 id="page-heading">{CLUB_NAME}</h1>
          </div>
          <LoginForm
            email={email}
            errorMessage={errorMessage}
            isSubmitting={isSubmitting}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSubmit={handleLogin}
            password={password}
          />
        </div>
      </section>
    </main>
  );
}
