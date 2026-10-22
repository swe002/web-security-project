const express = require('express');
const cookieParser = require('cookie-parser');
const sqlite3 = require('sqlite3').verbose();
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize In-Memory SQLite Database
const db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
        console.error('Error connecting to in-memory SQLite database:', err.message);
    } else {
        console.log('Connected to in-memory SQLite database.');
        seedDatabase();
    }
});

// Seed Database with Mock Data
function seedDatabase() {
    db.serialize(() => {
        // Create Users Table
        db.run(`CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            email TEXT
        )`);

        // Insert Mock Users (Plaintext passwords for testing!)
        db.run("INSERT INTO users (username, password, role, email) VALUES ('admin', 'adminPassword123!', 'admin', 'admin@cyberseclab.local')");
        db.run("INSERT INTO users (username, password, role, email) VALUES ('alice', 'password123', 'user', 'alice@cyberseclab.local')");
        db.run("INSERT INTO users (username, password, role, email) VALUES ('bob', 'qwerty', 'user', 'bob@cyberseclab.local')");
        db.run("INSERT INTO users (username, password, role, email) VALUES ('guest', 'guest', 'user', 'guest@cyberseclab.local')");

        // Create Invoices Table (for IDOR)
        db.run(`CREATE TABLE invoices (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            amount TEXT,
            date TEXT,
            description TEXT
        )`);

        db.run("INSERT INTO invoices (id, user_id, amount, date, description) VALUES (1001, 2, '$120.00', '2026-05-10', 'Cloud Server Hosting (Alice)')");
        db.run("INSERT INTO invoices (id, user_id, amount, date, description) VALUES (1002, 3, '$45.50', '2026-05-12', 'Domain Registration renewal (Bob)')");
        db.run("INSERT INTO invoices (id, user_id, amount, date, description) VALUES (1003, 1, '$1,250,000.00', '2026-06-01', 'CONFIDENTIAL: CyberSecLab Admin Core Audit - Flag{IDOR_ELEVATION_SUCCESSFUL}')");

        // Create Comments Table (for Stored XSS)
        db.run(`CREATE TABLE comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author TEXT NOT NULL,
            content TEXT NOT NULL,
            date TEXT NOT NULL
        )`);

        db.run("INSERT INTO comments (author, content, date) VALUES ('system', 'Welcome to the guestbook! Feel free to leave a comment.', '2026-06-04 09:00:00')");
        db.run("INSERT INTO comments (author, content, date) VALUES ('alice', 'This site looks super cool and retro!', '2026-06-04 10:15:00')");
    });
}

// ==========================================
// VULNERABLE ENDPOINTS (OWASP TOP 10)
// ==========================================

// 1. SQL INJECTION (SQLi)
// Vulnerability: Direct string interpolation of search term into SQL query.
// Also outputs raw SQLite error messages, allowing Error-Based SQLi.
app.get('/api/users/search', (req, res) => {
    const queryTerm = req.query.q || '';
    
    // INTENTIONAL VULNERABILITY: Raw concatenation
    const sql = "SELECT username, email, role FROM users WHERE username = ?";
    
    db.all(sql, [queryTerm], (err, rows) => {
        if (err) {
            // Return raw SQL error to user - aids exploitation
            return res.status(500).json({ error: err.message, query: sql });
        }
        res.json({ success: true, results: rows });
    });
});

// 2. STORED XSS & REFLECTED XSS
// Stored XSS: Comments are stored directly and rendered by the client unsanitized.
app.get('/api/comments', (req, res) => {
    db.all("SELECT * FROM comments ORDER BY id DESC", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, comments: rows });
    });
});

app.post('/api/comments', (req, res) => {
    const { author, content } = req.body;
    if (!author || !content) {
        return res.status(400).json({ error: 'Author and content are required' });
    }

    const date = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // We insert using params to keep database solid, but it's returned raw (Stored XSS)
    const sql = "INSERT INTO comments (author, content, date) VALUES (?, ?, ?)";
    db.run(sql, [author, content, date], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, comment: { id: this.lastID, author, content, date } });
    });
});

