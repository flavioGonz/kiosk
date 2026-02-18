const { Client } = require('pg');

const config = {
    host: '192.168.99.111',
    user: 'postgres',
    password: 'eElbebe*2011',
    port: 5432,
    database: 'postgres', // Start with default db to create the app db if needed
};

async function init() {
    const client = new Client(config);
    try {
        await client.connect();
        console.log('Connected to PostgreSQL');

        // Create Database if not exists
        // Note: CREATE DATABASE cannot run inside a transaction or alongside other queries in some drivers
        // We will try to create tables in the postgres DB for simplicity first, or create a 'kiosk_db'

        const dbName = 'kiosk_db';
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
        if (res.rowCount === 0) {
            console.log(`Creating database ${dbName}...`);
            // Disconnect and reconnect to create DB (psql rule)
            await client.end();
            const creatorClient = new Client(config);
            await creatorClient.connect();
            await creatorClient.query(`CREATE DATABASE ${dbName}`);
            await creatorClient.end();
        }

        // Connect to the new DB
        const dbClient = new Client({ ...config, database: dbName });
        await dbClient.connect();
        console.log(`Connected to database ${dbName}`);

        // Table: Employees (Users)
        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS employees (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                dni TEXT UNIQUE NOT NULL,
                email TEXT,
                phone TEXT,
                whatsapp TEXT,
                pin TEXT,
                face_descriptors JSONB,
                photos TEXT[],
                false_positives INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table "employees" checked/created');

        // Table: Attendance Records
        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS attendance_records (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
                user_name TEXT,
                user_dni TEXT,
                type TEXT NOT NULL,
                type_id INTEGER,
                timestamp BIGINT NOT NULL,
                photo TEXT,
                synced BOOLEAN DEFAULT TRUE,
                notes TEXT,
                observation TEXT,
                kiosk_id TEXT,
                modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table "attendance_records" checked/created');

        // Table: Unknown Faces
        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS unknown_faces (
                id SERIAL PRIMARY KEY,
                timestamp BIGINT NOT NULL,
                photo TEXT,
                kiosk_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table "unknown_faces" checked/created');

        // Table: Push Subscriptions
        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
                subscription_data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table "push_subscriptions" checked/created');

        await dbClient.end();

    } catch (err) {
        console.error('Initialization error:', err);
    }
}

init();
