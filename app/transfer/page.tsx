"use client";

import { useEffect, useState, useCallback } from "react";
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

  const targetOrg = organizations.find((o) => o.id === selectedRecipient);
  const recipientOrgName = targetOrg ? targetOrg.name : 'Choose target workspace';

  // Auto-protect routes
  useEffect(() => {
    if (!sessionLoading && !email) {
      router.replace("/login");
    }
  }, [email, sessionLoading, router]);

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
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "8px 0" }}>
        <div style={{ marginBottom: "24px" }}>
          <h2 className="headline-sm" style={{ fontWeight: "700", color: "#ffffff" }}>
            🔄 Multi-Organization Data Transfer Workspace
          </h2>
          <p className="muted-text" style={{ fontSize: "14px" }}>
            Initiating a ledger data cloning migration transaction from <strong>{orgName}</strong> to a dynamic recipient organization.
          </p>
        </div>

        {notice && (
          <div className="notice" style={{ borderColor: "var(--primary-2)", background: "rgba(20, 184, 166, 0.05)", marginBottom: "20px" }}>
            <p style={{ color: "var(--primary-2)", fontSize: "15px", fontWeight: "700" }}>✓ Ledger Migrated successfully!</p>
            <p style={{ fontSize: "13.5px", marginTop: "4.5px", color: "var(--text)" }}>{notice}</p>
            <p style={{ fontSize: "12.5px", marginTop: "4.5px", color: "var(--muted)" }}>
              📧 An automated transfer notification was successfully dispatched to the target tenant's registered email.
            </p>
          </div>
        )}

        {error && (
          <div className="notice" style={{ borderColor: "var(--danger)", background: "rgba(244, 63, 94, 0.05)", marginBottom: "20px" }}>
            <p style={{ color: "#fda4af", fontSize: "14.5px", fontWeight: "600" }}>❌ {error}</p>
          </div>
        )}

        {/* Transfer details sheet */}
        <div style={{
          background: "linear-gradient(145deg, rgba(255, 255, 255, 0.015) 0%, rgba(255, 255, 255, 0.002) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: "20px",
          padding: "26px",
          marginBottom: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          backdropFilter: "blur(12px)",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)"
        }}>
          <div>
            <h4 style={{ color: "white", fontSize: "16px", fontWeight: 700, marginBottom: "12px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "8px" }}>Ledger Integrity Audit Summary</h4>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", padding: "12px 0" }}>
              <span style={{ color: "var(--muted)", fontSize: "13.5px" }}>Source Origin Owner:</span>
              <strong style={{ color: "white", fontSize: "14px" }}>{orgName}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", padding: "12px 0" }}>
              <span style={{ color: "var(--muted)", fontSize: "13.5px" }}>Destination Recipient:</span>
              <strong style={{ color: "var(--primary-2)", fontSize: "14px", fontWeight: "700" }}>{recipientOrgName}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}>
              <span style={{ color: "var(--muted)", fontSize: "13.5px" }}>Database Records Ready:</span>
              <strong style={{ color: "#ffffff", fontFamily: "monospace", fontSize: "14px" }}>
                {loading ? "Reckoning..." : rowCount !== null ? `${rowCount.toLocaleString()} rows` : "0 rows"}
              </strong>
            </div>
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

        <form onSubmit={handleInitiateTransfer} className="form-grid">
          <div>
            <label htmlFor="recipient" style={{ fontWeight: "600" }}>Destination Recipient Organization Workspace</label>
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
                ⚠️ No other organizations are currently registered in the database. Please register another workspace first!
              </small>
            )}
          </div>

          <div>
            <label htmlFor="message" style={{ fontWeight: "600" }}>Custom Transfer Message Attachment</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide context or instructions to attach to this data ledger transfer (e.g. 'Migrating Q1 Consolidated Financial Ledgers for HR review')..."
              required
              disabled={actionLoading || rowCount === null || rowCount === 0 || !selectedRecipient}
              style={{
                padding: "16px",
                fontSize: "14.5px",
                background: "rgba(17, 24, 39, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                boxShadow: message ? "0 0 15px rgba(20, 184, 166, 0.06), inset 0 2px 4px rgba(0,0,0,0.2)" : "inset 0 2px 4px rgba(0,0,0,0.2)",
                borderRadius: "12px",
                transition: "all 0.25s ease"
              }}
            />
            <small style={{ color: "var(--muted)", marginTop: "6.5px", display: "block" }}>
              📝 Note: Attached message will appear on the recipient's Notification Inbox feed and their automated email alert.
            </small>
          </div>

          <button
            type="submit"
            className="btn"
            disabled={actionLoading || rowCount === null || rowCount === 0 || !message.trim() || !selectedRecipient}
            style={{
              height: "52px",
              fontSize: "15px",
              marginTop: "8px",
              boxShadow: "0 6px 20px rgba(20, 184, 166, 0.2)"
            }}
          >
            {actionLoading ? "Executing Cloning Transaction..." : "🚀 Authenticate and Transfer Data"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
