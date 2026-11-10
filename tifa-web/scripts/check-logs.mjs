import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5002,
    database: 'tifa',
    user: 'tifa',
    password: 'TifaBot2025@',
});

async function main() {
    const logsRes = await pool.query(`SELECT * FROM h_command_log WHERE command_code = 'MAP_SELECTED' ORDER BY created_at DESC LIMIT 5`);
    console.log('\n=== COMMAND LOGS ===');
    console.log(JSON.stringify(logsRes.rows, null, 2));
    await pool.end();
}

main().catch(console.error);
