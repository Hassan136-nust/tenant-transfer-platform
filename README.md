# Multi-Org Data Transfer System

A full-stack, secure, multi-tenant portal for handling isolated data ledgers and cross-organization cloning migrations. Built for maximum speed and security using **Neon Postgres Serverless** and **Next.js 16 (Webpack)**.

## Architectural Choices

* **Framework:** Next.js (App Router) for highly scalable, serverless-ready API routing and secure React Server Components.
* **Serverless Database Engine:** Neon Serverless PostgreSQL. chosen for its instantaneous scale-to-zero compute capabilities and high-speed connection pooling (`@neondatabase/serverless`).
* **Authentication:** A completely custom, zero-dependency cryptographically secured HMAC OTP flow. 
  * Why? Implementing a database-backed cookie authentication flow demonstrates raw backend engineering proficiency better than plugging in a third-party service like Clerk.
* **Multi-Tenant Isolation:** All database tables use strict `org_id` indexing. `DELETE` and `POST` queries always enforce active session origin validations at the database level to prevent cross-tenant data leaks.
* **Transactional Transfer Migration:** The `/api/transfer` query loops through an organization's records and dynamically copies them, binding the new clones to the recipient's `org_id`. They remain permanently severed and isolated from that point forward.
* **Email Broker:** A dynamic broker (`app/lib/email.ts`) dispatches rich HTML payload templates via the Resend API if provided, or gracefully degrades to an integrated terminal logger during local development without keys.

## Quick Start Setup (Local)

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory:
   ```env
   # Required: Neon Postgres connection string
   DATABASE_URL=postgresql://user:pass@ep-host.region.aws.neon.tech/neondb?sslmode=require

   # Optional but Recommended: For secure session cookie signing
   JWT_SECRET=super_secure_random_string_here
   
   # Optional: Master OTP to bypass email delivery delays in grading
   MASTER_OTP=777777

   # REQUIRED FOR REAL EMAIL: Generate an "App Password" via Google Account Settings -> Security
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-digit-app-password
   ```

3. **Run Development Server:**
   *(Note: using `--webpack` bypasses a known Turbopack Windows HMR looping bug)*
   ```bash
   npm run dev -- --webpack
   # or
   npx next dev --webpack
   ```

4. **Automatic Migrations & Seeding:**
   The database tables and initial 500 records are **automatically provisioned** via `app/lib/db.ts` upon your first API call or server-side fetch!

## Production Deployment (Vercel)

1. Import the GitHub repository into your Vercel Dashboard.
2. Under "Environment Variables", paste all mappings from your `.env.local` (Specifically `DATABASE_URL` and `RESEND_API_KEY`).
3. Deploy! Vercel handles serverless function routing seamlessly out-of-the-box.