// Reflected XSS: Reflected query returned exactly as-is.
app.get('/api/search-logs', (req, res) => {
    const q = req.query.q || '';
    // Simply returns query, if client renders using innerHTML it causes XSS
    res.json({ query: q });
});

// 3. BROKEN AUTHENTICATION & WEAK SESSIONS
// Vulnerability: Distinct error messages for enumeration, weak/plaintext check, base64 cookie session
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    // Step 1: Check if user exists (Vulnerability: Username Enumeration)
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!user) {
            return res.status(401).json({ error: 'Authentication failed: User does not exist' });
        }

        // Step 2: Check password (Vulnerability: Plaintext storage check)
        if (user.password !== password) {
            return res.status(401).json({ error: 'Authentication failed: Incorrect password' });
        }

        // Step 3: Set weak session token (Vulnerability: Base64 encoding of username)
        const sessionToken = Buffer.from(username).toString('base64');
        res.cookie('session', sessionToken, { httpOnly: false }); // httpOnly: false allows document.cookie XSS theft!
        res.json({ 
            success: true, 
            message: `Welcome, ${user.username}!`, 
            user: { username: user.username, role: user.role, email: user.email }
        });
    });
});

// Admin-only data page (dependent on Broken Authentication check)
app.get('/api/admin/data', (req, res) => {
    const sessionCookie = req.cookies.session;

    if (!sessionCookie) {
        return res.status(403).json({ error: 'Access denied: No session cookie provided.' });
    }

    try {
        // Decode base64 session token
        const username = Buffer.from(sessionCookie, 'base64').toString('utf8');

        if (username === 'admin') {
            res.json({
                success: true,
                flag: 'Flag{BROKEN_AUTH_ADMIN_TAKEOVER}',
                systemInfo: {
                    os: process.platform,
                    arch: process.arch,
                    nodeVersion: process.version,
                    environment: 'Docker Lab Container',
                    userDB_dump: 'Enabled (Exploited via Admin Portal)'
                }
            });
        } else {
            res.status(403).json({ error: `Access denied: User '${username}' is not authorized as admin.` });
        }
    } catch (e) {
        res.status(400).json({ error: 'Invalid session token format.' });
    }
});

// 4. COMMAND INJECTION
// Vulnerability: Executes system command directly with string concatenation without sanitization.
app.post('/api/ping', (req, res) => {
    const { ip } = req.body;

    if (!ip) {
        return res.status(400).json({ error: 'IP address or Hostname is required.' });
    }

    // INTENTIONAL VULNERABILITY: Raw command execution using exec
    // Under Alpine Linux container, we use ping -c 3
    const command = `ping -c 3 ${ip}`;

    exec(command, (error, stdout, stderr) => {
        // Return output, exit code, and error details to help with debugging/exploit feedback
        res.json({
            command,
            stdout: stdout || '',
            stderr: stderr || '',
            error: error ? error.message : null,
            exitCode: error ? error.code : 0
        });
    });
});

// 5. INSECURE DIRECT OBJECT REFERENCE (IDOR)
// Vulnerability: No check whether the logged-in user owns the invoice.
app.get('/api/invoice', (req, res) => {
    const invoiceId = req.query.id;

    if (!invoiceId) {
        return res.status(400).json({ error: 'Invoice ID is required' });
    }

    // Query DB for this invoice
    db.get("SELECT * FROM invoices WHERE id = ?", [invoiceId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: `Invoice with ID ${invoiceId} not found.` });
        }
        res.json({ success: true, invoice: row });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🤖 CyberSecLab - Vulnerable Training Environment`);
    console.log(`🚀 Running at http://localhost:${PORT}`);
    console.log(`⚠️  Warning: Active vulnerabilities enabled!`);
    console.log(`====================================================`);
});
