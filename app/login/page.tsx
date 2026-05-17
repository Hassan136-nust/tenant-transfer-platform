"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useDemoSession } from "../components/demo-session-provider";

type Step = "credentials" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useDemoSession();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Step 1 — verify password, then send OTP
  const handleCredentials = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validate password first
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const loginData = await loginRes.json();

      if (!loginRes.ok || !loginData.success) {
        setError(loginData.error || "Invalid credentials.");
        return;
      }

      // Password valid — send OTP to email
      const otpRes = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const otpData = await otpRes.json();

      if (!otpRes.ok || !otpData.success) {
        setError(otpData.error || "Failed to send OTP.");
        return;
      }

      setNotice(`A 6-digit verification code was sent to ${email.trim()}.`);
      setStep("otp");
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — verify OTP and get session
  const handleOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: otp.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Invalid or expired code.");
        return;
      }

      signIn(data.email, data.orgId, data.orgName);
      router.push("/dashboard");
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <section className="auth-card">
        <p className="badge">🔐 Secure Gateway</p>

        {step === "credentials" ? (
          <>
            <h1 className="headline" style={{ fontWeight: 700 }}>Workspace Login</h1>
            <p className="subhead">Enter your organizational credentials to receive a verification code.</p>

            {error && (
              <div className="notice" style={{ borderColor: "#ef4444", background: "rgba(239,68,68,0.1)", marginTop: "12px" }}>
                <p style={{ color: "#fca5a5", fontSize: "14px" }}>❌ {error}</p>
              </div>
            )}

            <form className="form-grid" onSubmit={handleCredentials} style={{ marginTop: "20px" }}>
              <div>
                <label htmlFor="email">Organizational Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={process.env.NEXT_PUBLIC_ALPHA_EMAIL || "alpha@example.com"}
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
              <button className="btn" type="submit" disabled={loading} style={{ marginTop: "4px" }}>
                {loading ? "Verifying..." : "Continue →"}
              </button>
            </form>

            <div style={{ marginTop: "24px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px", textAlign: "center" }}>
              <p style={{ color: "var(--muted)", fontSize: "12.5px", marginBottom: "12px" }}>
                Preparing a customized tenant environment?
              </p>
              <a
                href="/signup"
                className="btn btn-ghost"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  textDecoration: "none",
                  color: "#ffffff",
                  background: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  padding: "12px"
                }}
              >
                🏢 Create New Workspace Portal →
              </a>
            </div>
          </>
        ) : (
          <>
            <h1 className="headline" style={{ fontWeight: 700 }}>Enter Verification Code</h1>
            <p className="subhead">Check your email for a 6-digit OTP code.</p>

            {notice && (
              <div className="notice" style={{ borderColor: "var(--primary-2)", background: "rgba(40,217,188,0.05)", marginTop: "12px" }}>
                <p style={{ color: "var(--primary-2)", fontSize: "14px" }}>✓ {notice}</p>
              </div>
            )}
            {error && (
              <div className="notice" style={{ borderColor: "#ef4444", background: "rgba(239,68,68,0.1)", marginTop: "12px" }}>
                <p style={{ color: "#fca5a5", fontSize: "14px" }}>❌ {error}</p>
              </div>
            )}

            <form className="form-grid" onSubmit={handleOtp} style={{ marginTop: "20px" }}>
              <div>
                <label htmlFor="otp">6-Digit Code</label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="0 0 0 0 0 0"
                  required
                  disabled={loading}
                  style={{ textAlign: "center", letterSpacing: "0.4em", fontSize: "20px", fontWeight: "bold" }}
                />
                <span style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px", display: "block" }}>
                  🔑 Use master code <code>777777</code> to bypass email during testing.
                </span>
              </div>
              <button className="btn" type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Enter Workspace"}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => { setStep("credentials"); setError(""); setNotice(""); setOtp(""); }}
                disabled={loading}
                style={{ marginTop: "4px" }}
              >
                ← Back
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
