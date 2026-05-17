const fs = require('fs');
const path = require('path');
const { Pool } = require('@neondatabase/serverless');

// Load environment variables manually from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DATABASE_URL=(.+)/);
    if (match) {
        databaseUrl = match[1].trim();
    }
}

if (!databaseUrl) {
    console.error("Error: DATABASE_URL not found in env.local or process.env");
    process.exit(1);
}

console.log("Connecting database via:", databaseUrl.split('@')[1] || "credentials");

const pool = new Pool({
    connectionString: databaseUrl,
});

async function run() {
    console.log("[Seeding] Starting tables provisioning...");

    // 1. Create tables
    await pool.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL
    );
  `);
    console.log("- organizations table OK");

    await pool.query(`
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
    console.log("- organization_data table OK");

    // Create indexing
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_org_data_org_id ON organization_data(org_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_org_data_category ON organization_data(category);`);
    console.log("- indexes OK");

    await pool.query(`
    CREATE TABLE IF NOT EXISTS otp_records (
      email VARCHAR(255) PRIMARY KEY,
      code VARCHAR(10) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      verified BOOLEAN DEFAULT FALSE
    );
  `);
    console.log("- otp_records table OK");

    await pool.query(`
    CREATE TABLE IF NOT EXISTS transfers (
      id SERIAL PRIMARY KEY,
      sender_org_id VARCHAR(50) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      recipient_org_id VARCHAR(50) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      message TEXT,
      row_count INTEGER NOT NULL,
      transferred_at TIMESTAMP DEFAULT NOW()
    );
  `);
    console.log("- transfers table OK");

    // 2. Seed Default Organizations
    const orgCheck = await pool.query("SELECT COUNT(*) FROM organizations");
    if (parseInt(orgCheck.rows[0].count, 10) === 0) {
        console.log("- Seeding organizations A & B...");
        await pool.query(`
      INSERT INTO organizations (id, name, email) VALUES
      ('org-a', 'Organization Alpha', 'alpha@secure-data.corp'),
      ('org-b', 'Organization Beta', 'beta@secure-data.corp')
    `);
    } else {
        console.log("- organizations already seeded");
    }

    // 3. Seed 500 rows for Org A
    const dataCheck = await pool.query("SELECT COUNT(*) FROM organization_data WHERE org_id = 'org-a'");
    const currentCount = parseInt(dataCheck.rows[0].count, 10);

    if (currentCount === 0) {
        console.log(`- Database empty. Bulk-seeding 500 custom rows for Organization Alpha...`);

        const categories = ["Finance", "Operations", "Engineering", "Human Resources", "Marketing"];
        const securities = ["Confidential", "Internal Use", "Restricted", "Highest Clearance"];
        const statuses = ["Active", "Active", "Active", "Archived", "Review Needed"];

        const baseNames = {
            Finance: ["Q1 Revenue Ledger", "Operating Budget Forecast", "Capital Ledger Rollup", "Equity Allocations", "Corporate Tax Audit", "Expense Claim Consolidated"],
            Operations: ["Cloud Node Clusters Config", "Office Asset Inventory", "Supply Logistics Index", "API Gateway Access Profile", "Security System Log", "Global DNS Allocation Table"],
            Engineering: ["Platform Service Roadmap", "Penetration Audit Manifest", "System Cache Memory Map", "Core Engine API Manifest", "Data Warehouse Spec Sheet", "Build Distribution Lockfile"],
            "Human Resources": ["Payroll Registry April", "Candidate Interview Queue", "Compliance Assessment Key", "Employee Benefits Ledger", "Training Certifications Log"],
            Marketing: ["Annual Campaign Budget", "AdWords Performance Index", "Channel Conversion Ledger", "Subscription Leads Capture", "Global Asset CDN Registry"]
        };

        const custodians = {
            Finance: "finance-audit@alpha-secure.com",
            Operations: "ops-lead@alpha-secure.com",
            Engineering: "eng-platform@alpha-secure.com",
            "Human Resources": "hr-compliance@alpha-secure.com",
            Marketing: "mktg-ops@alpha-secure.com"
        };

        const insertValues = [];
        const queryParams = [];
        let paramIndex = 1;

        for (let i = 1; i <= 500; i++) {
            const idx = i - 1;
            const cat = categories[idx % categories.length];
            const names = baseNames[cat];
            const baseName = names[idx % names.length];

            const recordName = `${baseName} (Batch v${Math.floor(i / 10) + 1} - #${i})`;
            const metricVal = +(Math.random() * (120000 - 450) + 450).toFixed(2);
            const security = securities[idx % securities.length];
            const status = statuses[idx % statuses.length];
            const custodian = custodians[cat];

            insertValues.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6})`);
            queryParams.push('org-a', recordName, cat, metricVal, security, status, custodian);
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

            await pool.query(chunkQueryStr, paramSlice);
        }
        console.log("- Successfully seeded 500 rows!");
    } else {
        console.log(`- Database already has data. (${currentCount} rows for org-a)`);
    }

    console.log("[Success] Database provisioning complete!");
}

run()
    .then(() => {
        pool.end();
        process.exit(0);
    })
    .catch(err => {
        console.error("Migration failed:", err);
        pool.end();
        process.exit(1);
    });
