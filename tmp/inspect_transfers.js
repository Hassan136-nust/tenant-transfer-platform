import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually parse env
const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
if (!dbUrlMatch) {
    console.error("No DATABASE_URL in .env.local!");
    process.exit(1);
}
const dbUrl = dbUrlMatch[1];

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        let out = [];
        out.push("Checking DB counts...");

        const orgs = await pool.query("SELECT * FROM organizations");
        out.push(`Organizations in DB:\n${JSON.stringify(orgs.rows, null, 2)}`);

        const dataCount = await pool.query("SELECT org_id, COUNT(*) FROM organization_data GROUP BY org_id");
        out.push(`Data counts per org:\n${JSON.stringify(dataCount.rows, null, 2)}`);

        const transfers = await pool.query("SELECT * FROM transfers");
        out.push(`Transfers:\n${JSON.stringify(transfers.rows, null, 2)}`);

        const sample = await pool.query("SELECT id, org_id, record_name, source_record_id FROM organization_data LIMIT 5");
        out.push(`Sample records:\n${JSON.stringify(sample.rows, null, 2)}`);

        fs.writeFileSync(path.join(__dirname, 'db_inspect_out.txt'), out.join("\n\n"));
        console.log("Successfully written inspect report!");
    } catch (err) {
        console.error("Query failed:", err);
    } finally {
        await pool.end();
    }
}

run();
