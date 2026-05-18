"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useEffect } from "react";
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
  const [isGoogleVerified, setIsGoogleVerified] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Live zero-latency check for email registration status
  useEffect(() => {
    if (!email.trim() || !email.includes("@")) {
      setError("");
      return;
    }

    // Fast path: 0ms client-side check for pre-seeded static administrator profiles
    const staticEmails = [
      (process.env.NEXT_PUBLIC_ALPHA_EMAIL?.toLowerCase() || ""),
      (process.env.NEXT_PUBLIC_BETA_EMAIL?.toLowerCase() || "")
    ].filter(Boolean);
    if (staticEmails.includes(email.toLowerCase().trim())) {
      setError("");
      return;
    }

    const controller = new AbortController();
    const delayDebounce = setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email.trim())}`, {
          signal: controller.signal
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (!data.exists) {
            setError("Email does not exist. Please sign up.");
          } else {
            setError("");
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Failed email existence lookup:", err);
        }
      } finally {
        setCheckingEmail(false);
      }
    }, 280);

    return () => {
      controller.abort();
      clearTimeout(delayDebounce);
    };
  }, [email]);

  // Decode standard ID token claims from Google GSI
  const decodeJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("[gsi] JWT Decoding error:", e);
      return null;
    }
  };

  // Pre-load standard Google Identity Services script
  useEffect(() => {
    let active = true;
    let buttonRenderInterval: any;

    const initializeGoogle = () => {
      if (!active) return;

      if ((window as any).google) {
        const client_id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
        if (!client_id) {
          console.warn("[gsi] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured in .env.local yet.");
          return;
        }
        (window as any).google.accounts.id.initialize({
          client_id,
          callback: (response: any) => {
            const decoded = decodeJwt(response.credential);
            if (decoded && decoded.email) {
              setEmail(decoded.email);
              setIsGoogleVerified(true);
              setError("");
              setNotice(`✓ Google account verified: ${decoded.email}. Enter your password below to proceed.`);
            }
          }
        });

        // Robust DOM polling interval to guarantee visual button render (resolves single-page navigation delays!)
        let attempts = 0;
        buttonRenderInterval = setInterval(() => {
          attempts++;
          const btnElement = document.getElementById("google-signin-btn");
          if (btnElement) {
            clearInterval(buttonRenderInterval);
            (window as any).google.accounts.id.renderButton(
              btnElement,
              {
                theme: "filled_blue",
                size: "large",
                width: 340,
                shape: "pill"
              }
            );
            console.log("[gsi] Google login button successfully mounted in attempts:", attempts);
          } else if (attempts > 30) {
            clearInterval(buttonRenderInterval);
            console.warn("[gsi] Max DOM polling attempts reached. Sign-in button container not resolvable.");
          }
        }, 50);
      }
    };

    // Check if GSI script is already injected on document (due to Next.js route transitions)
    const existingScript = document.querySelector("script[src='https://accounts.google.com/gsi/client']");
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.head.appendChild(script);
    } else {
      // Script is already in document head (SSO session cached) - render button synchronously
      initializeGoogle();
    }

    return () => {
      active = false;
      if (buttonRenderInterval) clearInterval(buttonRenderInterval);
    };
  }, []);

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
        body: JSON.stringify({ email: email.trim(), flow: "login" }),
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
                <p style={{ color: "#fca5a5", fontSize: "14px", margin: 0 }}>❌ {error}</p>
              </div>
            )}

            {notice && (
              <div className="notice" style={{ borderColor: "var(--primary-2)", background: "rgba(40,217,188,0.05)", marginTop: "12px" }}>
                <p style={{ color: "var(--primary-2)", fontSize: "14px", margin: 0 }}>✓ {notice}</p>
              </div>
            )}

            <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              {/* Real Google Official Button container */}
              <div id="google-signin-btn" style={{ minHeight: "44px" }}></div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "18px 0 10px 0", width: "100%" }}>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
                <span style={{ color: "var(--muted)", fontSize: "11px" }}>or credentials</span>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
              </div>
            </div>

            <form className="form-grid" onSubmit={handleCredentials}>
              <div>
                <label htmlFor="email">Organizational Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={process.env.NEXT_PUBLIC_ALPHA_EMAIL || "alpha@example.com"}
                  required
                  disabled={loading || isGoogleVerified}
                />
                {isGoogleVerified && (
                  <span style={{ fontSize: "11.5px", color: "var(--primary-2)", marginTop: "6px", display: "block", fontWeight: 600 }}>
                    ✓ Securing: verified securely via Google SSO.
                  </span>
                )}
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
              <button className="btn" type="submit" disabled={loading || checkingEmail || !!error} style={{ marginTop: "4px" }}>
                {loading ? "Verifying..." : checkingEmail ? "Checking..." : "Continue →"}
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
