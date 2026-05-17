"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/app-shell";
import { useDemoSession } from "../components/demo-session-provider";

interface RowEntity {
    id: number;
    record_name: string;
    category: string;
    metric_value: string | number;
    security_level: string;
    status: string;
    custodian_email: string;
    created_at: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const { email, loading: sessionLoading, orgName } = useDemoSession();

    const [rows, setRows] = useState<RowEntity[]>([]);
    const [totalRows, setTotalRows] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");

    const limit = 10;

    // Auto-protect routes
    useEffect(() => {
        if (!sessionLoading && !email) {
            router.replace("/login");
        }
    }, [email, sessionLoading, router]);

    const fetchRows = useCallback(async (pageIndex: number, searchStr: string) => {
        try {
            setLoading(true);
            const queryStr = `/api/rows?page=${pageIndex}&limit=${limit}&search=${encodeURIComponent(searchStr)}`;
            const res = await fetch(queryStr);
            if (res.ok) {
                const data = await res.json();
                setRows(data.rows || []);
                setTotalRows(data.totalRows || 0);
                setTotalPages(data.totalPages || 1);
                setCurrentPage(data.currentPage || 1);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to load database records.");
            }
        } catch (err) {
            console.error("[Dashboard] Error fetching rows:", err);
            setError("Network timeout. Failed to synchronize database.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (email) {
            fetchRows(currentPage, search);
        }
    }, [email, currentPage, search, fetchRows]);

    const handleAddRow = async () => {
        if (actionLoading) return;
        setActionLoading(true);
        setError("");
        setNotice("");

        try {
            const res = await fetch("/api/rows", { method: "POST" });
            const data = await res.json();

            if (res.ok && data.success) {
                setNotice(`New record (ID: ${data.row.id}) successfully initialized with 'unlisted' fields.`);
                // Force reset queries to page 1 and clear search to show the newly inserted row instantly!
                setSearch("");
                setCurrentPage(1);
                await fetchRows(1, "");
            } else {
                setError(data.error || "Failed to initialize new row.");
            }
        } catch (err) {
            console.error("[Dashboard] Add row error:", err);
            setError("Failed to verify transaction signature.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteRow = async (rowId: number) => {
        if (actionLoading || !confirm("Are you sure you want to permanently delete this record?")) return;
        setActionLoading(true);
        setError("");
        setNotice("");

        try {
            const res = await fetch(`/api/rows/${rowId}`, { method: "DELETE" });
            const data = await res.json();

            if (res.ok && data.success) {
                setNotice(`Record ID ${rowId} successfully purged from secure enclaves.`);
                // Adjust page index if we delete the last item of a page
                let targetPage = currentPage;
                if (rows.length === 1 && currentPage > 1) {
                    targetPage = currentPage - 1;
                    setCurrentPage(targetPage);
                }
                await fetchRows(targetPage, search);
            } else {
                setError(data.error || "Delete forbidden.");
            }
        } catch (err) {
            console.error("[Dashboard] Delete error:", err);
            setError("Row deletion rejected by server safety manager.");
        } finally {
            setActionLoading(false);
        }
    };

    // Compute metrics dynamically for the client dashboard KPI boxes!
    const confidentialCount = rows.filter(r => r.security_level === "Confidential" || r.security_level === "Highest Clearance").length;
    const securityRatio = rows.length > 0 ? Math.round((confidentialCount / rows.length) * 100) : 100;

    if (sessionLoading || !email) {
        return (
            <div className="auth-wrap">
                <p style={{ color: "var(--muted)", textAlign: "center" }}>Authorizing Secure Shell Workspace Access...</p>
            </div>
        );
    }

    return (
        <AppShell email={email}>
            <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "12px", flexWrap: "wrap" }}>
                    <div>
                        <h2 className="headline-sm" style={{ fontWeight: "700", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
                            🏢 {orgName} Dashboard
                        </h2>
                        <p className="muted-text" style={{ fontSize: "14px" }}>
                            Enclave isolated storage data workspace for {email}
                        </p>
                    </div>
                    <button
                        onClick={handleAddRow}
                        disabled={actionLoading || loading}
                        className="btn"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            boxShadow: "0 4px 15px rgba(101, 124, 255, 0.4)"
                        }}
                    >
                        {actionLoading ? "Processing..." : "➕ Add New Row"}
                    </button>
                </div>

                {/* Global KPI Metrics Cards Strip - Wow Aesthetic */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "20px",
                    marginBottom: "28px"
                }}>
                    {/* First KPI Card - Records */}
                    <div style={{
                        background: "linear-gradient(145deg, rgba(255, 255, 255, 0.015) 0%, rgba(255, 255, 255, 0.002) 100%)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        borderLeft: "4px solid var(--primary-2)",
                        borderRadius: "16px",
                        padding: "22px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        backdropFilter: "blur(12px)",
                        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)"
                    }}>
                        <small style={{ color: "var(--muted)", fontWeight: "700", textTransform: "uppercase", fontSize: "10.5px", letterSpacing: "0.08em" }}>📂 Total Records Loaded</small>
                        <span style={{ fontSize: "38px", fontWeight: "800", color: "#ffffff", fontFamily: "var(--font-geist-sans), monospace", letterSpacing: "-0.03em" }}>
                            {totalRows}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--primary-2)" }} />
                            <small style={{ color: "var(--primary-2)", fontSize: "11.5px", fontWeight: "600" }}>Live Neon Synced</small>
                        </div>
                    </div>

                    {/* Second KPI Card - Enclave Security */}
                    <div style={{
                        background: "linear-gradient(145deg, rgba(255, 255, 255, 0.015) 0%, rgba(255, 255, 255, 0.002) 100%)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        borderLeft: "4px solid var(--primary)",
                        borderRadius: "16px",
                        padding: "22px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        backdropFilter: "blur(12px)",
                        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)"
                    }}>
                        <small style={{ color: "var(--muted)", fontWeight: "700", textTransform: "uppercase", fontSize: "10.5px", letterSpacing: "0.08em" }}>🛡️ Local Enclave Security</small>
                        <span style={{ fontSize: "38px", fontWeight: "800", color: "#ffffff", fontFamily: "var(--font-geist-sans), monospace", letterSpacing: "-0.03em" }}>
                            {securityRatio}%
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--primary)" }} />
                            <small style={{ color: "#a5b4fc", fontSize: "11.5px", fontWeight: "600" }}>High Classification Confidentiality</small>
                        </div>
                    </div>

                    {/* Third KPI Card - Enclave Health */}
                    <div style={{
                        background: "linear-gradient(145deg, rgba(255, 255, 255, 0.015) 0%, rgba(255, 255, 255, 0.002) 100%)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        borderLeft: "4px solid var(--danger)",
                        borderRadius: "16px",
                        padding: "22px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        backdropFilter: "blur(12px)",
                        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)"
                    }}>
                        <small style={{ color: "var(--muted)", fontWeight: "700", textTransform: "uppercase", fontSize: "10.5px", letterSpacing: "0.08em" }}>📡 Tenant Isolation Health</small>
                        <span style={{ fontSize: "38px", fontWeight: "800", color: "#ffffff", fontFamily: "var(--font-geist-sans), monospace", letterSpacing: "-0.03em" }}>
                            100%
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--danger)" }} />
                            <small style={{ color: "#fda4af", fontSize: "11.5px", fontWeight: "600" }}>Strict Tenant Boundary</small>
                        </div>
                    </div>
                </div>

                {/* Action Success / Error Notifications */}
                {notice && (
                    <div className="notice" style={{ borderColor: "var(--primary-2)", background: "rgba(20, 184, 166, 0.05)", marginBottom: "16px" }}>
                        <p style={{ color: "var(--primary-2)", fontSize: "14.5px", fontWeight: "600" }}>✓ {notice}</p>
                    </div>
                )}

                {error && (
                    <div className="notice" style={{ borderColor: "var(--danger)", background: "rgba(244, 63, 94, 0.05)", marginBottom: "16px" }}>
                        <p style={{ color: "#fda4af", fontSize: "14.5px", fontWeight: "600" }}>❌ {error}</p>
                    </div>
                )}

                {/* Interactive Search Tool and Quick Filter */}
                <div style={{ marginBottom: "24px", display: "flex", gap: "14px", alignItems: "center" }}>
                    <div style={{ flexGrow: 1, position: "relative" }}>
                        <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--primary-2)", fontSize: "16px", pointerEvents: "none" }}>🔍</span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Fuzzy search records by ledger name or custodian email..."
                            style={{
                                paddingLeft: "46px",
                                height: "50px",
                                background: "rgba(17, 24, 39, 0.4)",
                                borderColor: search ? "var(--primary-2)" : "rgba(255, 255, 255, 0.05)",
                                boxShadow: search ? "0 0 15px rgba(20, 184, 166, 0.1), inset 0 2px 4px rgba(0,0,0,0.2)" : "inset 0 2px 4px rgba(0,0,0,0.2)",
                                fontSize: "14.5px"
                            }}
                        />
                    </div>
                </div>

                {/* Data List table */}
                <div style={{ background: "rgba(17, 24, 39, 0.25)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "20px", overflow: "hidden", backdropFilter: "blur(10px)" }}>
                    {loading ? (
                        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>
                            <p style={{ fontSize: "15px", fontWeight: "500" }}>Performing Index Lookup on Neon Postgres Datastore...</p>
                        </div>
                    ) : rows.length === 0 ? (
                        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>
                            <p style={{ fontSize: "16px", fontWeight: "600", color: "#ffffff" }}>No data records registered to organization enclaves.</p>
                            {search && <p style={{ fontSize: "13px", marginTop: "6px" }}>Try adjusting your fuzzy search query.</p>}
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                                <thead>
                                    <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                                        <th style={{ padding: "18px 24px", color: "#ffffff", fontWeight: "700", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>ID</th>
                                        <th style={{ padding: "18px 24px", color: "#ffffff", fontWeight: "700", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Record Name</th>
                                        <th style={{ padding: "18px 24px", color: "#ffffff", fontWeight: "700", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Category</th>
                                        <th style={{ padding: "18px 24px", color: "#ffffff", fontWeight: "700", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Metric Value</th>
                                        <th style={{ padding: "18px 24px", color: "#ffffff", fontWeight: "700", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Clearance</th>
                                        <th style={{ padding: "18px 24px", color: "#ffffff", fontWeight: "700", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Custodian Partner</th>
                                        <th style={{ padding: "18px 24px", color: "#ffffff", fontWeight: "700", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, idx) => (
                                        <tr
                                            key={row.id}
                                            className="premium-row"
                                        >
                                            <td style={{ padding: "18px 24px", fontFamily: "monospace", color: "var(--muted)", fontWeight: "700" }}>
                                                #{row.id}
                                            </td>
                                            <td style={{ padding: "18px 24px", color: "#ffffff", fontWeight: "600" }}>
                                                {row.record_name}
                                            </td>
                                            <td style={{ padding: "18px 24px" }}>
                                                <span style={{
                                                    fontSize: "12px",
                                                    background: row.category === "unlisted" ? "rgba(244, 63, 94, 0.1)" : "rgba(20, 184, 166, 0.1)",
                                                    color: row.category === "unlisted" ? "#fda4af" : "var(--primary-2)",
                                                    border: `1px solid ${row.category === 'unlisted' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(20, 184, 166, 0.2)'}`,
                                                    padding: "5px 12px",
                                                    borderRadius: "999px",
                                                    fontWeight: "600",
                                                    whiteSpace: "nowrap",
                                                    display: "inline-flex",
                                                    alignItems: "center"
                                                }}>
                                                    {row.category}
                                                </span>
                                            </td>
                                            <td style={{ padding: "18px 24px", fontFamily: "monospace", color: "#ffffff", fontWeight: "600" }}>
                                                ${parseFloat(row.metric_value as string).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: "18px 24px" }}>
                                                <span style={{
                                                    fontSize: "12px",
                                                    color: "rgba(255, 255, 255, 0.85)",
                                                    background: "rgba(255, 255, 255, 0.03)",
                                                    border: "1px solid rgba(255, 255, 255, 0.06)",
                                                    padding: "6px 12px",
                                                    borderRadius: "8px",
                                                    whiteSpace: "nowrap",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "6px"
                                                }}>
                                                    🛡️ {row.security_level}
                                                </span>
                                            </td>
                                            <td style={{ padding: "18px 24px", color: "var(--muted)", fontSize: "13px" }}>
                                                {row.custodian_email}
                                            </td>
                                            <td style={{ padding: "18px 24px", textAlign: "center" }}>
                                                <button
                                                    onClick={() => handleDeleteRow(row.id)}
                                                    disabled={actionLoading}
                                                    style={{
                                                        background: "rgba(244, 63, 94, 0.06)",
                                                        border: "1px solid rgba(244, 63, 94, 0.2)",
                                                        color: "#fda4af",
                                                        cursor: "pointer",
                                                        padding: "8px 14px",
                                                        borderRadius: "10px",
                                                        fontSize: "12.5px",
                                                        fontWeight: "600",
                                                        transition: "all 0.2s ease"
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = "var(--danger)";
                                                        e.currentTarget.style.color = "#030712";
                                                        e.currentTarget.style.borderColor = "var(--danger)";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = "rgba(244, 63, 94, 0.06)";
                                                        e.currentTarget.style.color = "#fda4af";
                                                        e.currentTarget.style.borderColor = "rgba(244, 63, 94, 0.2)";
                                                    }}
                                                >
                                                    🗑 Purge
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Dynamic Pagination Control Section */}
                {totalPages > 1 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", flexWrap: "wrap", gap: "12px" }}>
                        <p className="muted-text" style={{ fontSize: "13px" }}>
                            Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalRows} entries)
                        </p>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                disabled={currentPage === 1 || loading}
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                className="btn btn-ghost"
                                style={{ padding: "8px 12px", fontSize: "13px" }}
                            >
                                ◀ Previous
                            </button>
                            <button
                                disabled={currentPage === totalPages || loading}
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                className="btn btn-ghost"
                                style={{ padding: "8px 12px", fontSize: "13px" }}
                            >
                                Next ▶
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
