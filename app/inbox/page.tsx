"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/app-shell";
import { useDemoSession } from "../components/demo-session-provider";

interface TransferEntity {
    id: number;
    sender_org_id: string;
    recipient_org_id: string;
    message: string;
    row_count: number;
    transferred_at: string;
    sender_name: string;
    recipient_name: string;
}

export default function InboxPage() {
    const router = useRouter();
    const { email, loading: sessionLoading, orgId, orgName } = useDemoSession();

    const [transfers, setTransfers] = useState<TransferEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Auto-protect routes
    useEffect(() => {
        if (!sessionLoading && !email) {
            router.replace("/login");
        }
    }, [email, sessionLoading, router]);

    const loadTransfers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/transfers");
            if (res.ok) {
                const data = await res.json();
                setTransfers(data.transfers || []);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to load log feed.");
            }
        } catch (err) {
            console.error("[Inbox] Error loading transfers:", err);
            setError("Failed to synchronize inbox logs.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (email) {
            loadTransfers();
        }
    }, [email, loadTransfers]);

    if (sessionLoading || !email) {
        return (
            <div className="auth-wrap">
                <p style={{ color: "var(--muted)", textAlign: "center" }}>Authorizing Secure Shell Workspace Access...</p>
            </div>
        );
    }

    return (
        <AppShell email={email}>
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "12px", flexWrap: "wrap" }}>
                    <div>
                        <h2 className="headline-sm" style={{ fontWeight: "700", color: "#ffffff" }}>
                            📬 Notifications Inbox & Audit Feed
                        </h2>
                        <p className="muted-text" style={{ fontSize: "14px" }}>
                            Tracking transactional data inflows and outflows for <strong>{orgName}</strong>.
                        </p>
                    </div>
                    <button
                        onClick={loadTransfers}
                        disabled={loading}
                        className="btn btn-ghost"
                        style={{ padding: "8px 14px", fontSize: "13px", height: "fit-content", borderRadius: "10px" }}
                    >
                        🔄 Sync History
                    </button>
                </div>

                {error && (
                    <div className="notice" style={{ borderColor: "#ef4444", background: "rgba(239, 68, 68, 0.05)", marginBottom: "20px" }}>
                        <p style={{ color: "#fca5a5", fontSize: "14px" }}>❌ {error}</p>
                    </div>
                )}

                {loading ? (
                    <div style={{ background: "rgba(11, 18, 40, 0.45)", border: "1px solid var(--stroke)", borderRadius: "16px", padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>
                        <p>Fetching encrypted transfer enclaves logs...</p>
                    </div>
                ) : transfers.length === 0 ? (
                    <div style={{ background: "rgba(11, 18, 40, 0.45)", border: "1px solid var(--stroke)", borderRadius: "16px", padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>
                        <p style={{ fontSize: "16px" }}>Historical log feed is empty.</p>
                        <p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
                            Data transfer notifications will automatically load here when a migration completes.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        {transfers.map((item) => {
                            const isIncoming = item.recipient_org_id === orgId;
                            const dateFormatted = new Date(item.transferred_at).toLocaleString();

                            return (
                                <div
                                    key={item.id}
                                    style={{
                                        background: "linear-gradient(145deg, rgba(255, 255, 255, 0.015) 0%, rgba(255, 255, 255, 0.002) 100%)",
                                        border: `1px solid ${isIncoming ? "rgba(20, 184, 166, 0.15)" : "rgba(99, 102, 241, 0.15)"}`,
                                        borderLeft: `4px solid ${isIncoming ? "var(--primary-2)" : "var(--primary)"}`,
                                        borderRadius: "16px",
                                        padding: "22px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "14px",
                                        backdropFilter: "blur(12px)",
                                        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
                                        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = isIncoming ? "var(--primary-2)" : "var(--primary)";
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                        e.currentTarget.style.boxShadow = `0 15px 35px ${isIncoming ? "rgba(20, 184, 166, 0.15)" : "rgba(99, 102, 241, 0.15)"}`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = isIncoming ? "rgba(20, 184, 166, 0.15)" : "rgba(99, 102, 241, 0.15)";
                                        e.currentTarget.style.transform = "translateY(0px)";
                                        e.currentTarget.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.15)";
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <span style={{
                                                fontSize: "12px",
                                                fontWeight: "750",
                                                padding: "3px 10px",
                                                borderRadius: "999px",
                                                background: isIncoming ? "rgba(20, 184, 166, 0.1)" : "rgba(99, 102, 241, 0.1)",
                                                color: isIncoming ? "var(--primary-2)" : "#a5b4fc",
                                                border: `1px solid ${isIncoming ? "rgba(20, 184, 166, 0.2)" : "rgba(99, 102, 241, 0.2)"}`
                                            }}>
                                                {isIncoming ? "📥 Incoming Ledger" : "📤 Outgoing Ledger"}
                                            </span>
                                            <strong style={{ color: "white", fontSize: "14.5px" }}>ID: #{item.id}</strong>
                                        </div>
                                        <span style={{ color: "var(--muted)", fontSize: "12px" }}>⏱ {dateFormatted}</span>
                                    </div>

                                    <div style={{ color: "var(--text)", fontSize: "14px", lineHeight: "1.5" }}>
                                        {isIncoming ? (
                                            <p>
                                                Your organization successfully received a data transfer of {" "}
                                                <strong style={{ color: "var(--primary-2)", fontFamily: "monospace" }}>{item.row_count} records</strong> {" "}
                                                cloned from <strong>{item.sender_name}</strong>.
                                            </p>
                                        ) : (
                                            <p>
                                                Your organization successfully cloned and migrated {" "}
                                                <strong style={{ color: "var(--primary-2)", fontFamily: "monospace" }}>{item.row_count} records</strong> {" "}
                                                to <strong>{item.recipient_name}</strong>.
                                            </p>
                                        )}
                                    </div>

                                    {/* Attached Custom Message Box */}
                                    <div style={{
                                        background: "rgba(17, 24, 39, 0.4)",
                                        borderLeft: `3px solid ${isIncoming ? "var(--primary-2)" : "var(--primary)"}`,
                                        borderRadius: "0 8px 8px 0",
                                        padding: "12px 16px",
                                        marginTop: "4px"
                                    }}>
                                        <small style={{ color: "var(--muted)", textTransform: "uppercase", fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "4px", letterSpacing: "0.05em" }}>
                                            Attached Message Context:
                                        </small>
                                        <p style={{ margin: 0, fontStyle: "italic", fontSize: "13.5px", color: "#ccd6f6" }}>
                                            "{item.message || "No attached message description provided."}"
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
