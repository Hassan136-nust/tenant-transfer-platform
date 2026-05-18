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

  // Client-side cache memory to make calculation switches 100% instant
  const eligibilityCache = useRef<Record<string, number>>({});

  const targetOrg = organizations.find((o) => o.id === selectedRecipient);
  const recipientOrgName = targetOrg ? targetOrg.name : 'Choose target workspace';

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
        setPendingTransferCount(eligibilityCache.current[selectedRecipient]);
        return;
      }

      const fetchEligibility = async () => {
        try {
          setCheckingEligibility(true);
          const res = await fetch(`/api/transfer?recipientOrgId=${selectedRecipient}`);
          if (res.ok) {
            const data = await res.json();
            const count = data.pendingCount ?? 0;
            // 2. Commit to cache memory
            eligibilityCache.current[selectedRecipient] = count;
            setPendingTransferCount(count);
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

  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipient || !message.trim() || actionLoading || rowCount === 0) return;

    setError("");
    setNotice("");
    setActionLoading(true);

    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), recipientOrgId: selectedRecipient }),
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
          <form onSubmit={handleInitiateTransfer} style={{
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
                {organizations
                  .filter((org) => org.id !== orgId)
                  .map((org) => (
                    <option key={org.id} value={org.id} style={{ color: "#ffffff" }}>
                      🏢 {org.name} ({org.id})
                    </option>
                  ))
                }
              </select>
              {organizations.length === 0 && (
                <small style={{ color: "#fca5a5", marginTop: "6.5px", display: "block", fontWeight: "600" }}>
                  ⚠️ No other organizations are currently registered in the database. Please register another workspace first!
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
                disabled={actionLoading || rowCount === null || rowCount === 0 || !selectedRecipient || pendingTransferCount === 0}
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
                pendingTransferCount === 0 ||
                !message.trim() ||
                !selectedRecipient
              }
              style={{
                height: "52px",
                fontSize: "15px",
                marginTop: "8px",
                boxShadow: pendingTransferCount === 0
                  ? "none"
                  : "0 6px 20px rgba(20, 184, 166, 0.2)",
                background: pendingTransferCount === 0
                  ? "rgba(255, 255, 255, 0.05)"
                  : undefined,
                color: pendingTransferCount === 0
                  ? "rgba(255,255,255,0.3)"
                  : undefined,
                border: pendingTransferCount === 0
                  ? "1px solid rgba(255,255,255,0.05)"
                  : undefined,
                cursor: pendingTransferCount === 0 ? "not-allowed" : "pointer"
              }}
            >
              {actionLoading
                ? "Executing Cloning Transaction..."
                : pendingTransferCount === 0
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
                        : pendingTransferCount === 0
                          ? "#f43f5e"
                          : "var(--primary-2)",
                      fontSize: "14px"
                    }}>
                      {checkingEligibility
                        ? "Evaluating..."
                        : pendingTransferCount !== null
                          ? `${pendingTransferCount.toLocaleString()} new records`
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

            {selectedRecipient && !checkingEligibility && pendingTransferCount === 0 && (
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
            )}

            {selectedRecipient && !checkingEligibility && pendingTransferCount !== null && pendingTransferCount > 0 && (
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
                Detected <strong>{pendingTransferCount} pending record(s)</strong> that have not yet been synchronized with <strong>{recipientOrgName}</strong>. Proceeding will migrate only these matching segments transactionally.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
