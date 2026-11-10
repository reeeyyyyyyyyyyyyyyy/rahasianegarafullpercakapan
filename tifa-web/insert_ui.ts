import { query } from './lib/dbClient';

async function run() {
    try {
        await query(
            "INSERT INTO m_device (device_code, device_name, company_id) VALUES ('TFWB1', 'TFWB1', 1) ON CONFLICT (device_code) DO NOTHING"
        );
        console.log('Successfully inserted TFWB1');
    } catch (e) {
        console.error('Error inserting:', e);
    }
    process.exit(0);
}

run();
