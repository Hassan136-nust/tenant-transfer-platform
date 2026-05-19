import nodemailer from "nodemailer";

/**
 * Real Production Email Dispatch Utility
 * Connects to a live SMTP server (e.g. Gmail, SendGrid, Outlook) to send actual emails.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  fromName,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromName?: string;  // Display name shown as sender, e.g. "Organization Alpha"
  replyTo?: string;   // Sender org's real email shown in reply-to header
}) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Enforce real email requirement
  if (!host || !user || !pass) {
    console.error("[Email Broker] FATAL: Real SMTP credentials missing from .env.local!");
    throw new Error("SMTP Configurations required in .env.local to send real emails.");
  }

  // Create transporter pointing to real mail servers
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for port 465, false for 587
    auth: {
      user,
      pass,
    },
  });

  // Verify the connection configuration
  try {
    await transporter.verify();
    console.log("[Email Broker] SMTP Connection verified. Transmitting email to live network...");
  } catch (error) {
    console.error("[Email Broker] Failed to connect to real SMTP server:", error);
    throw new Error("Failed to connect to SMTP server. Check credentials.");
  }

  // Dispatch the email — FROM display name reflects the sending organization
  const displayName = fromName || "Secure Data Portal";
  const info = await transporter.sendMail({
    from: `"${displayName}" <${user}>`,
    to,
    subject,
    text,
    html,
    ...(replyTo ? { replyTo } : {}),
  });

  console.log(`[Email Broker] ✅ Real email delivered to ${to} from "${displayName}" (messageId: ${info.messageId})`);
  return true;
}

/**
 * Renders an enterprise-grade verification OTP template
 */
export function getOTPEmailTemplate(code: string) {
  return {
    subject: "🔐 Secure Login Verification Code",
    text: `Your Secure Workspace verification code is: ${code}. This code expires in 5 minutes.`,
    html: `
      <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="border-bottom: 2px solid #657cff; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #0f172a; font-size: 22px;">Secure Data Portal</h2>
        </div>
        <p style="font-size: 16px; line-height: 1.5; color: #334155;">You requested logging into your multi-organization dashboard.</p>
        <div style="background-color: #f8fafc; padding: 18px; border-radius: 8px; text-align: center; margin: 24px 0; border: 1px dashed #cbd5e1;">
          <small style="color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 8px; font-weight: bold;">Your Verification Code</small>
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 0.15em; color: #020617; font-family: monospace; display: block;">${code}</span>
        </div>
        <p style="font-size: 14px; color: #64748b; margin-top: 24px;">For security, this code is valid for exactly <strong>5 minutes</strong>. Do not forward or share this code with anyone.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <small style="color: #94a3b8; display: block; text-align: center;">Secure Data Portal Corp. Inc. • Automated System Dispatch</small>
      </div>
    `,
  };
}

/**
 * Renders a data transfer event alert template
 */
export function getTransferEmailTemplate(senderName: string, message: string, rowCount: number, transferMode?: string, senderEmail?: string) {
  const isNewOnly = transferMode === "new_only";
  const modeText = isNewOnly ? "Selective (New Original Records Only)" : "Complete (Whole Data Pool)";
  return {
    subject: `🚨 Data Transfer Alert: ${senderName} (${isNewOnly ? 'Selective' : 'Complete'})`,
    text: `Your organization received a data transfer of ${rowCount} rows from ${senderName} (${senderEmail || ''}) using "${modeText}" transfer mode with message: "${message}".`,
    html: `
      <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="border-bottom: 2px solid #28d9bc; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #0f172a; font-size: 22px;">Multi-Tenant Migration Ledger</h2>
        </div>
        <p style="font-size: 16px; line-height: 1.5; color: #334155;"><strong>${senderName}</strong> has completed a multi-organization ledger migration to your tenant space.</p>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 15px; color: #166534;"><strong>Transfer Summary:</strong></p>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #14532d; line-height: 1.6;">
            <li><strong>Source Owner:</strong> ${senderName}</li>
            ${senderEmail ? `<li><strong>Sender Custodian:</strong> ${senderEmail}</li>` : ''}
            <li><strong>Clones Created:</strong> ${rowCount} rows</li>
            <li><strong>Transfer Mode:</strong> ${modeText}</li>
            <li><strong>Isolated Tenant Status:</strong> Linked & Active</li>
          </ul>
        </div>
        <div style="background-color: #f8fafc; border-left: 4px solid #64748b; padding: 12px 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: bold;">Sender's Attached Message:</p>
          <p style="margin: 0; font-size: 15px; color: #334155; font-style: italic;">"${message || 'None'}"</p>
        </div>
        <p style="font-size: 14px; color: #64748b; margin-top: 24px;">The migrated database records have been logically cloned and attached to your organization dashboard view. Any further updates made to the records by the sender will not affect your localized copies.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <small style="color: #94a3b8; display: block; text-align: center;">Secure Data Portal Corp. Inc. • Automated System Dispatch</small>
      </div>
    `,
  };
}

// Cache invalidation tick - Next.js turbopack got stuck on old file handle!
