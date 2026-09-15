"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  requestPasswordReset,
  signInWithOAuth,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from "@/lib/session";

type Tab = "in" | "up";
type View = "form" | "forgot" | "check-email-signup" | "check-email-reset";

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("in");
  const [view, setView] = useState<View>("form");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [passConfirm, setPassConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const changeTab = (next: Tab) => {
    setTab(next);
    setView("form");
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tab === "in") {
      setSubmitting(true);
      const { error: signInError } = await signInWithPassword({
        email,
        password: pass,
      });
      setSubmitting(false);
      if (signInError) {
        setError(signInError);
        return;
      }
      router.push("/games");
      return;
    }

    if (pass !== passConfirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setSubmitting(true);
    const { error: signUpError } = await signUpWithPassword({
      username,
      email,
      password: pass,
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError);
      return;
    }
    setView("check-email-signup");
  };

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: resetError } = await requestPasswordReset(email);
    setSubmitting(false);
    if (resetError) {
      setError(resetError);
      return;
    }
    setView("check-email-reset");
  };

  const playAsGuest = async () => {
    await signOut();
    router.push("/games");
  };

  const oauth = async (provider: "google" | "github") => {
    setError(null);
    const { error: oauthError } = await signInWithOAuth(provider);
    if (oauthError) {
      setError(oauthError);
    }
  };

  if (view === "check-email-signup" || view === "check-email-reset") {
    return (
      <div className="av-auth-wrap fade-in">
        <div className="auth-card">
          <div className="auth-header">
            <div className="mark"></div>
            <h2 className="neon-cyan">ARCADE VAULT</h2>
          </div>
          <div
            style={{
              textAlign: "center",
              padding: "24px 0",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {view === "check-email-signup"
              ? "Revisa tu correo y confirma tu cuenta para poder iniciar sesión."
              : "Revisa tu correo: te enviamos un enlace para fijar una nueva contraseña."}
          </div>
          <button
            className="btn ghost"
            style={{ width: "100%" }}
            onClick={() => {
              setView("form");
              setTab("in");
            }}
          >
            VOLVER
          </button>
        </div>
      </div>
    );
  }

  if (view === "forgot") {
    return (
      <div className="av-auth-wrap fade-in">
        <div className="auth-card">
          <div className="auth-header">
            <div className="mark"></div>
            <h2 className="neon-cyan">ARCADE VAULT</h2>
          </div>
          <form onSubmit={submitForgot}>
            <div className="field">
              <label>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jugador@vault.gg"
              />
            </div>
            {error && (
              <div
                style={{ color: "var(--magenta)", fontSize: 12, marginTop: 4 }}
              >
                {error}
              </div>
            )}
            <button
              className="btn lg"
              type="submit"
              disabled={submitting}
              style={{ width: "100%", marginTop: 8 }}
            >
              ENVIAR ENLACE
            </button>
          </form>
          <button
            className="btn ghost"
            style={{ width: "100%", marginTop: 10 }}
            onClick={() => setView("form")}
          >
            VOLVER
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={tab === "in" ? "on" : ""}
            onClick={() => changeTab("in")}
          >
            INICIAR SESIÓN
          </button>
          <button
            className={tab === "up" ? "on" : ""}
            onClick={() => changeTab("up")}
          >
            CREAR CUENTA
          </button>
        </div>

        <form onSubmit={submit}>
          {tab === "up" && (
            <div className="field slide-in">
              <label>Usuario</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="px_kai"
              />
            </div>
          )}
          <div className="field">
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <div className="field-row">
              <input
                type={showPass ? "text" : "password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="field-toggle"
                onClick={() => setShowPass((v) => !v)}
                aria-label={
                  showPass ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showPass ? "🙈" : "👁"}
              </button>
            </div>
          </div>
          {tab === "up" && (
            <div className="field slide-in">
              <label>Confirmar contraseña</label>
              <div className="field-row">
                <input
                  type={showPassConfirm ? "text" : "password"}
                  value={passConfirm}
                  onChange={(e) => setPassConfirm(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="field-toggle"
                  onClick={() => setShowPassConfirm((v) => !v)}
                  aria-label={
                    showPassConfirm
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                >
                  {showPassConfirm ? "🙈" : "👁"}
                </button>
              </div>
            </div>
          )}

          {tab === "in" && (
            <div style={{ textAlign: "right", marginTop: 4 }}>
              <button
                type="button"
                className="btn ghost"
                style={{
                  padding: 0,
                  border: "none",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                }}
                onClick={() => {
                  setError(null);
                  setView("forgot");
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          {error && (
            <div
              style={{ color: "var(--magenta)", fontSize: 12, marginTop: 8 }}
            >
              {error}
            </div>
          )}

          <button
            className="btn lg"
            type="submit"
            disabled={submitting}
            style={{ width: "100%", marginTop: 8 }}
          >
            {tab === "in" ? "ENTRAR AL VAULT" : "CREAR Y JUGAR"}
          </button>
        </form>

        <button
          className="btn ghost"
          style={{ width: "100%", marginTop: 10 }}
          onClick={playAsGuest}
        >
          JUGAR COMO INVITADO
        </button>

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button
            className="btn ghost"
            type="button"
            onClick={() => oauth("google")}
          >
            ◆ GOOGLE
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => oauth("github")}
          >
            ▣ GITHUB
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
