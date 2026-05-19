"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/app-shell";
import { useDemoSession } from "../components/demo-session-provider";

export default function TransferPage() {
  const router = useRouter();
  const { email, loading: sessionLoading, orgId, orgName } = useDemoSession();

  const [organizations, setOrganizations] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [pendingTransferCount, setPendingTransferCount] = useState<number | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [hasReceivedFromRecipient, setHasReceivedFromRecipient] = useState(false);
  const [dataUnchangedSinceReceived, setDataUnchangedSinceReceived] = useState(false);
  const [newRowsCount, setNewRowsCount] = useState<number>(0);
  const [showReverseWarning, setShowReverseWarning] = useState(false);
  const [reverseCountdown, setReverseCountdown] = useState(3);
  const [transferMode, setTransferMode] = useState<"all" | "new_only">("all");
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Client-side cache memory to make calculation switches 100% instant
  const eligibilityCache = useRef<Record<string, { count: number; receivedFrom: boolean; unchanged: boolean; newRowsCount: number }>>({});

  const targetOrg = organizations.find((o) => o.id === selectedRecipient);
  const recipientOrgName = targetOrg ? targetOrg.name : 'Choose target workspace';
  const effectivePendingCount = hasReceivedFromRecipient ? newRowsCount : (pendingTransferCount ?? 0);

  // Auto-protect routes
  useEffect(() => {
    if (!sessionLoading && !email) {
      router.replace("/login");
    }
  }, [email, sessionLoading, router]);

  // Fetch transfer eligibility whenever selected recipient is updated
  useEffect(() => {
    if (email && selectedRecipient) {
      // 1. Resolve from local cache immediately (0ms logic) if valid
      if (eligibilityCache.current[selectedRecipient] !== undefined) {
        const cached = eligibilityCache.current[selectedRecipient];
        setPendingTransferCount(cached.count);
        setHasReceivedFromRecipient(cached.receivedFrom);
        setDataUnchangedSinceReceived(cached.unchanged);
        setNewRowsCount(cached.newRowsCount);
        if (cached.receivedFrom) {
          setTransferMode("new_only");
        } else {
          setTransferMode("all");
        }
        return;
      }

      const fetchEligibility = async () => {
        try {
          setCheckingEligibility(true);
          const res = await fetch(`/api/transfer?recipientOrgId=${selectedRecipient}`);
          if (res.ok) {
            const data = await res.json();
            const count = data.pendingCount ?? 0;
            const receivedFrom = data.hasReceivedFromRecipient ?? false;
            const unchanged = data.dataUnchangedSinceReceived ?? false;
            const newRows = data.newRowsCount ?? 0;
            // 2. Commit to cache memory
            eligibilityCache.current[selectedRecipient] = { count, receivedFrom, unchanged, newRowsCount: newRows };
            setPendingTransferCount(count);
            setHasReceivedFromRecipient(receivedFrom);
            setDataUnchangedSinceReceived(unchanged);
            setNewRowsCount(newRows);
            if (receivedFrom) {
              setTransferMode("new_only");
            } else {
              setTransferMode("all");
            }
          } else {
            setPendingTransferCount(null);
          }
        } catch (err) {
          console.error("Checking transfer eligibility failed:", err);
          setPendingTransferCount(null);
        } finally {
          setCheckingEligibility(false);
        }
      };
      fetchEligibility();
    } else {
      setPendingTransferCount(null);
      setHasReceivedFromRecipient(false);
      setDataUnchangedSinceReceived(false);
      setNewRowsCount(0);
      setTransferMode("all");
    }
  }, [email, selectedRecipient]);

  // Fetch dynamic targeting options on mounts
  useEffect(() => {
    if (email) {
      const fetchOrgs = async () => {
        try {
          const res = await fetch("/api/organizations");
          if (res.ok) {
            const data = await res.json();
            setOrganizations(data.organizations || []);
          }
        } catch (err) {
          console.error("[Transfer Page] Failed to fetch targeting options:", err);
        }
      };
      fetchOrgs();
    }
  }, [email]);

  const loadRowCount = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/rows?page=1&limit=1");
      if (res.ok) {
        const data = await res.json();
        setRowCount(data.totalRows || 0);
      }
    } catch (err) {
      console.error("[Transfer] Error retrieving rows summary:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (email) {
      loadRowCount();
    }
  }, [email, loadRowCount]);

  // Start countdown when warning opens
  const openReverseWarning = () => {
    setShowReverseWarning(true);
    setReverseCountdown(3);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setReverseCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const closeReverseWarning = () => {
    setShowReverseWarning(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipient || !message.trim() || actionLoading || rowCount === 0) return;

    // Show reverse-transfer warning if applicable and not yet confirmed
    if (hasReceivedFromRecipient && !showReverseWarning) {
      openReverseWarning();
      return;
    }
    setShowReverseWarning(false);

    setError("");
    setNotice("");
    setActionLoading(true);

    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), recipientOrgId: selectedRecipient, transferMode }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Invalidate dynamic calculation caches
        eligibilityCache.current = {};
        setNotice(data.message);
        setMessage("");
        setSelectedRecipient("");
        // Refresh local count as there are no modifications, but good for sync consistency
        await loadRowCount();

        // 🌟 Trigger Async Browserside Background Email Dispatch - 0ms perceived latency for user!
        fetch("/api/transfer/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientOrgId: data.recipientOrgId || selectedRecipient,
            message: data.messageText || message.trim(),
            rowCount: data.rowCount,
            transferMode: data.transferMode || transferMode
          })
        }).then((emailRes) => {
          if (!emailRes.ok) console.warn("[Transfer Page] Background email dispatch returned non-200 state");
          else console.log("[Transfer Page] Background email dispatch successfully triggered");
        }).catch((err) => {
          console.error("[Transfer Page] Failed to trigger background email dispatch:", err);
        });
      } else {
        setError(data.error || "Transfer transaction rejected by server pooler.");
      }
    } catch (err) {
      console.error("[Transfer] Transaction failed:", err);
      setError("Network timeout. The transaction state has been rolled back.");
    } finally {
      setActionLoading(false);
    }
  };

  if (sessionLoading || !email) {
    return (
      <div className="auth-wrap">
        <p style={{ color: "var(--muted)", textAlign: "center" }}>Authorizing Secure Shell Workspace Access...</p>
      </div>
    );
  }

  return (
    <AppShell email={email}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "8px 0" }}>
        <div style={{ marginBottom: "20px" }}>
          <h2 className="headline-sm" style={{ fontWeight: "800", color: "#ffffff", letterSpacing: "-0.015em" }}>
            🔄 Workspace Data Transfer Control
          </h2>
          <p className="muted-text" style={{ fontSize: "14.5px" }}>
            Initiating a secure cross-tenant data cloning transaction from <strong>{orgName}</strong> to a dynamic destination workspace.
          </p>
        </div>

        {notice && (
          <div className="notice" style={{ borderColor: "var(--primary-2)", background: "rgba(20, 184, 166, 0.05)", marginBottom: "24px" }}>
            <p style={{ color: "var(--primary-2)", fontSize: "15px", fontWeight: "750", margin: 0 }}>✓ Ledger Migrated successfully!</p>
            <p style={{ fontSize: "13.5px", marginTop: "6px", color: "var(--text)", margin: "6px 0 0 0" }}>{notice}</p>
            <p style={{ fontSize: "12.5px", marginTop: "6px", color: "var(--muted)", margin: "6px 0 0 0" }}>
              📧 An automated transfer notification was successfully dispatched to the target tenant's registered email.
            </p>
          </div>
        )}

        {error && (
          <div className="notice" style={{ borderColor: "var(--danger)", background: "rgba(244, 63, 94, 0.05)", marginBottom: "24px" }}>
            <p style={{ color: "#fda4af", fontSize: "14.5px", fontWeight: "600", margin: 0 }}>❌ {error}</p>
          </div>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: "32px",
          alignItems: "start",
          marginTop: "24px"
        }}>
          {/* Left Column: Transfer Action Cockpit Form */}
          <form id="transfer-form" onSubmit={handleInitiateTransfer} style={{
            background: "linear-gradient(145deg, rgba(255, 255, 255, 0.015) 0%, rgba(255, 255, 255, 0.002) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: "20px",
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            backdropFilter: "blur(12px)",
            boxShadow: "0 15px 35px rgba(0, 0, 0, 0.25)"
          }}>
            <h3 style={{ color: "#ffffff", fontSize: "17px", fontWeight: "750", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "12px", margin: 0 }}>
              ⚡ Transaction Parameters
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label htmlFor="recipient" style={{ fontWeight: "600", fontSize: "13.5px", color: "rgba(255,255,255,0.9)" }}>Destination Recipient Organization Workspace</label>
              <select
                id="recipient"
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value)}
                required
                disabled={actionLoading || organizations.length === 0}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "rgba(17, 24, 39, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  boxShadow: selectedRecipient ? "0 0 15px rgba(20, 184, 166, 0.1), inset 0 2px 4px rgba(0,0,0,0.2)" : "inset 0 2px 4px rgba(0,0,0,0.2)",
                  color: selectedRecipient ? "#ffffff" : "var(--muted)",
                  fontSize: "14.5px",
                  outline: "none",
                  transition: "all 0.25s ease"
                }}
              >
                <option value="" style={{ color: "var(--muted)" }}>-- Select Recipient Workspace --</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id} style={{ color: "#ffffff" }}>
                    🏢 {org.name} ({org.id})
                  </option>
                ))}
              </select>
              {organizations.length === 0 && (
                <small style={{ color: "#fca5a5", marginTop: "6.5px", display: "block", fontWeight: "600" }}>
                  ⚠️ No other organizations are currently registered. Please ask another user to register a workspace first!
                </small>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label htmlFor="message" style={{ fontWeight: "600", fontSize: "13.5px", color: "rgba(255,255,255,0.9)" }}>Custom Transfer Message Attachment</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Provide context or instructions to attach to this data ledger transfer (e.g. 'Migrating Q1 Consolidated ledgers for review')...."
                required
                disabled={actionLoading || rowCount === null || rowCount === 0 || !selectedRecipient || effectivePendingCount === 0}
                style={{
                  height: "120px",
                  padding: "16px",
                  fontSize: "14.5px",
                  background: "rgba(17, 24, 39, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  boxShadow: message ? "0 0 15px rgba(20, 184, 166, 0.06), inset 0 2px 4px rgba(0,0,0,0.2)" : "inset 0 2px 4px rgba(0,0,0,0.2)",
                  borderRadius: "12px",
                  transition: "all 0.25s ease",
                  resize: "none"
                }}
              />
              <small style={{ color: "var(--muted)", marginTop: "2px", display: "block", fontSize: "12px" }}>
                📝 Attached message will appear on the recipient's Notification Inbox feed and their automated email alert.
              </small>
            </div>

            <button
              type="submit"
              className="btn"
              disabled={
                actionLoading ||
                checkingEligibility ||
                rowCount === null ||
                rowCount === 0 ||
                effectivePendingCount === 0 ||
                !message.trim() ||
                !selectedRecipient
              }
              style={{
                height: "52px",
                fontSize: "15px",
                marginTop: "8px",
                boxShadow: effectivePendingCount === 0
                  ? "none"
                  : "0 6px 20px rgba(20, 184, 166, 0.2)",
                background: effectivePendingCount === 0
                  ? "rgba(255, 255, 255, 0.05)"
                  : undefined,
                color: effectivePendingCount === 0
                  ? "rgba(255,255,255,0.3)"
                  : undefined,
                border: effectivePendingCount === 0
                  ? "1px solid rgba(255,255,255,0.05)"
                  : undefined,
                cursor: effectivePendingCount === 0 ? "not-allowed" : "pointer"
              }}
            >
              {actionLoading
                ? "Executing Cloning Transaction..."
                : effectivePendingCount === 0
                  ? "🔒 Duplicate Transfer Suspended"
                  : "🚀 Authenticate and Transfer Data"}
            </button>
          </form>

          {/* Right Column: Ledger Audit, Warnings, and Sentinel Information */}
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {/* Transfer details sheet */}
            <div style={{
              background: "linear-gradient(145deg, rgba(255, 255, 255, 0.015) 0%, rgba(255, 255, 255, 0.002) 100%)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: "20px",
              padding: "26px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              backdropFilter: "blur(12px)",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)"
            }}>
              <div>
                <h4 style={{ color: "white", fontSize: "16px", fontWeight: 700, marginBottom: "12px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "8px", marginTop: 0 }}>Ledger Integrity Audit Summary</h4>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", padding: "12px 0" }}>
                  <span style={{ color: "var(--muted)", fontSize: "13.5px" }}>Source Origin Owner:</span>
                  <strong style={{ color: "white", fontSize: "14px" }}>{orgName}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", padding: "12px 0" }}>
                  <span style={{ color: "var(--muted)", fontSize: "13.5px" }}>Destination Recipient:</span>
                  <strong style={{ color: "var(--primary-2)", fontSize: "14px", fontWeight: "700" }}>{recipientOrgName}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: selectedRecipient ? "1px solid rgba(255, 255, 255, 0.05)" : "none", padding: "12px 0" }}>
                  <span style={{ color: "var(--muted)", fontSize: "13.5px" }}>Database Records Ready:</span>
                  <strong style={{ color: "#ffffff", fontFamily: "monospace", fontSize: "14px" }}>
                    {loading ? "Reckoning..." : rowCount !== null ? `${rowCount.toLocaleString()} rows` : "0 rows"}
                  </strong>
                </div>
                {selectedRecipient && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}>
                    <span style={{ color: "var(--muted)", fontSize: "13.5px" }}>Pending Record Sync:</span>
                    <strong style={{
                      color: checkingEligibility
                        ? "var(--muted)"
                        : effectivePendingCount === 0
                          ? "#f43f5e"
                          : "var(--primary-2)",
                      fontSize: "14px"
                    }}>
                      {checkingEligibility
                        ? "Evaluating..."
                        : pendingTransferCount !== null
                          ? hasReceivedFromRecipient
                            ? `${newRowsCount.toLocaleString()} new record${newRowsCount === 1 ? '' : 's'}${pendingTransferCount > newRowsCount ? ` (${(pendingTransferCount - newRowsCount).toLocaleString()} duplicate${(pendingTransferCount - newRowsCount) === 1 ? '' : 's'} ignored)` : ''}`
                            : `${pendingTransferCount.toLocaleString()} new record${pendingTransferCount === 1 ? '' : 's'}`
                          : "Unknown"}
                    </strong>
                  </div>
                )}
              </div>

              <div style={{
                background: "rgba(99, 102, 241, 0.04)",
                border: "1px solid rgba(99, 102, 241, 0.15)",
                borderLeft: "3px solid var(--primary)",
                borderRadius: "10px",
                padding: "16px 20px",
                fontSize: "13px",
                color: "#c7d2fe",
                lineHeight: 1.6
              }}>
                <strong>⚠️ Corporate Isolation Disclaimer:</strong> This transfer action processes immediate, transaction-level cloning inside Neon Postgres. Upon clicking "Transfer Data", a distinct copy of all your active records are generated and permanently bound to {recipientOrgName}. The recipient will maintain its own completely isolated copy post-transfer. Future modifications, deletions, or column additions inside your dashboard will be completely isolated and will not appear in the recipient's views.
              </div>
            </div>

            {selectedRecipient && !checkingEligibility && effectivePendingCount === 0 && (
              hasReceivedFromRecipient ? (
                <div className="notice" style={{
                  borderLeft: "4px solid #fbbf24",
                  borderColor: "rgba(251, 191, 36, 0.15)",
                  background: "rgba(8, 12, 28, 0.45)",
                  marginTop: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px"
                }}>
                  <strong style={{ color: "#fbbf24", fontSize: "14.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                    ⚠️ Workspace Data Loop Alert
                  </strong>
                  <span style={{ fontSize: "13.5px", color: "var(--text)", lineHeight: 1.5 }}>
                    You previously received data from <strong>{recipientOrgName}</strong>. Your active workspace ledger remains unchanged since the import. Direct synchronization of duplicate structures is locked by default.
                  </span>
                </div>
              ) : (
                <div style={{
                  background: "rgba(244, 63, 94, 0.03)",
                  border: "1px solid rgba(244, 63, 94, 0.15)",
                  borderLeft: "4px solid #f43f5e",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  fontSize: "13.5px",
                  color: "#fda4af",
                  lineHeight: 1.5,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }}>
                  <strong style={{ color: "#ffffff", fontSize: "14.5px" }}>⚠️ Data Already Transferred</strong>
                  No duplicate transfers are allowed. Your current database ledger is already fully synced with <strong>{recipientOrgName}</strong>. This transfer transaction is locked until new records are populated or existing records are updated in your workspace.
                </div>
              )
            )}

            {selectedRecipient && !checkingEligibility && pendingTransferCount !== null && effectivePendingCount > 0 && (
              <div style={{
                background: "rgba(20, 184, 166, 0.03)",
                border: "1px solid rgba(20, 184, 166, 0.12)",
                borderLeft: "4px solid var(--primary-2)",
                borderRadius: "12px",
                padding: "16px 20px",
                fontSize: "13.5px",
                color: "#b2f5ea",
                lineHeight: 1.5,
                display: "flex",
                flexDirection: "column",
                gap: "4px"
              }}>
                <strong style={{ color: "#ffffff", fontSize: "14.5px" }}>✨ Ready for Ledger Import</strong>
                Detected <strong>{effectivePendingCount} pending record(s)</strong> that have not yet been synchronized with <strong>{recipientOrgName}</strong>. Proceeding will migrate only these matching segments transactionally.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Reverse-Transfer Warning Modal ===== */}
      {showReverseWarning && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "fadeIn 0.25s ease"
        }}>
          <div style={{
            background: "linear-gradient(145deg, rgba(20, 26, 42, 0.99), rgba(15, 18, 30, 0.99))",
            border: "1px solid rgba(251, 191, 36, 0.25)",
            borderTop: "4px solid #fbbf24",
            borderRadius: "24px",
            padding: "36px 40px",
            maxWidth: "520px",
            width: "92%",
            boxShadow: "0 0 60px rgba(251, 191, 36, 0.15), 0 30px 70px rgba(0, 0, 0, 0.7)",
            animation: "scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
              <div style={{
                width: "48px", height: "48px", borderRadius: "14px",
                background: "rgba(251, 191, 36, 0.12)",
                border: "1px solid rgba(251, 191, 36, 0.3)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <path d="M12 9v4" /><path d="M12 17h.01" />
                </svg>
              </div>
              <div>
                <h3 style={{ color: "#fbbf24", fontWeight: 800, fontSize: "18px", margin: 0, letterSpacing: "-0.01em" }}>
                  Workspace Data Loop Alert
                </h3>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", margin: "2px 0 0 0", fontWeight: 500 }}>
                  Reverse Ledger Sync Authorization
                </p>
              </div>
            </div>

            {/* Description */}
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "14.5px", lineHeight: 1.6, margin: "0 0 16px 0" }}>
              You previously <strong style={{ color: "#fbbf24" }}>received data from {recipientOrgName}</strong>.
            </p>

            {dataUnchangedSinceReceived ? (
              // Case 1: Unchanged Data (Duplication warning)
              <div style={{ marginBottom: "28px" }}>
                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "13.5px", lineHeight: 1.6, margin: "0 0 12px 0" }}>
                  Your active workspace ledger remains unchanged since the import. Re-transferring now will trigger a clean duplication loop.
                </p>
                <div style={{
                  background: "rgba(251, 191, 36, 0.05)",
                  border: "1px solid rgba(251, 191, 36, 0.15)",
                  borderRadius: "10px", padding: "12px 16px",
                  fontSize: "12.5px", color: "#fbbf24", display: "flex", gap: "10px", alignItems: "center"
                }}>
                  <span>⚠️</span>
                  <span><strong>Warning:</strong> Direct synchronization of duplicate structures is locked by default.</span>
                </div>
              </div>
            ) : (
              // Case 2: New original rows exist! Offer Choice Cards
              <div style={{ marginBottom: "28px" }}>
                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "13.5px", lineHeight: 1.6, margin: "0 0 16px 0" }}>
                  However, you have successfully added <strong style={{ color: "#2dd4bf" }}>{newRowsCount} new original record(s)</strong> since the import. Choose your secure transfer mode:
                </p>

                {/* Option Cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Card 1: New Data Only */}
                  <div
                    onClick={() => setTransferMode("new_only")}
                    style={{
                      padding: "16px 20px", borderRadius: "16px",
                      background: transferMode === "new_only" ? "rgba(45, 212, 191, 0.05)" : "rgba(255,255,255,0.01)",
                      border: transferMode === "new_only" ? "1.5px solid #2dd4bf" : "1.5px solid rgba(255,255,255,0.05)",
                      boxShadow: transferMode === "new_only" ? "0 0 20px rgba(45, 212, 191, 0.1)" : "none",
                      cursor: "pointer", display: "flex", gap: "14px", alignItems: "flex-start",
                      transition: "all 0.25s ease"
                    }}
                  >
                    <div style={{
                      width: "18px", height: "18px", borderRadius: "50%",
                      border: transferMode === "new_only" ? "5px solid #2dd4bf" : "2px solid rgba(255,255,255,0.3)",
                      background: "transparent", marginTop: "3px", flexShrink: 0,
                      transition: "all 0.2s"
                    }} />
                    <div>
                      <strong style={{ color: transferMode === "new_only" ? "#2dd4bf" : "#ffffff", fontSize: "14px", display: "block" }}>
                        ⚡ Transfer New original data only
                      </strong>
                      <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px", display: "block", marginTop: "2px", lineHeight: 1.4 }}>
                        Syncs only your <strong>{newRowsCount} new record(s)</strong>. Excludes all elements originally Cloned from {recipientOrgName}.
                      </span>
                    </div>
                  </div>

                  {/* Card 2: All Data */}
                  <div
                    onClick={() => {
                      if (hasReceivedFromRecipient) return;
                      setTransferMode("all");
                    }}
                    style={{
                      padding: "16px 20px", borderRadius: "16px",
                      background: transferMode === "all" ? "rgba(251, 191, 36, 0.05)" : "rgba(255,255,255,0.01)",
                      border: transferMode === "all"
                        ? "1.5px solid #fbbf24"
                        : hasReceivedFromRecipient
                          ? "1.5px solid rgba(255,255,255,0.02)"
                          : "1.5px solid rgba(255,255,255,0.05)",
                      boxShadow: transferMode === "all" ? "0 0 20px rgba(251, 191, 36, 0.1)" : "none",
                      cursor: hasReceivedFromRecipient ? "not-allowed" : "pointer",
                      display: "flex", gap: "14px", alignItems: "flex-start",
                      transition: "all 0.25s ease",
                      opacity: hasReceivedFromRecipient ? 0.35 : 1
                    }}
                  >
                    <div style={{
                      width: "18px", height: "18px", borderRadius: "50%",
                      border: transferMode === "all" ? "5px solid #fbbf24" : "2px solid rgba(255,255,255,0.3)",
                      background: "transparent", marginTop: "3px", flexShrink: 0,
                      transition: "all 0.2s"
                    }} />
                    <div>
                      <strong style={{ color: transferMode === "all" ? "#fbbf24" : "#ffffff", fontSize: "14px", display: "block" }}>
                        🌀 Transfer whole data pool
                      </strong>
                      <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px", display: "block", marginTop: "2px", lineHeight: 1.4 }}>
                        Syncs all <strong>{rowCount} record(s)</strong> currently in this organization dashboard, including duplicates.
                      </span>
                      {hasReceivedFromRecipient && (
                        <span style={{ color: "#fda4af", fontSize: "11px", fontWeight: "600", display: "block", marginTop: "6px" }}>
                          🔒 Restrictive Security Lock: Only new original record sync allowed for reverse transfers.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "14px" }}>
              <button
                type="button"
                onClick={closeReverseWarning}
                style={{
                  flex: 1, padding: "14px", borderRadius: "14px", fontSize: "14px", fontWeight: 650,
                  background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.7)", cursor: "pointer", transition: "all 0.25s ease"
                }}
              >
                Abort Sync
              </button>
              <button
                type="button"
                onClick={() => {
                  closeReverseWarning();
                  // Re-submit the form
                  const form = document.getElementById("transfer-form") as HTMLFormElement | null;
                  if (form) form.requestSubmit();
                }}
                disabled={reverseCountdown > 0}
                style={{
                  flex: 1, padding: "14px", borderRadius: "14px", fontSize: "14px", fontWeight: 700,
                  background: reverseCountdown > 0
                    ? "rgba(255, 255, 255, 0.05)"
                    : transferMode === "new_only" && !dataUnchangedSinceReceived
                      ? "linear-gradient(135deg, #0d9488, #0f766e)"
                      : "linear-gradient(135deg, #d97706, #b45309)",
                  border: reverseCountdown > 0
                    ? "1px solid rgba(255,255,255,0.05)"
                    : transferMode === "new_only" && !dataUnchangedSinceReceived
                      ? "1px solid #14b8a6"
                      : "1px solid #fbbf24",
                  color: reverseCountdown > 0 ? "rgba(255,255,255,0.3)" : "#ffffff",
                  cursor: reverseCountdown > 0 ? "not-allowed" : "pointer",
                  boxShadow: reverseCountdown > 0 ? "none" : transferMode === "new_only" && !dataUnchangedSinceReceived ? "0 4px 15px rgba(20, 184, 166, 0.2)" : "0 4px 15px rgba(251, 191, 36, 0.2)",
                  transition: "all 0.3s"
                }}
              >
                {reverseCountdown > 0 ? `Proceed Lock (${reverseCountdown}s)` : "Yes, Synchronize"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
