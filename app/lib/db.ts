import { Pool } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in the environment variables.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Executes a query with proper logging and automatic single-connection release
 */
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[DB Query] OK - ${duration}ms | rows=${res.rowCount}`);
    return res;
  } catch (err: any) {
    console.error(`[DB Query] FAILED: ${err.message}\nQuery: ${text}`);
    throw err;
  }
}

/**
 * Automatically provisions SQL schema tables and seeds initial mock tenant data
 */
export async function initDatabase() {
  console.log("[DB Init] Starting auto-migration and seeding...");

  // 1. Create tables in proper transactional order
  await query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password VARCHAR(255)
    );
  `);

  // Gracefully alter existing setups to add password if not present
  await query(`
      ALTER TABLE organizations ADD COLUMN IF NOT EXISTS password VARCHAR(255);
    `);

  await query(`
    CREATE TABLE IF NOT EXISTS organization_data (
      id SERIAL PRIMARY KEY,
      org_id VARCHAR(50) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      record_name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      metric_value NUMERIC(12, 2) NOT NULL,
      security_level VARCHAR(50) DEFAULT 'Confidential',
      status VARCHAR(50) DEFAULT 'Active',
      custodian_email VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Add indexing on tenant and category/record searches for maximum select query latency
  await query(`
    CREATE INDEX IF NOT EXISTS idx_org_data_org_id ON organization_data(org_id);
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_org_data_category ON organization_data(category);
  `);

  // Alter existing setup to safely ensure the source_record_id column exists
  await query(`
      ALTER TABLE organization_data ADD COLUMN IF NOT EXISTS source_record_id INTEGER;
    `);

  // Create high-efficiency indexes for zero-lag correlated subquery evaluation
  await query(`
      CREATE INDEX IF NOT EXISTS idx_org_data_source_record_id ON organization_data(source_record_id);
    `);
  await query(`
      CREATE INDEX IF NOT EXISTS idx_org_data_org_source ON organization_data(org_id, source_record_id);
    `);

  await query(`
      CREATE INDEX IF NOT EXISTS idx_org_data_org_id_desc ON organization_data(org_id, id DESC);
    `);

  await query(`
    CREATE TABLE IF NOT EXISTS otp_records (
      email VARCHAR(255) PRIMARY KEY,
      code VARCHAR(10) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      verified BOOLEAN DEFAULT FALSE
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS transfers (
      id SERIAL PRIMARY KEY,
      sender_org_id VARCHAR(50) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      recipient_org_id VARCHAR(50) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      message TEXT,
      row_count INTEGER NOT NULL,
      transferred_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 1.5 Create blacklisted_tokens table to support sign-out session blacklisting
  await query(`
    CREATE TABLE IF NOT EXISTS blacklisted_tokens (
      token_hash VARCHAR(64) PRIMARY KEY,
      expires_at TIMESTAMP NOT NULL
    );
  `);

  // 2. Schema loaded cleanly
  console.log("[DB Init] Schema auto-migration complete! Database is clean and ready.");
}

/**
 * Seeds exactly 500 customized enterprise data records for a specific organization ID
 */
export async function seedOrganizationRows(orgId: string) {
  console.log(`[DB Seed] Seeding 500 premium rows for Organization: ${orgId}...`);

  const categories = ["Finance", "Operations", "Engineering", "Human Resources", "Marketing"];
  const securities = ["Confidential", "Internal Use", "Restricted", "Highest Clearance"];
  const statuses = ["Active", "Active", "Active", "Archived", "Review Needed"];

  const baseNames = {
    Finance: ["Q1 Revenue Ledger", "Operating Budget Forecast", "Capital Ledger Rollup", "Equity Allocations", "Corporate Tax Audit", "Audit Worksheet Sheetback", "Expense Claim Consolidated"],
    Operations: ["Cloud Node Clusters Config", "Office Asset Inventory", "Supply Logistics Index", "API Gateway Access Profile", "Security System Log", "Global DNS Allocation Table"],
    Engineering: ["Platform Service Roadmap", "Penetration Audit Manifest", "System Cache Memory Map", "Core Engine API Manifest", "Data Warehouse Spec Sheet", "Build Distribution Lockfile"],
    "Human Resources": ["Payroll Registry April", "Candidate Interview Queue", "Compliance Assessment Key", "Employee Benefits Ledger", "Training Certifications Log"],
    Marketing: ["Annual Campaign Budget", "AdWords Performance Index", "Channel Conversion Ledger", "Subscription Leads Capture", "Global Asset CDN Registry"]
  };

  const custodians = {
    Finance: process.env.CUSTODIAN_FINANCE || "finance-audit@alpha-secure.com",
    Operations: process.env.CUSTODIAN_OPERATIONS || "ops-lead@alpha-secure.com",
    Engineering: process.env.CUSTODIAN_ENGINEERING || "eng-platform@alpha-secure.com",
    "Human Resources": process.env.CUSTODIAN_HR || "hr-compliance@alpha-secure.com",
    Marketing: process.env.CUSTODIAN_MARKETING || "mktg-ops@alpha-secure.com"
  };

  // Construct a large batch insert statement to execute efficiently inside a single query
  const insertValues: string[] = [];
  const queryParams: any[] = [];
  let paramIndex = 1;

  for (let i = 1; i <= 500; i++) {
    const idx = i - 1;
    const cat = categories[idx % categories.length];
    const names = baseNames[cat as keyof typeof baseNames];
    const baseName = names[idx % names.length];

    const recordName = `${baseName} (Workspace Seed - #${i})`;
    const metricVal = +(Math.random() * (120000 - 450) + 450).toFixed(2);
    const security = securities[idx % securities.length];
    const status = statuses[idx % statuses.length];
    const custodian = custodians[cat as keyof typeof custodians];

    insertValues.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6})`);
    queryParams.push(orgId, recordName, cat, metricVal, security, status, custodian);
    paramIndex += 7;
  }

  const chunkSize = 100;
  for (let chunkIdx = 0; chunkIdx < insertValues.length; chunkIdx += chunkSize) {
    const valueSlice = insertValues.slice(chunkIdx, chunkIdx + chunkSize);
    const paramSlice = queryParams.slice(chunkIdx * 7, (chunkIdx + chunkSize) * 7);

    let sliceParamIndex = 1;
    const adjustedValues = valueSlice.map(() => {
      const text = `($${sliceParamIndex}, $${sliceParamIndex + 1}, $${sliceParamIndex + 2}, $${sliceParamIndex + 3}, $${sliceParamIndex + 4}, $${sliceParamIndex + 5}, $${sliceParamIndex + 6})`;
      sliceParamIndex += 7;
      return text;
    });

    const chunkQueryStr = `
            INSERT INTO organization_data (org_id, record_name, category, metric_value, security_level, status, custodian_email)
            VALUES ${adjustedValues.join(", ")}
        `;

    await query(chunkQueryStr, paramSlice);
  }

  console.log(`[DB Seed] Seeding completed for ${orgId}`);
}

// Auto-execute migrations and database table provisioning on module load
initDatabase().catch((err) => {
  console.error("[DB Init] Auto-migration and database provisioning failed:", err);
});
