"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useEffect } from "react";
import { useDemoSession } from "../components/demo-session-provider";
import { TestingInstructions } from "../components/testing-instructions";


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

    const [isGoogleVerified, setIsGoogleVerified] = useState(false);
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [showSeedingWarning, setShowSeedingWarning] = useState(false);
    const [showSeedingWarningApproved, setShowSeedingWarningApproved] = useState(false);

    // Live zero-latency check to prevent registering duplicates
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
            setError("Email is already registered. Please login instead.");
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
                    if (data.exists) {
                        setError("Email is already registered. Please login instead.");
                    } else {
                        setError("");
                    }
                }
            } catch (err: any) {
                if (err.name !== "AbortError") {
                    console.error("Failed signup email availability check:", err);
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
                            setNotice(`✓ Google account verified: ${decoded.email}. Enter custom Organization Name and Password below.`);
                        }
                    }
                });

                // Robust DOM polling interval to guarantee visual button render (resolves single-page navigation delays!)
                let attempts = 0;
                buttonRenderInterval = setInterval(() => {
                    attempts++;
                    const btnElement = document.getElementById("google-signup-btn");
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
                        console.log("[gsi] Google signup button successfully mounted in attempts:", attempts);
                    } else if (attempts > 30) {
                        clearInterval(buttonRenderInterval);
                        console.warn("[gsi] Max DOM polling attempts reached. Sign-up button container not resolvable.");
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
                body: JSON.stringify({ email: email.trim(), flow: "signup" }),
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

        if (seedData && !showSeedingWarningApproved) {
            setShowSeedingWarning(true);
            return;
        }

        await executeRegistration(seedData);
    };

    const executeRegistration = async (actualSeeding: boolean) => {
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
                    seedData: actualSeeding,
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
            <div style={{ width: "min(560px, 100%)", display: "flex", flexDirection: "column", gap: "16px" }}>
                <section className="auth-card" style={{ width: "100%" }}>


                    <p className="badge">🏢 Workspace Creation</p>

                    {step === "credentials" ? (
                        <>
                            <h1 className="headline" style={{ fontWeight: 700 }}>Deploy Workspace</h1>
                            <p className="subhead">Create a secure, isolated multi-tenant organization ledger.</p>

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
                                {/* Real Google Signup Button container */}
                                <div id="google-signup-btn" style={{ minHeight: "44px" }}></div>

                                <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "18px 0 10px 0", width: "100%" }}>
                                    <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
                                    <span style={{ color: "var(--muted)", fontSize: "11px" }}>or credentials</span>
                                    <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
                                </div>
                            </div>

                            <form className="form-grid" onSubmit={handleRequestOtp}>
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
                                        disabled={loading || isGoogleVerified}
                                    />
                                    {isGoogleVerified && (
                                        <span style={{ fontSize: "11.5px", color: "var(--primary-2)", marginTop: "6px", display: "block", fontWeight: 600 }}>
                                            ✓ Securing: verified securely via Google SSO.
                                        </span>
                                    )}
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
                                <button className="btn" type="submit" disabled={loading || checkingEmail || !!error} style={{ marginTop: "4px" }}>
                                    {loading ? "Preparing Workspace..." : checkingEmail ? "Checking..." : "Get Verification Code →"}
                                </button>
                            </form>

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

                                </div>

                                <div
                                    style={{
                                        background: seedData ? "rgba(244, 63, 94, 0.06)" : "rgba(255, 255, 255, 0.01)",
                                        border: `1px solid ${seedData ? "rgba(244, 63, 94, 0.38)" : "var(--stroke)"}`,
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
                                        boxShadow: seedData ? "0 0 24px rgba(244, 63, 94, 0.12)" : "none"
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
                                        <span style={{ fontSize: "11px", color: "#fca5a5", background: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "6px", padding: "4px 8px", marginTop: "6px", display: "inline-block", fontWeight: "600", width: "fit-content" }}>
                                            ⚠️ Warning: Keep unseeded for your 2nd account setup!
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
                                                accentColor: "#f43f5e",
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
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    width: "100%",
                    marginTop: "16px"
                }}>
                    <button
                        type="button"
                        onClick={() => setShowInstructions(true)}
                        style={{
                            flex: 1,
                            background: "rgba(255, 255, 255, 0.03)",
                            backdropFilter: "blur(12px)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: "14px",
                            padding: "14px 20px",
                            color: "#ffffff",
                            fontSize: "13.5px",
                            fontWeight: "700",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            cursor: "pointer",
                            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
                            transition: "all 0.25s ease"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(40, 217, 188, 0.06)";
                            e.currentTarget.style.borderColor = "var(--primary-2)";
                            e.currentTarget.style.transform = "translateY(-1.5px)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                            e.currentTarget.style.transform = "translateY(0)";
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary-2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                        📋 Testing Guide
                    </button>

                    <a
                        href="/login"
                        style={{
                            flex: 1,
                            background: "rgba(255, 255, 255, 0.03)",
                            backdropFilter: "blur(12px)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: "14px",
                            padding: "14px 20px",
                            color: "#ffffff",
                            fontSize: "13.5px",
                            fontWeight: "700",
                            height: "48.5px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            cursor: "pointer",
                            textDecoration: "none",
                            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
                            transition: "all 0.25s ease"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
                            e.currentTarget.style.transform = "translateY(-1.5px)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                            e.currentTarget.style.transform = "translateY(0)";
                        }}
                    >
                        🔐 Login to Workspace
                    </a>
                </div>
                <TestingInstructions isOpen={showInstructions} onClose={() => setShowInstructions(false)} />
                {showSeedingWarning && (
                    <div style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0, 0, 0, 0.7)",
                        backdropFilter: "blur(12px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10000,
                        padding: "20px"
                    }}>
                        <div style={{
                            width: "100%",
                            maxWidth: "460px",
                            background: "linear-gradient(135deg, rgba(30, 20, 25, 0.9) 0%, rgba(15, 10, 12, 0.98) 100%)",
                            border: "1px solid rgba(244, 63, 94, 0.25)",
                            borderRadius: "20px",
                            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(244, 63, 94, 0.1)",
                            padding: "28px",
                            textAlign: "center",
                            color: "#ffffff"
                        }}>
                            <div style={{
                                width: "56px",
                                height: "56px",
                                borderRadius: "50%",
                                background: "rgba(244, 63, 94, 0.12)",
                                border: "1px solid rgba(244, 63, 94, 0.3)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 16px auto"
                            }}>
                                <span style={{ fontSize: "24px" }}>⚠️</span>
                            </div>
                            <h3 style={{ fontSize: "18px", fontWeight: "750", margin: "0 0 10px 0", color: "#ffffff" }}>
                                Enterprise Seeding Notice
                            </h3>
                            <p style={{ fontSize: "13.5px", color: "var(--muted)", lineHeight: "1.5", margin: "0 0 24px 0" }}>
                                You are about to launch a workspace pre-seeded with <strong>500 segregated mock records</strong>.
                                <br /><br />
                                If this is your <strong>second organization</strong> setup, please launch clean (0 rows) to verify target sync transfers properly!
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <button
                                    onClick={async () => {
                                        setShowSeedingWarning(false);
                                        setShowSeedingWarningApproved(true);
                                        await executeRegistration(true);
                                    }}
                                    className="btn"
                                    style={{
                                        width: "100%",
                                        height: "44px",
                                        fontSize: "13.5px",
                                        fontWeight: "700",
                                        border: "1px solid rgba(244, 63, 94, 0.4)",
                                        background: "rgba(244, 63, 94, 0.08)",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "rgba(244, 63, 94, 0.16)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "rgba(244, 63, 94, 0.08)";
                                    }}
                                >
                                    ⚡ Seed Anyway (Proceed)
                                </button>
                                <button
                                    onClick={async () => {
                                        setShowSeedingWarning(false);
                                        setSeedData(false);
                                        await executeRegistration(false);
                                    }}
                                    className="btn"
                                    style={{
                                        width: "100%",
                                        height: "44px",
                                        fontSize: "13.5px",
                                        fontWeight: "700",
                                        border: "1px solid rgba(255, 255, 255, 0.12)",
                                        background: "rgba(255, 255, 255, 0.05)",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                                    }}
                                >
                                    🧹 Launch Empty (Recommended)
                                </button>
                                <button
                                    onClick={() => setShowSeedingWarning(false)}
                                    style={{
                                        width: "100%",
                                        height: "36px",
                                        fontSize: "12px",
                                        color: "var(--muted)",
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        marginTop: "4px"
                                    }}
                                >
                                    Cancel & Review
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
