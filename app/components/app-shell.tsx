"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useDemoSession } from "./demo-session-provider";

type AppShellProps = {
  email: string;
  children: React.ReactNode;
};

export function AppShell({ email, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut, orgName } = useDemoSession();

  const navItems = [
    { name: "🏢 Dashboard", path: "/dashboard" },
    { name: "🔄 Transfer Workspace", path: "/transfer" },
    { name: "📬 Notification Inbox", path: "/inbox" },
  ];

  return (
    <div className="app-wrap" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="topbar" style={{
        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
        paddingBottom: "18px",
        marginBottom: "28px",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <p className="brand" style={{ letterSpacing: "-0.02em", color: "#ffffff", fontWeight: "800", fontSize: "20px" }}>
            🛡️ Secure Data Portal
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{
              fontSize: "11px",
              background: "rgba(20, 184, 166, 0.08)",
              color: "var(--primary-2)",
              border: "1px solid rgba(20, 184, 166, 0.2)",
              padding: "3px 10px",
              borderRadius: "999px",
              fontWeight: "600"
            }}>
              {orgName || "Resolving Org..."}
            </span>
            <p className="muted-text" style={{ fontSize: "12.5px" }}>Signed in as <strong style={{ color: "#ffffff" }}>{email}</strong></p>
          </div>
        </div>

        {/* Premium highlighted navigation strip */}
        <nav style={{ display: "flex", gap: "8px", flexGrow: 1, justifyContent: "center", minWidth: "280px" }}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "650",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  background: isActive ? "rgba(20, 184, 166, 0.08)" : "transparent",
                  color: isActive ? "var(--primary-2)" : "var(--muted)",
                  border: isActive ? "1px solid rgba(20, 184, 166, 0.2)" : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "var(--text)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "var(--muted)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <button
          className="btn btn-ghost"
          onClick={async () => {
            await signOut();
            router.push("/login");
          }}
          style={{ padding: "8px 16px", borderRadius: "10px", height: "fit-content", fontSize: "13px" }}
        >
          Sign Out
        </button>
      </header>

      <main className="content-card" style={{ flexGrow: 1, boxShadow: "0 20px 50px rgba(0,0,0,0.35)", background: "linear-gradient(180deg, rgba(23, 31, 57, 0.45) 0%, rgba(13, 20, 42, 0.55) 100%)", border: "1px solid rgba(255, 255, 255, 0.05)", backdropFilter: "blur(22px)" }}>
        {children}
      </main>

      <footer style={{ textAlign: "center", padding: "24px 0 12px", color: "var(--muted)", fontSize: "11px" }}>
        <p>© 2026 Multi-Org Data Protection Portal • Isolated Enclaves Secure Storage</p>
      </footer>
    </div>
  );
}
