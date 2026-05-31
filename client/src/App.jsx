import React, { useEffect, useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ASSETS } from "./constants/assets";
import { getAuthErrorMessage } from "./constants/authErrors";
import { useAuthSession } from "./hooks/useAuthSession";
import { auth } from "./lib/firebase";
import "./styles.css";

const CLUB_NAME = "CHORUS";
const SPLASH_DURATION_MS = 2500;
const INTRO_DURATION_MS = 1800;

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [screenStep, setScreenStep] = useState("loading");
  const { currentUser, isAuthReady } = useAuthSession();

  useEffect(() => {
    const splashTimer = window.setTimeout(() => {
      setScreenStep("intro");
    }, SPLASH_DURATION_MS);

    const introTimer = window.setTimeout(() => {
      setScreenStep("login");
    }, SPLASH_DURATION_MS + INTRO_DURATION_MS);

    return () => {
      window.clearTimeout(splashTimer);
      window.clearTimeout(introTimer);
    };
  }, []);

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

  async function handleLogout() {
    setErrorMessage("");

    if (auth) {
      await signOut(auth);
    }
  }

  if (screenStep === "loading") {
    return <SplashScreen />;
  }

  if (screenStep === "intro") {
    return <BrandIntro />;
  }

  if (!isAuthReady) {
    return <SessionLoading />;
  }

  return (
    <main className="app-shell">
      <section className="hero-board" aria-labelledby="page-heading">
        <aside className="brand-rail" aria-label={`${CLUB_NAME} club identity`}>
          <span>C</span>
          <span>H</span>
          <span>O</span>
          <span>R</span>
          <span>U</span>
          <span>S</span>
        </aside>

        <div className="hero-art" aria-hidden="true">
          <div className="poster-stack">
            <img className="poster-logo" src={ASSETS.logo} alt="" />
          </div>
        </div>

        <div className="login-panel">
          {currentUser ? (
            <HomePanel onLogout={handleLogout} />
          ) : (
            <>
              <div className="brand-block">
                <img
                  className="panel-logo"
                  src={ASSETS.logo}
                  alt={`${CLUB_NAME} logo`}
                />
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
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function SplashScreen() {
  const chorusRows = Array.from({ length: 5 }, (_, index) => index);

  return (
    <main className="splash-shell" aria-label="Loading CHORUS">
      <section className="splash-card">
        <div className="chorus-marquee" aria-hidden="true">
          {chorusRows.map((row) => (
            <p key={row}>CHORUS CHORUS CHORUS</p>
          ))}
        </div>
        <div className="progress-track" aria-hidden="true">
          <span />
        </div>
      </section>
    </main>
  );
}

function BrandIntro() {
  return (
    <main className="intro-shell" aria-label={`${CLUB_NAME} introduction`}>
      <section className="intro-card">
        <img className="intro-logo" src={ASSETS.logo} alt={`${CLUB_NAME} logo`} />
        <div className="intro-title-group">
          <h1>{CLUB_NAME}</h1>
          <div className="intro-dots" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="progress-track" aria-hidden="true">
          <span />
        </div>
      </section>
    </main>
  );
}

function SessionLoading() {
  return (
    <main className="app-shell">
      <section className="loading-card">
        <img className="loading-logo" src={ASSETS.logo} alt={`${CLUB_NAME} logo`} />
        <h1>{CLUB_NAME}</h1>
      </section>
    </main>
  );
}

function HomePanel({ onLogout }) {
  const homeItems = [
    "Live Productions",
    "Rehearsal Dates",
    "Notices",
  ];

  return (
    <section className="home-panel" aria-labelledby="page-heading">
      <button className="icon-button" type="button" onClick={onLogout} aria-label="Sign out">
        X
      </button>
      <div className="home-header">
        <img className="home-logo" src={ASSETS.logo} alt={`${CLUB_NAME} logo`} />
        <h1 id="page-heading">CHORUS Production</h1>
        <p>At a Glance</p>
      </div>
      <div className="home-grid">
        {homeItems.map((item) => (
          <article className="home-tile" key={item}>
            <span aria-hidden="true" />
            <h2>{item}</h2>
          </article>
        ))}
      </div>
    </section>
  );
}

function LoginForm({
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
