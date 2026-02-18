const webpush = require('web-push');

const vapidKeys = {
    publicKey: 'BAlNGvE2k3Kv3NPAHGBWWxzibVzQwpPqBmlNpG2qQXgzom_9jLGGqp4K3ElCSlkk81D7dSGxHf_efYKzwZpi3YQ',
    privateKey: 'ACrARcGWHG60q-C8IkjAolfeM6NbPIYQRTBG7hboLPk'
};

webpush.setVapidDetails(
    'mailto:admin@anep.edu.uy',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

const app = express();
const port = 3001;

// Database connection pool
const pool = new Pool({
    host: '192.168.99.111',
    user: 'postgres',
    password: 'eElbebe*2011',
    port: 5432,
    database: 'kiosk_db',
});

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'connected', publicKey: vapidKeys.publicKey });
});

// --- PUSH NOTIFICATIONS ---

app.post('/api/subscribe', async (req, res) => {
    const { subscription, dni } = req.body;
    try {
        const employeeRes = await pool.query('SELECT id FROM employees WHERE dni = $1', [dni]);
        const employeeId = employeeRes.rowCount > 0 ? employeeRes.rows[0].id : null;

        await pool.query(
            'INSERT INTO push_subscriptions (employee_id, subscription_data) VALUES ($1, $2)',
            [employeeId, JSON.stringify(subscription)]
        );
        res.status(201).json({});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

// Helper to notify
async function sendNotificationToEmployee(userDni, payload) {
    try {
        const employeeRes = await pool.query('SELECT id FROM employees WHERE dni = $1', [userDni]);
        if (employeeRes.rowCount === 0) return;

        const subs = await pool.query('SELECT subscription_data FROM push_subscriptions WHERE employee_id = $1', [employeeRes.rows[0].id]);

        for (const row of subs.rows) {
            try {
                await webpush.sendNotification(row.subscription_data, JSON.stringify(payload));
            } catch (err) {
                console.error('Error sending push:', err);
            }
        }
    } catch (err) {
        console.error('Error in sendNotification:', err);
    }
}

// --- EMPLOYEES (SYNC) ---

// Get all employees for local sync
app.get('/api/employees', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM employees ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Register or update employee
app.post('/api/employees', async (req, res) => {
    const { name, dni, email, phone, whatsapp, pin, face_descriptors, photos } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO employees (name, dni, email, phone, whatsapp, pin, face_descriptors, photos)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (dni) DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                whatsapp = EXCLUDED.whatsapp,
                pin = EXCLUDED.pin,
                face_descriptors = EXCLUDED.face_descriptors,
                photos = EXCLUDED.photos
             RETURNING *`,
            [name, dni, email, phone, whatsapp, pin, JSON.stringify(face_descriptors), photos]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error saving employee' });
    }
});

// --- ATTENDANCE ---

// Save attendance records
app.post('/api/attendance', async (req, res) => {
    const { userId, userName, userDni, type, type_id, timestamp, photo, notes, kioskId } = req.body;
    try {
        // Try to find the local employee ID from DNI
        const employeeRes = await pool.query('SELECT id FROM employees WHERE dni = $1', [userDni]);
        const employeeId = employeeRes.rowCount > 0 ? employeeRes.rows[0].id : null;

        await pool.query(
            `INSERT INTO attendance_records (employee_id, user_name, user_dni, type, type_id, timestamp, photo, notes, kiosk_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [employeeId, userName, userDni, type, type_id, timestamp || Date.now(), photo, notes, kioskId]
        );

        // Notify
        await sendNotificationToEmployee(userDni, {
            title: `Registro Exitoso: ${type}`,
            body: `${userName}, tu marca ha sido procesada correctamente.`,
            icon: '/logo_anep.png'
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error saving attendance record' });
    }
});

app.listen(port, () => {
    console.log(`Kiosk API running at http://localhost:${port}`);
});
