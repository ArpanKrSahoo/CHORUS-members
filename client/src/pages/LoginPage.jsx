import React, { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ASSETS } from "../constants/assets";
import { getAuthErrorMessage } from "../constants/authErrors";
import { useAuthSession } from "../hooks/useAuthSession";
import { auth } from "../lib/firebase";
import LoginForm from "../components/LoginForm";

const CLUB_NAME = "CHORUS";

const THEATRICAL_QUOTES = [
  {
    bengali: "রঙ্গমঞ্চই জীবন, আর আমরা সবাই অভিনেতা।",
    english: "The stage is life, and we are all but actors playing our parts.",
    source: "Traditional Theatrical Wisdom"
  },
  {
    bengali: "রঙ্গমঞ্চে প্রদীপ জ্বলুক, নাটকের আলোয় কাটুক আঁধার।",
    english: "Let the stage lamps light up; let the darkness be dispelled by the light of drama.",
    source: "Chorus Drama Club"
  },
  {
    bengali: "জগৎ জুড়ে নাট্যশালা, নিজের খোঁজে নাট্যকার।",
    english: "The entire world is a theater, and the playwright is in search of the soul.",
    source: "Bengali Folk Theater"
  },
  {
    bengali: "নাটক শুধু বিনোদন নয়, সমাজকে চেনার দর্পণ।",
    english: "Drama is not merely entertainment; it is a mirror reflecting society's truth.",
    source: "Modern Bengali Group Theatre"
  }
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { currentUser, isAuthReady } = useAuthSession();

  const quote = useMemo(() => {
    const index = Math.floor(Math.random() * THEATRICAL_QUOTES.length);
    return THEATRICAL_QUOTES[index];
  }, []);

  // Already logged in users go straight to home.
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
    <main className="login-app-shell">
      <div className="login-card-split">
        {/* Left Side: Login Form */}
        <div className="login-left-panel">
          <header className="login-brand-header">
            <img className="login-logo" src={ASSETS.logo} alt={`${CLUB_NAME} Logo`} />
            <span className="login-brand-name">{CLUB_NAME}</span>
          </header>

          <div className="login-form-container">
            <h1 className="login-welcome-title">রঙ্গমঞ্চে স্বাগত!</h1>
            <p className="login-welcome-subtitle">
              Welcome to the CHORUS member portal. Enter your credentials below to access rehearsals, notice boards, and production files.
            </p>

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

          <footer className="login-panel-footer">
            <p>Need assistance? Contact our team at <a href="mailto:support@chorus.com">support@chorus.com</a></p>
            <span className="copyright-tag">© {new Date().getFullYear()} CHORUS Drama Club. All rights reserved.</span>
          </footer>
        </div>

        {/* Right Side: Immersive Theatrical Visual */}
        <div 
          className="login-right-panel" 
          style={{ backgroundImage: `url(${ASSETS.stageBg})` }}
          aria-hidden="true"
        >
          <div className="glass-quote-card">
            <div className="glass-card-accent"></div>
            <div className="quote-icon" aria-hidden="true">✦</div>
            <blockquote className="theatrical-quote">
              <p className="quote-bn">“{quote.bengali}”</p>
              <p className="quote-en">{quote.english}</p>
              <cite className="quote-source">— {quote.source}</cite>
            </blockquote>
          </div>
        </div>
      </div>
    </main>
  );
}
