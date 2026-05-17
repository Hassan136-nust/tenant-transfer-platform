require('dotenv').config({ path: '.env.local' });
const { seedOrganizationRows } = require('./app/lib/db');

async function run() {
    try {
        console.log("Starting seeder test...");
        await seedOrganizationRows("test-org-seeder-id");
        console.log("Seeder success!");
    } catch (err) {
        console.error("Seeder failed with error:");
        console.error(err);
    } finally {
        process.exit(0);
    }
}

run();
