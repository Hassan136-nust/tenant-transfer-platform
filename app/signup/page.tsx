"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useDemoSession } from "../components/demo-session-provider";

type Step = "credentials" | "otp";

export default function SignupPage() {
    const router = useRouter();
    const { signIn } = useDemoSession();

    const [step, setStep] = useState<Step>("credentials");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [orgName, setOrgName] = useState("");
    const [otp, setOtp] = useState("");
    const [seedData, setSeedData] = useState(true); // Default to checked
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    // Step 1 — validate fields & send OTP code
    const handleRequestOtp = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (!email.trim() || !password.trim() || !orgName.trim()) {
                setError("All credentials are required.");
                setLoading(false);
                return;
            }

            // Pre-validate organization sluginess
            const orgId = orgName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)+/g, "");

            if (!orgId) {
                setError("Organization name must contain letters or numbers.");
                setLoading(false);
                return;
            }

            // Generate & send OTP
            const otpRes = await fetch("/api/auth/otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim() }),
            });
            const otpData = await otpRes.json();

            if (!otpRes.ok || !otpData.success) {
                setError(otpData.error || "Failed to initiate registration code.");
                return;
            }

            setNotice(otpData.message || `Verification code has been dispatched to ${email.trim()}.`);
            setStep("otp");
        } catch {
            setError("Failed to connect to the authentication server.");
        } finally {
            setLoading(false);
        }
    };

    // Step 2 — Verify OTP & complete dynamic Org signup with optional 500 rows
    const handleCompleteRegister = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                    orgName: orgName.trim(),
                    otpCode: otp.trim(),
                    seedData,
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.error || "Signup registration failed. Check inputs.");
                return;
            }

            // Automatically sign in the client-side context & go to dashboard
            signIn(data.email, data.orgId, data.orgName);
            router.push("/dashboard");
        } catch {
            setError("Failed to compile registration. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrap">
            <section className="auth-card">
                <p className="badge">🏢 Workspace Creation</p>

                {step === "credentials" ? (
                    <>
                        <h1 className="headline" style={{ fontWeight: 700 }}>Deploy Workspace</h1>
                        <p className="subhead">Create a secure, isolated multi-tenant organization ledger.</p>

                        {error && (
                            <div className="notice" style={{ borderColor: "#ef4444", background: "rgba(239,68,68,0.1)", marginTop: "12px" }}>
                                <p style={{ color: "#fca5a5", fontSize: "14px" }}>❌ {error}</p>
                            </div>
                        )}

                        <form className="form-grid" onSubmit={handleRequestOtp} style={{ marginTop: "20px" }}>
                            <div>
                                <label htmlFor="orgName">Organization / Tenant Name</label>
                                <input
                                    id="orgName"
                                    type="text"
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    placeholder="e.g. Acme Corp"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div>
                                <label htmlFor="email">Workspace Admin Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@acme.com"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div>
                                <label htmlFor="password">Workspace Admin Password</label>
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
                                {loading ? "Preparing Workspace..." : "Get Verification Code →"}
                            </button>
                        </form>

                        <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "16px", textAlign: "center" }}>
                            Already registered? <a href="/login" style={{ color: "var(--primary-2)" }}>Log in here</a>
                        </p>
                    </>
                ) : (
                    <>
                        <h1 className="headline" style={{ fontWeight: 700 }}>Enter Verification Code</h1>
                        <p className="subhead">We need to verify your email before establishing workspace isolation.</p>

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

                        <form className="form-grid" onSubmit={handleCompleteRegister} style={{ marginTop: "20px" }}>
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
                                    🔑 Use master code <code>777777</code> to bypass email verification in development.
                                </span>
                            </div>

                            <div
                                style={{
                                    background: "rgba(20, 184, 166, 0.05)",
                                    border: `1px solid ${seedData ? "rgba(20, 184, 166, 0.35)" : "var(--stroke)"}`,
                                    borderRadius: "14px",
                                    padding: "16px",
                                    marginTop: "12px",
                                    marginBottom: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "14px",
                                    cursor: "pointer",
                                    transition: "all 0.25s ease",
                                    boxShadow: seedData ? "0 0 20px rgba(20, 184, 166, 0.08)" : "none"
                                }}
                                onClick={() => !loading && setSeedData(!seedData)}
                            >
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, textAlign: "left" }}>
                                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
                                        🚀 Pre-Populate Demo Records
                                    </span>
                                    <span style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.4" }}>
                                        Automatically seed your new tenant space with 500 segregated mock enterprise records to instantly test row manipulations and cross-org ledger migrations.
                                    </span>
                                </div>
                                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                    <input
                                        id="seedData"
                                        type="checkbox"
                                        checked={seedData}
                                        onClick={(e) => e.stopPropagation()} // Prevent double trigger
                                        onChange={(e) => setSeedData(e.target.checked)}
                                        disabled={loading}
                                        style={{
                                            width: "22px",
                                            height: "22px",
                                            accentColor: "var(--primary-2)",
                                            cursor: "pointer"
                                        }}
                                    />
                                </div>
                            </div>

                            <button className="btn" type="submit" disabled={loading} style={{ marginTop: "4px" }}>
                                {loading ? "Seeding & Creating Workspace..." : "Verify & Launch Workspace"}
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
