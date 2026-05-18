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
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: (color: string) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.2s" }}><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
      )
    },
    {
      name: "Transfer Workspace",
      path: "/transfer",
      icon: (color: string) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.2s" }}><path d="m16 3 4 4-4 4" /><path d="M20 7H9a4 4 0 0 0-4 4v9" /><path d="m8 21-4-4 4-4" /><path d="M4 17h11a4 4 0 0 0 4-4V4" /></svg>
      )
    },
    {
      name: "Notification Inbox",
      path: "/inbox",
      icon: (color: string) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.2s" }}><path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /><path d="M12 19V14" /></svg>
      )
    },
  ];

  return (
    <div className="app-wrap" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="topbar" style={{
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        paddingBottom: "18px",
        marginBottom: "28px",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary-2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6Z" /></svg>
            <p className="brand" style={{ letterSpacing: "-0.025em", color: "#ffffff", fontWeight: "850", fontSize: "21px", margin: 0 }}>
              Secure Data Portal
            </p>
          </div>
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
            const activeColor = isActive ? "var(--primary-2)" : "var(--muted)";
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
                  color: activeColor,
                  border: isActive ? "1px solid rgba(20, 184, 166, 0.2)" : "1px solid transparent",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                {item.icon(activeColor)}
                <span>{item.name}</span>
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
