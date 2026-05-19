# 🔐 Secure Data Portal - Multi-Tenant Data Management Platform

A modern, enterprise-grade multi-tenant data management platform built with Next.js 16, featuring secure authentication, isolated data workspaces, and cross-organization data transfer capabilities.

![Next.js](https://img.shields.io/badge/Next.js-16.2.5-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-blue?style=flat-square&logo=typescript)
![React](https://img.shields.io/badge/React-19.2.6-61dafb?style=flat-square&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat-square&logo=postgresql)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
- [API Endpoints](#-api-endpoints)
- [Security Features](#-security-features)
- [Project Structure](#-project-structure)
- [Authentication Flow](#-authentication-flow)
- [Data Transfer System](#-data-transfer-system)
- [Development](#-development)
- [Production Deployment](#-production-deployment)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## 🌟 Overview

**Secure Data Portal** is a sophisticated multi-tenant SaaS platform that enables organizations to:

- **Manage isolated data workspaces** with strict tenant boundaries
- **Transfer data securely** between organizations with audit trails
- **Authenticate users** with email/password + OTP verification
- **Integrate Google SSO** for seamless authentication
- **Validate emails** in real-time using ZeroBounce API
- **Track all activities** with comprehensive notification inbox

The platform is designed with enterprise-grade security, featuring JWT-based sessions, rate limiting, input validation, and SQL injection prevention.

---

## ✨ Key Features

### 🔒 **Authentication & Security**
- **Multi-factor authentication** (Password + OTP)
- **Google OAuth 2.0 integration** (Google Sign-In)
- **JWT-based session management** with HttpOnly cookies
- **Email verification** with ZeroBounce API integration
- **Rate limiting** on all sensitive endpoints
- **CSRF protection** and secure headers
- **Password hashing** with bcrypt (10 rounds)

### 🏢 **Multi-Tenant Architecture**
- **Complete data isolation** per organization
- **Dynamic organization creation** during signup
- **Automatic workspace provisioning** with optional seed data (500 records)
- **Organization-scoped queries** with PostgreSQL row-level security
- **Tenant-specific dashboards** and analytics

### 📊 **Data Management**
- **CRUD operations** on organization records
- **Pagination** with configurable page size
- **Fuzzy search** across record names and custodian emails
- **Real-time record counts** and statistics
- **Optimistic UI updates** for instant feedback
- **Category filtering** and security level classification

### 🔄 **Cross-Organization Data Transfer**
- **Secure data cloning** between organizations
- **Transfer eligibility checks** to prevent duplicates
- **Reverse transfer detection** with smart warnings
- **Transfer modes**: All data or new records only
- **Email notifications** to recipients
- **Complete audit trail** in notification inbox
- **Source record tracking** to prevent circular transfers

### 📧 **Email System**
- **Real SMTP integration** (Gmail, SendGrid, etc.)
- **OTP delivery** with professional templates
- **Transfer notifications** with detailed summaries
- **Customizable sender names** per organization
- **HTML and plain text** email support

### 🎨 **Modern UI/UX**
- **Dark theme** with glassmorphism effects
- **Responsive design** for all screen sizes
- **Real-time validation** with instant feedback
- **Loading states** and skeleton screens
- **Toast notifications** for user actions
- **Smooth animations** and transitions

---

## 🛠 Tech Stack

### **Frontend**
- **Next.js 16.2.5** - React framework with App Router
- **React 19.2.6** - UI library with Server Components
- **TypeScript 6.0.3** - Type-safe JavaScript
- **CSS Modules** - Scoped styling with custom properties

### **Backend**
- **Next.js API Routes** - Serverless API endpoints
- **Node.js** - JavaScript runtime
- **Jose** - JWT signing and verification
- **bcryptjs** - Password hashing

### **Database**
- **Neon PostgreSQL** - Serverless Postgres database
- **@neondatabase/serverless** - Neon database driver

### **Authentication**
- **Google Identity Services** - OAuth 2.0 integration
- **JWT (JSON Web Tokens)** - Session management
- **OTP (One-Time Password)** - Email verification

### **Email Services**
- **Nodemailer** - Email sending library
- **SMTP** - Email protocol (Gmail, SendGrid, etc.)

### **Validation & Security**
- **ZeroBounce API** - Real-time email validation
- **Custom validation utilities** - Input sanitization
- **Rate limiting** - In-memory request throttling

---

## 🏗 Architecture

### **System Architecture Overview**

This platform follows a **serverless, multi-tenant SaaS architecture** with strict data isolation and modern security practices.

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Org Alpha  │  │   Org Beta   │  │   Org Gamma  │      │
│  │   Dashboard  │  │   Dashboard  │  │   Dashboard  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Session Verification → Organization ID Extraction     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer (Neon)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  org_id='a'  │  │  org_id='b'  │  │  org_id='c'  │      │
│  │  500 rows    │  │  500 rows    │  │  500 rows    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Architectural Decisions & Rationale

### **1. Next.js 16 with App Router**

**Choice:** Next.js App Router with React Server Components

**Rationale:**
- **Server Components** reduce client-side JavaScript bundle size
- **API Routes** provide serverless backend without separate server
- **Middleware** enables route protection at the edge
- **Built-in optimization** for images, fonts, and scripts
- **Vercel deployment** offers seamless CI/CD and global CDN

**Trade-offs:**
- ✅ Faster page loads and better SEO
- ✅ Simplified deployment (single codebase)
- ⚠️ Learning curve for App Router patterns

---

### **2. Multi-Tenant Architecture with Shared Database**

**Choice:** Single database with `org_id` column for tenant isolation

**Rationale:**
- **Cost-effective** - One database instance serves all tenants
- **Simplified maintenance** - Single schema to manage
- **Cross-tenant features** - Data transfers between organizations
- **Scalable** - Neon Postgres handles thousands of tenants

**Implementation:**
```typescript
// Every query includes org_id filter
const rows = await query(
  `SELECT * FROM organization_data WHERE org_id = $1`,
  [session.orgId]
);
```

**Alternative Considered:**
- **Database-per-tenant** - Rejected due to complexity and cost
- **Schema-per-tenant** - Rejected due to migration overhead

**Security Measures:**
- ✅ Middleware verifies JWT before API access
- ✅ All queries parameterized (SQL injection prevention)
- ✅ Session includes `orgId` extracted from verified JWT
- ✅ Database indexes on `org_id` for performance

---

### **3. JWT-Based Session Management**

**Choice:** JWT tokens stored in HttpOnly cookies

**Rationale:**
- **Stateless authentication** - No server-side session storage
- **Scalable** - Works across serverless functions
- **Secure** - HttpOnly prevents XSS attacks
- **Self-contained** - Token includes user data (email, orgId, orgName)

**Implementation:**
```typescript
// Sign JWT with 24-hour expiration
const token = await signSession({
  email: user.email,
  orgId: user.orgId,
  orgName: user.orgName,
  role: 'admin'
});

// Store in HttpOnly cookie
response.headers.set('Set-Cookie', 
  `session=${token}; HttpOnly; SameSite=Lax; Secure; Max-Age=86400`
);
```

**Alternative Considered:**
- **Session database** - Rejected due to added complexity
- **Redis sessions** - Rejected due to infrastructure cost

**Security Measures:**
- ✅ HttpOnly flag prevents JavaScript access
- ✅ Secure flag enforces HTTPS in production
- ✅ SameSite=Lax prevents CSRF attacks
- ✅ Token blacklisting on logout
- ✅ 24-hour expiration with automatic renewal

---

### **4. Two-Factor Authentication (Password + OTP)**

**Choice:** Email-based OTP as second factor

**Rationale:**
- **Enhanced security** - Prevents password-only breaches
- **User-friendly** - No app installation required
- **Email verification** - Confirms email ownership
- **Flexible** - Works with any email provider

**Flow:**
1. User enters password → Verified against bcrypt hash
2. OTP generated (6 digits) → Stored in database with 5-min expiry
3. Email sent via SMTP → User receives code
4. User enters OTP → Verified and session created

**Alternative Considered:**
- **SMS OTP** - Rejected due to cost and phone number requirement
- **TOTP (Google Authenticator)** - Considered for future enhancement

**Security Measures:**
- ✅ OTP expires after 5 minutes
- ✅ One-time use (marked as verified after use)
- ✅ Rate limiting (3 OTP requests per minute)
- ✅ Master OTP for development only

---

### **5. Google OAuth Integration**

**Choice:** Google Identity Services (GSI) for SSO

**Rationale:**
- **User convenience** - One-click sign-in for Google users
- **Email verification** - Google-verified emails are trusted
- **Security** - Leverages Google's authentication infrastructure
- **No password storage** - Reduces security liability

**Implementation:**
```typescript
// Google Sign-In auto-fills email
google.accounts.id.initialize({
  client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  callback: (response) => {
    const decoded = decodeJwt(response.credential);
    setEmail(decoded.email); // Pre-fill email field
  }
});
```

**Note:** Password still required for account creation (hybrid approach)

---

### **6. Neon Serverless PostgreSQL**

**Choice:** Neon as database provider

**Rationale:**
- **Serverless** - Auto-scales with traffic
- **Cost-effective** - Pay only for usage
- **Fast cold starts** - Sub-second connection times
- **Branching** - Database branches for development
- **Vercel integration** - Seamless deployment

**Connection Pooling:**
```typescript
import { Pool } from '@neondatabase/serverless';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
```

**Alternative Considered:**
- **Supabase** - Rejected due to vendor lock-in
- **PlanetScale** - Rejected due to MySQL limitations
- **AWS RDS** - Rejected due to always-on cost

---

### **7. Email Validation with ZeroBounce**

**Choice:** Real-time email validation before OTP sending

**Rationale:**
- **Prevent fake emails** - Blocks disposable/invalid addresses
- **Reduce bounce rate** - Improves email deliverability
- **Typo detection** - Suggests corrections (e.g., "gmial.com" → "gmail.com")
- **Spam trap detection** - Protects sender reputation

**Implementation:**
```typescript
const result = await validateEmail(email);

if (!['valid', 'catch-all'].includes(result.status)) {
  return { error: 'Invalid email address' };
}
```

**Caching Strategy:**
- ✅ 1-hour in-memory cache per email
- ✅ Reduces API calls and improves speed
- ✅ Cache invalidation on server restart

**Graceful Degradation:**
- If API key not configured → Validation skipped (development mode)
- If API fails → Fail-open (allow email to prevent blocking users)

---

### **8. Rate Limiting Strategy**

**Choice:** In-memory rate limiting with configurable presets

**Rationale:**
- **Prevent abuse** - Blocks brute-force attacks
- **Resource protection** - Prevents API overload
- **User experience** - Provides clear retry-after headers

**Implementation:**
```typescript
const rateLimit = checkRateLimit(request, RateLimitPresets.AUTH);

if (!rateLimit.success) {
  return NextResponse.json(
    { error: 'Too many requests', retryAfter: rateLimit.reset },
    { status: 429 }
  );
}
```

**Rate Limit Tiers:**
- **Authentication**: 5 requests/minute (strict)
- **OTP Generation**: 3 requests/minute (strict)
- **Data Transfers**: 5 transfers/hour (moderate)
- **API Reads**: 100 requests/minute (lenient)

**Alternative Considered:**
- **Redis rate limiting** - Planned for production scale
- **Cloudflare rate limiting** - Considered for DDoS protection

---

### **9. Data Transfer System Design**

**Choice:** Record cloning with source tracking

**Rationale:**
- **Data isolation** - Each org owns its copy
- **Audit trail** - Complete transfer history
- **Circular prevention** - Detects reverse transfers
- **Selective transfer** - New records only option

**Implementation:**
```typescript
// Clone records with source tracking
INSERT INTO organization_data (org_id, ..., source_record_id)
SELECT $1, ..., id FROM organization_data WHERE org_id = $2
```

**Key Features:**
- ✅ `source_record_id` links clones to originals
- ✅ Prevents duplicate transfers (eligibility check)
- ✅ Reverse transfer warning with countdown
- ✅ Email notifications to recipients

**Alternative Considered:**
- **Shared records** - Rejected due to security concerns
- **Reference-only** - Rejected due to data ownership issues

---

### **10. Client-Side State Management**

**Choice:** React Context API for session management

**Rationale:**
- **Simple** - No external state library needed
- **Type-safe** - Full TypeScript support
- **Server-first** - Session verified on server, cached on client
- **Lightweight** - Minimal bundle size impact

**Implementation:**
```typescript
// Session provider wraps entire app
<DemoSessionProvider>
  {children}
</DemoSessionProvider>

// Components access session
const { email, orgId, orgName } = useDemoSession();
```

**Alternative Considered:**
- **Redux** - Rejected as overkill for simple session state
- **Zustand** - Considered for future complex state needs

---

### **Authentication Flow**

```
User → Login Page → Email/Password + Google SSO
                         ↓
                   Verify Password (bcrypt)
                         ↓
                   Generate OTP (6 digits)
                         ↓
                   Send Email (SMTP)
                         ↓
                   User Enters OTP
                         ↓
                   Verify OTP Code
                         ↓
                   Create JWT Session (24h)
                         ↓
                   Set HttpOnly Cookie
                         ↓
                   Redirect to Dashboard
```

---

### **Performance Optimizations**

1. **Database Indexing**
   - `org_id` indexed for fast tenant filtering
   - `source_record_id` indexed for transfer eligibility checks
   - Composite indexes for common query patterns

2. **Optimistic UI Updates**
   - Instant feedback on add/delete operations
   - Rollback on server error
   - Reduces perceived latency

3. **Parallel API Calls**
   - Count and data queries run concurrently
   - Email validation cached for 1 hour
   - Transfer eligibility cached per recipient

4. **Client-Side Caching**
   - Email validation results cached
   - Transfer eligibility cached
   - Reduces redundant API calls

5. **Debounced Search**
   - 220ms delay before search query
   - Prevents excessive database queries
   - Smooth user experience

---

## 🚀 Getting Started

### **Prerequisites**

- **Node.js** 18+ and npm/yarn
- **PostgreSQL database** (Neon recommended)
- **SMTP credentials** (Gmail, SendGrid, etc.)
- **Google OAuth Client ID** (optional, for SSO)
- **ZeroBounce API Key** (optional, for email validation)

### **Installation**

1. **Clone the repository**
```bash
git clone <repository-url>
cd UI
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Set up environment variables**
```bash
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

4. **Run database migrations**
The database schema is automatically created on first run. Tables include:
- `organizations` - Tenant organizations
- `organization_data` - Isolated data records
- `otp_records` - Email verification codes
- `transfers` - Cross-org transfer audit log
- `blacklisted_tokens` - Revoked JWT tokens

5. **Start the development server**
```bash
npm run dev
# or
yarn dev
```

6. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🔐 Environment Variables

Create a `.env.local` file in the root directory:

```env
# ── Database ────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# ── JWT Secret ──────────────────────────────────────────────
JWT_SECRET=your_super_secure_random_string_here

# ── Google OAuth (Optional) ─────────────────────────────────
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# ── ZeroBounce Email Validation (Optional) ──────────────────
ZEROBOUNCE_API_KEY=your_zerobounce_api_key

# ── SMTP Email Configuration ────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# ── Seed Data Custodian Emails ──────────────────────────────
CUSTODIAN_FINANCE=finance-audit@example.com
CUSTODIAN_OPERATIONS=ops-lead@example.com
CUSTODIAN_ENGINEERING=eng-platform@example.com
CUSTODIAN_HR=hr-compliance@example.com
CUSTODIAN_MARKETING=mktg-ops@example.com
```

### **Required Variables**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing (generate with `openssl rand -hex 32`)

### **Optional Variables**
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Enable Google Sign-In
- `ZEROBOUNCE_API_KEY` - Enable real-time email validation
- `SMTP_*` - Enable real email sending (OTP, notifications)
- `MASTER_OTP` - Bypass email verification in development

---

## 🗄 Database Schema

### **organizations**
```sql
CREATE TABLE organizations (
  id VARCHAR(50) PRIMARY KEY,           -- Slug-based org ID (e.g., 'acme-corp')
  name VARCHAR(100) NOT NULL,           -- Display name
  email VARCHAR(255) NOT NULL,          -- Admin email
  password VARCHAR(255)                 -- Hashed password (bcrypt)
);
```

### **organization_data**
```sql
CREATE TABLE organization_data (
  id SERIAL PRIMARY KEY,
  org_id VARCHAR(50) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  record_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  metric_value NUMERIC(12, 2) NOT NULL,
  security_level VARCHAR(50) DEFAULT 'Confidential',
  status VARCHAR(50) DEFAULT 'Active',
  custodian_email VARCHAR(255) NOT NULL,
  source_record_id INTEGER,             -- Tracks origin for transferred records
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_org_data_org_id ON organization_data(org_id);
CREATE INDEX idx_org_data_category ON organization_data(category);
CREATE INDEX idx_org_data_source_record_id ON organization_data(source_record_id);
```

### **otp_records**
```sql
CREATE TABLE otp_records (
  email VARCHAR(255) PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE
);
```

### **transfers**
```sql
CREATE TABLE transfers (
  id SERIAL PRIMARY KEY,
  sender_org_id VARCHAR(50) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_org_id VARCHAR(50) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  message TEXT,
  row_count INTEGER NOT NULL,
  transferred_at TIMESTAMP DEFAULT NOW()
);
```

### **blacklisted_tokens**
```sql
CREATE TABLE blacklisted_tokens (
  token_hash VARCHAR(64) PRIMARY KEY,
  expires_at TIMESTAMP NOT NULL
);
```

---

## 🔌 API Endpoints

### **Authentication**

#### `POST /api/auth/login`
Verify user credentials (password only, no OTP yet)
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### `POST /api/auth/signup`
Create new organization and user account
```json
{
  "email": "admin@neworg.com",
  "password": "securepass123",
  "orgName": "New Organization",
  "otpCode": "123456",
  "seedData": true
}
```

#### `POST /api/auth/otp`
Generate and send OTP code via email
```json
{
  "email": "user@example.com",
  "flow": "login" | "signup"
}
```

#### `POST /api/auth/verify`
Verify OTP code and create session
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

#### `GET /api/auth/check-email?email=user@example.com`
Check if email exists in database

#### `GET /api/auth/session`
Get current session information

#### `POST /api/auth/logout`
Invalidate current session

---

### **Data Management**

#### `GET /api/rows?page=1&limit=10&search=query&category=Finance`
Fetch paginated organization records
- **Query Parameters:**
  - `page` - Page number (default: 1)
  - `limit` - Records per page (default: 10)
  - `search` - Fuzzy search query
  - `category` - Filter by category

#### `POST /api/rows`
Create new record (initialized as "unlisted")

#### `DELETE /api/rows/[id]`
Delete specific record by ID

---

### **Organizations**

#### `GET /api/organizations`
Get list of all organizations (excluding current user's org)

---

### **Data Transfer**

#### `GET /api/transfer?recipientOrgId=org-b`
Check transfer eligibility and pending record count

#### `POST /api/transfer`
Execute cross-organization data transfer
```json
{
  "recipientOrgId": "org-b",
  "message": "Q1 financial data for review",
  "transferMode": "all" | "new_only"
}
```

#### `GET /api/transfers`
Get transfer history (sent and received)

---

## 🛡 Security Features

### **1. Authentication Security**
- ✅ **Password hashing** with bcrypt (10 rounds)
- ✅ **JWT tokens** with 24-hour expiration
- ✅ **HttpOnly cookies** to prevent XSS attacks
- ✅ **Secure flag** in production (HTTPS only)
- ✅ **SameSite=Lax** to prevent CSRF
- ✅ **Token blacklisting** on logout

### **2. Input Validation**
- ✅ **Email format validation** (RFC 5322 compliant)
- ✅ **Password strength requirements** (8+ chars, letters + numbers)
- ✅ **SQL injection prevention** (parameterized queries)
- ✅ **XSS prevention** (input sanitization)
- ✅ **Request body validation** (required fields check)

### **3. Rate Limiting**
- ✅ **Authentication endpoints**: 5 requests/minute
- ✅ **OTP generation**: 3 requests/minute
- ✅ **API endpoints**: 30 requests/minute
- ✅ **Data transfers**: 5 transfers/hour

### **4. Email Validation**
- ✅ **ZeroBounce integration** for real-time validation
- ✅ **Disposable email detection**
- ✅ **Spam trap detection**
- ✅ **Typo suggestions** (did you mean?)
- ✅ **MX record verification**

### **5. Security Headers**
```javascript
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: [comprehensive CSP policy]
```

### **6. Database Security**
- ✅ **Tenant isolation** with org_id filtering
- ✅ **Parameterized queries** (no string concatenation)
- ✅ **Foreign key constraints** for referential integrity
- ✅ **Cascade deletes** for data cleanup
- ✅ **Indexed queries** for performance

---

## 📁 Project Structure

```
UI/
├── app/
│   ├── api/                          # API Routes
│   │   ├── auth/                     # Authentication endpoints
│   │   │   ├── check-email/
│   │   │   ├── login/
│   │   │   ├── logout/
│   │   │   ├── otp/
│   │   │   ├── session/
│   │   │   ├── signup/
│   │   │   └── verify/
│   │   ├── organizations/            # Organization management
│   │   ├── rows/                     # Data CRUD operations
│   │   │   └── [id]/
│   │   ├── transfer/                 # Data transfer logic
│   │   └── transfers/                # Transfer history
│   │
│   ├── components/                   # React Components
│   │   ├── app-shell.tsx            # Main layout with navigation
│   │   └── demo-session-provider.tsx # Client-side session context
│   │
│   ├── lib/                          # Utility Libraries
│   │   ├── auth.ts                  # JWT signing/verification
│   │   ├── db.ts                    # Database connection & queries
│   │   ├── email.ts                 # Email sending (SMTP)
│   │   ├── rate-limit.ts            # Rate limiting logic
│   │   ├── validation.ts            # Input validation utilities
│   │   └── zerobounce.ts            # Email validation API
│   │
│   ├── dashboard/                    # Dashboard page
│   ├── inbox/                        # Notification inbox page
│   ├── login/                        # Login page
│   ├── signup/                       # Signup page
│   ├── transfer/                     # Data transfer page
│   │
│   ├── globals.css                   # Global styles
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Home page (redirects to login)
│
├── middleware.ts                     # Route protection middleware
├── next.config.mjs                   # Next.js configuration
├── tsconfig.json                     # TypeScript configuration
├── package.json                      # Dependencies
├── .env.local                        # Environment variables (not in git)
└── README.md                         # This file
```

---

## 🔄 Authentication Flow

### **Signup Flow**
1. User enters email, password, and organization name
2. Optional: Google Sign-In auto-fills email
3. System checks email availability (real-time)
4. System validates email with ZeroBounce (if configured)
5. OTP code generated and sent via email
6. User enters 6-digit OTP code
7. System verifies OTP and creates organization
8. Optional: Seed 500 demo records
9. JWT session created and stored in HttpOnly cookie
10. User redirected to dashboard

### **Login Flow**
1. User enters email and password
2. Optional: Google Sign-In auto-fills email
3. System verifies password against database
4. OTP code generated and sent via email
5. User enters 6-digit OTP code
6. System verifies OTP code
7. JWT session created and stored in HttpOnly cookie
8. User redirected to dashboard

### **Session Management**
- Sessions expire after 24 hours
- Middleware protects routes: `/dashboard`, `/transfer`, `/inbox`
- Logout blacklists JWT token to prevent reuse
- Session data includes: email, orgId, orgName, role

---

## 🔄 Data Transfer System

### **Transfer Eligibility**
The system prevents duplicate transfers by tracking:
- **Source record IDs** - Links cloned records to originals
- **Transfer history** - Logs all transfers in `transfers` table
- **Pending count** - Calculates records not yet transferred

### **Transfer Modes**

#### **1. All Data Transfer**
Transfers all records in the organization, including:
- Original records created by the organization
- Previously received records from other organizations

#### **2. New Records Only**
Transfers only new original records, excluding:
- Records previously received from the recipient
- Prevents circular transfer loops

### **Reverse Transfer Detection**
When transferring back to an organization that previously sent data:
- **Warning modal** appears with 5-second countdown
- **Two options** presented:
  - Transfer new records only (recommended)
  - Transfer all data (creates duplicates)

### **Transfer Process**
1. User selects recipient organization
2. System checks eligibility and pending count
3. User enters custom message
4. User confirms transfer (with reverse warning if applicable)
5. System clones records with `source_record_id` tracking
6. Transfer logged in `transfers` table
7. Email notification sent to recipient
8. Both organizations see transfer in inbox

---

## 💻 Development

### **Run Development Server**
```bash
npm run dev
```

### **Build for Production**
```bash
npm run build
```

### **Start Production Server**
```bash
npm start
```

### **Lint Code**
```bash
npm run lint
```

### **Development Tips**


#### **Database Inspection**
The database schema is auto-created on first run. Check logs for:
```
[DB Init] Starting auto-migration and seeding...
[DB Init] Schema auto-migration complete!
```

#### **Email Testing**
If SMTP is not configured, OTP codes are printed to console:
```
🔑 [OTP CODE FOR user@example.com]: 123456 🔑
```

#### **Rate Limit Testing**
Clear rate limits for a specific IP:
```typescript
import { clearRateLimit } from './app/lib/rate-limit';
clearRateLimit('127.0.0.1');
```

---

## 🚀 Production Deployment

### **Vercel Deployment** (Recommended)

1. **Push to GitHub**
```bash
git push origin main
```

2. **Import to Vercel**
- Go to [vercel.com](https://vercel.com)
- Click "Import Project"
- Select your repository

3. **Configure Environment Variables**
Add all variables from `.env.local` in Vercel dashboard

4. **Deploy**
Vercel automatically builds and deploys on every push

### **Environment-Specific Settings**

#### **Production**
- Set `NODE_ENV=production`
- Enable `Secure` flag on cookies (HTTPS only)
- Use production database (not development)
- Configure real SMTP credentials
- Set strong `JWT_SECRET` (32+ characters)

#### **Security Checklist**
- ✅ HTTPS enabled (SSL certificate)
- ✅ Environment variables secured
- ✅ Database connection encrypted
- ✅ Rate limiting enabled
- ✅ Security headers configured
- ✅ CORS properly configured
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention
- ✅ XSS prevention

---

## 🐛 Troubleshooting

### **Database Connection Issues**
```
Error: DATABASE_URL is not defined
```
**Solution:** Add `DATABASE_URL` to `.env.local`

### **Email Not Sending**
```
[Email Broker] FATAL: Real SMTP credentials missing
```
**Solution:** Configure SMTP variables in `.env.local` or use master OTP

### **Google Sign-In Not Working**
```
[gsi] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured
```
**Solution:** Add Google OAuth Client ID to `.env.local`

### **Rate Limit Errors**
```
Too many login attempts. Please try again later.
```
**Solution:** Wait for rate limit window to reset or clear rate limit in development

### **OTP Expired**
```
Invalid or expired OTP verification code
```
**Solution:** OTP codes expire after 5 minutes. Request a new code

### **Transfer Blocked**
```
Data Already Transferred - No duplicate transfers allowed
```
**Solution:** Add new records or modify existing ones before transferring again

---

## 📝 License

This project is proprietary and confidential. All rights reserved.

---

## 👥 Support

For issues, questions, or feature requests, please contact the development team.

---

## 🎯 Roadmap

### **Planned Features**
- [ ] Two-factor authentication (TOTP)
- [ ] Role-based access control (RBAC)
- [ ] Advanced analytics dashboard
- [ ] Export data to CSV/Excel
- [ ] Bulk data operations
- [ ] API key management
- [ ] Webhook integrations
- [ ] Audit log viewer
- [ ] Custom email templates
- [ ] Multi-language support

---

**Built with ❤️ using Next.js, React, and TypeScript**
