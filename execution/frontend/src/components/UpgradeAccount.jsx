// execution/frontend/src/components/UpgradeAccount.jsx
// Lets a guest (anonymous auth) user turn their session into a permanent account.
// Uses linkWithCredential / linkWithPopup so the SAME uid keeps its data - this is
// not a sign-up followed by a data copy, it's the existing anonymous identity
// gaining a real login method.

import { useState } from "react";
import {
  EmailAuthProvider,
  linkWithCredential,
  linkWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useTheme } from "../theme";

export default function UpgradeAccount({ onClose, onUpgraded }) {
  const { T } = useTheme();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const friendlyError = (e) => {
    if (e.code === "auth/email-already-in-use" || e.code === "auth/credential-already-in-use") {
      return "That email already has a Khaaya account. Sign out and sign in there instead — this guest data can't be attached to an existing account.";
    }
    if (e.code === "auth/weak-password") return "Password must be at least 6 characters.";
    if (e.code === "auth/invalid-email") return "Enter a valid email address.";
    if (e.code === "auth/popup-closed-by-user") return "";
    return (e.message || "").replace("Firebase: ", "").replace(/\(auth.*\)/, "").trim();
  };

  const finishUpgrade = async () => {
    // Linking updates auth.currentUser in place, but reload() guarantees the
    // isAnonymous / email fields are current before the parent re-reads them.
    await auth.currentUser.reload();
    onUpgraded();
  };

  const handleEmail = async () => {
    if (!email || !password) { setError("Enter email and password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    try {
      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(auth.currentUser, credential);
      await finishUpgrade();
    } catch (e) {
      setError(friendlyError(e));
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true); setError("");
    try {
      await linkWithPopup(auth.currentUser, googleProvider);
      await finishUpgrade();
    } catch (e) {
      const msg = friendlyError(e);
      if (msg) setError(msg);
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: T.bg, zIndex: 200,
      overflowY: "auto", fontFamily: "system-ui, -apple-system, sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <button
        onClick={onClose}
        style={{
          position: "fixed", top: 16, right: 16,
          background: T.inputBg, border: "none", borderRadius: 10, width: 36, height: 36,
          color: T.textSec, cursor: "pointer", fontSize: 18,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        ✕
      </button>

      <div style={{ width: "100%", maxWidth: 400, background: T.card, borderRadius: 24, padding: "36px 28px", boxShadow: T.cardShadow }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 3, color: T.accent, marginBottom: 8 }}>
            SAVE YOUR PROGRESS
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.text, letterSpacing: -0.5 }}>
            Create a real account
          </h1>
          <div style={{ marginTop: 10, fontSize: 14, color: T.textSec, lineHeight: 1.5 }}>
            Everything you've logged stays exactly as it is — you're just adding
            a way to sign back in.
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleEmail(); }}>
          <input
            style={{
              width: "100%", background: T.inputBg, border: `1px solid ${T.border}`,
              borderRadius: 12, padding: "14px 16px", fontSize: 17, color: T.text,
              marginBottom: 12, boxSizing: "border-box", outline: "none",
            }}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
          />
          <input
            style={{
              width: "100%", background: T.inputBg, border: `1px solid ${T.border}`,
              borderRadius: 12, padding: "14px 16px", fontSize: 17, color: T.text,
              marginBottom: 12, boxSizing: "border-box", outline: "none",
            }}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
          />

          {error && (
            <div style={{ color: "#FF3B30", fontSize: 13, fontWeight: 500, marginBottom: 12, textAlign: "center" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", background: T.btnPrimary, border: "none", borderRadius: 14,
              padding: 16, color: T.btnPrimaryText, fontWeight: 700, fontSize: 17,
              cursor: "pointer", marginBottom: 14,
            }}
          >
            {loading ? "..." : "Save My Progress"}
          </button>
        </form>

        <div style={{
          textAlign: "center", color: T.textSec, fontSize: 13, fontWeight: 500,
          marginBottom: 14, display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ flex: 1, height: 1, background: T.divider }} />
          or
          <div style={{ flex: 1, height: 1, background: T.divider }} />
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: "100%", background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
            padding: 14, color: T.text, fontWeight: 600, fontSize: 15, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
