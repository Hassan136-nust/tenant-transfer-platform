import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        const orgs = await pool.query("SELECT * FROM organizations");
        fs.writeFileSync(path.join(__dirname, 'out.json'), JSON.stringify(orgs.rows, null, 2), 'utf8');
        console.log("Wrote out.json");
    } catch (err) {
        console.error("Query failed:", err);
    } finally {
        await pool.end();
    }
}

run();
