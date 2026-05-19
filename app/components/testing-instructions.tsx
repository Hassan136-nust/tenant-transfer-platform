"use client";

import { useState } from "react";

export function TestingInstructions() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Floating Info trigger button */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                style={{
                    position: "fixed",
                    top: "24px",
                    right: "24px",
                    background: "rgba(255, 255, 255, 0.03)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                    padding: "10px 18px",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "650",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
                    zIndex: 1000,
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
                    e.currentTarget.style.borderColor = "var(--primary-2)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.transform = "translateY(0)";
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary-2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                📋 System Testing Guide
            </button>

            {/* Glassmorphic overlay card modal */}
            {isOpen && (
                <div style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0, 0, 0, 0.65)",
                    backdropFilter: "blur(16px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    padding: "20px",
                    animation: "fadeIn 0.2s ease"
                }}
                    onClick={() => setIsOpen(false)}
                >
                    <div style={{
                        width: "100%",
                        maxWidth: "640px",
                        background: "linear-gradient(135deg, rgba(20, 20, 25, 0.85) 0%, rgba(10, 10, 15, 0.95) 100%)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "24px",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(20, 184, 166, 0.08)",
                        padding: "32px",
                        position: "relative",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        color: "#ffffff"
                    }}
                        onClick={(e) => e.stopPropagation()} // Prevent closing on modal clicking
                    >
                        {/* Absolute close trigger */}
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{
                                position: "absolute",
                                top: "20px",
                                right: "20px",
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.05)",
                                borderRadius: "50%",
                                width: "36px",
                                height: "36px",
                                color: "var(--muted)",
                                fontSize: "18px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(244, 63, 94, 0.1)";
                                e.currentTarget.style.borderColor = "var(--danger)";
                                e.currentTarget.style.color = "#ffffff";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                                e.currentTarget.style.color = "var(--muted)";
                            }}
                        >
                            ✕
                        </button>

                        {/* Checklist header */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                            <span className="badge" style={{ margin: 0, background: "rgba(20, 184, 166, 0.1)", color: "var(--primary-2)" }}>Testing Protocol</span>
                        </div>

                        <h3 style={{ color: "white", fontSize: "20px", fontWeight: "800", marginTop: 0, marginBottom: "8px", letterSpacing: "-0.01em" }}>
                            Hello Team Active,
                        </h3>

                        <p className="muted-text" style={{ fontSize: "14.5px", lineHeight: "1.5", marginTop: 0, marginBottom: "24px" }}>
                            Please follow these steps while testing the multi-tenant secure transfer system:
                        </p>

                        {/* Instructions Steps List */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

                            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                                <div style={{
                                    background: "rgba(20, 184, 166, 0.08)", border: "1px solid rgba(20, 184, 166, 0.2)",
                                    width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px"
                                }}>
                                    <span style={{ color: "var(--primary-2)", fontSize: "12.5px", fontWeight: "750" }}>1</span>
                                </div>
                                <div>
                                    <h4 style={{ color: "white", fontSize: "14.5px", fontWeight: "650", margin: 0 }}>Register Dynamic Workspaces</h4>
                                    <p style={{ color: "var(--muted)", fontSize: "13.5px", margin: "4px 0 0 0", lineHeight: "1.4" }}>
                                        First, sign up for a new account. Create exactly <strong>2 distinct organization workspaces</strong> (since the system dynamically performs OTP email notifications).
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                                <div style={{
                                    background: "rgba(20, 184, 166, 0.08)", border: "1px solid rgba(20, 184, 166, 0.2)",
                                    width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px"
                                }}>
                                    <span style={{ color: "var(--primary-2)", fontSize: "12.5px", fontWeight: "750" }}>2</span>
                                </div>
                                <div>
                                    <h4 style={{ color: "white", fontSize: "14.5px", fontWeight: "650", margin: 0 }}>Enforce OTP Caching Waits</h4>
                                    <p style={{ color: "var(--muted)", fontSize: "13.5px", margin: "4px 0 0 0", lineHeight: "1.4" }}>
                                        After creating the first account and receiving the OTP, <strong>wait around 3 seconds</strong> before submitting the second account registration. Keep the second account in the OTP verification view initially.
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                                <div style={{
                                    background: "rgba(20, 184, 166, 0.08)", border: "1px solid rgba(20, 184, 166, 0.2)",
                                    width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px"
                                }}>
                                    <span style={{ color: "var(--primary-2)", fontSize: "12.5px", fontWeight: "750" }}>3</span>
                                </div>
                                <div>
                                    <h4 style={{ color: "white", fontSize: "14.5px", fontWeight: "650", margin: 0 }}>Dynamic Ledger Database Seeding</h4>
                                    <p style={{ color: "var(--muted)", fontSize: "13.5px", margin: "4px 0 0 0", lineHeight: "1.4" }}>
                                        For mock data evaluations:
                                    </p>
                                    <ul style={{ color: "var(--muted)", fontSize: "13.5px", margin: "6px 0 0 16px", padding: 0, listStyleType: "circle", lineHeight: "1.4" }}>
                                        <li><strong style={{ color: "#ffffff" }}>1st Organization:</strong> Enable the **"Pre-Populate Demo Records"** option card to seed 500 rows.</li>
                                        <li><strong style={{ color: "#ffffff" }}>2nd Organization:</strong> Uncheck the option card so it starts empty with 0 rows.</li>
                                    </ul>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                                <div style={{
                                    background: "rgba(20, 184, 166, 0.08)", border: "1px solid rgba(20, 184, 166, 0.2)",
                                    width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px"
                                }}>
                                    <span style={{ color: "var(--primary-2)", fontSize: "12.5px", fontWeight: "750" }}>4</span>
                                </div>
                                <div>
                                    <h4 style={{ color: "white", fontSize: "14.5px", fontWeight: "650", margin: 0 }}>Initiate Cross-Tenant Transfer</h4>
                                    <p style={{ color: "var(--muted)", fontSize: "13.5px", margin: "4px 0 0 0", lineHeight: "1.4" }}>
                                        Log into the 1st organization (500 rows) and transfer data to the 2nd (empty) organization. Verify that subsequent duplicate transfer attempts to the same recipient are blocked unless new rows are added.
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                                <div style={{
                                    background: "rgba(20, 184, 166, 0.08)", border: "1px solid rgba(20, 184, 166, 0.2)",
                                    width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px"
                                }}>
                                    <span style={{ color: "var(--primary-2)", fontSize: "12.5px", fontWeight: "750" }}>5</span>
                                </div>
                                <div>
                                    <h4 style={{ color: "white", fontSize: "14.5px", fontWeight: "650", margin: 0 }}>Test Selective Reverse Transfer Guard</h4>
                                    <p style={{ color: "var(--muted)", fontSize: "13.5px", margin: "4px 0 0 0", lineHeight: "1.4" }}>
                                        Log into the 2nd organization and attempt a reverse transfer back to the 1st org:
                                    </p>
                                    <ul style={{ color: "var(--muted)", fontSize: "13.5px", margin: "6px 0 0 16px", padding: 0, listStyleType: "circle", lineHeight: "1.4" }}>
                                        <li>The system triggers a warning modal if data has not changed.</li>
                                        <li>Toggle the <strong>"Transfer New Data Only"</strong> selector option versus complete sync to prevent loop redundancy.</li>
                                    </ul>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                                <div style={{
                                    background: "rgba(20, 184, 166, 0.08)", border: "1px solid rgba(20, 184, 166, 0.2)",
                                    width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px"
                                }}>
                                    <span style={{ color: "var(--primary-2)", fontSize: "12.5px", fontWeight: "750" }}>6</span>
                                </div>
                                <div>
                                    <h4 style={{ color: "white", fontSize: "14.5px", fontWeight: "650", margin: 0 }}>Review Ledgers & Rich Email Alerting</h4>
                                    <p style={{ color: "var(--muted)", fontSize: "13.5px", margin: "4px 0 0 0", lineHeight: "1.4" }}>
                                        Audit your inbox notifications on both current workspaces, checking custom messages attached along with secure data payloads.
                                    </p>
                                </div>
                            </div>

                        </div>

                        {/* Cyan dismiss CTA button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="btn"
                            style={{
                                width: "100%",
                                marginTop: "28px",
                                height: "48px",
                                fontSize: "14.5px",
                                fontWeight: "700",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 6px 20px rgba(20, 184, 166, 0.2)"
                            }}
                        >
                            Start System Evaluation
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
