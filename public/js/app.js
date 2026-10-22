// CyberSecLab Frontend Logic

// Tab Metadata for Titles & Subtitles
const tabMeta = {
    dashboard: {
        title: "Lab Dashboard",
        subtitle: "Educational sandbox mapping various security exploits and verification procedures."
    },
    sqli: {
        title: "SQL Injection Laboratory (SQLi)",
        subtitle: "Exploit unescaped SQL inputs and extract database structures."
    },
    xss: {
        title: "Cross-Site Scripting Laboratory (XSS)",
        subtitle: "Audit injection vectors to trigger script executions in clients."
    },
    auth: {
        title: "Broken Authentication & Session Management",
        subtitle: "Tamper with authentication credentials and session tokens."
    },
    ping: {
        title: "Command Injection Laboratory",
        subtitle: "Bypass boundary controls to execute terminal operations inside the hosting container."
    },
    idor: {
        title: "Insecure Direct Object References (IDOR)",
        subtitle: "Iterate numeric references to access documents belonging to other users."
    },
    guide: {
        title: "Tools Configuration Guide",
        subtitle: "Instructions for using nmap, Burp Suite, OWASP ZAP, and Wireshark."
    }
};

// Help Panel Contents (Hints & Solutions Database)
const hintsDatabase = {
    dashboard: `
        <div class="hint-block">
            <h4>Lab Overview</h4>
            <p>Welcome! Each section on the sidebar contains a specialized vulnerability lab. For each lab, click the **Hints & Tools Panel** to see how to exploit the vulnerability and verify it using industry tools.</p>
        </div>
        <div class="hint-block">
            <h4>Recommended Tool Flow</h4>
            <ol style="margin-left: 1.25rem; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
                <li>Start the container.</li>
                <li>Run <strong>nmap</strong> to find the open port.</li>
                <li>Configure <strong>Burp Suite</strong> to inspect API calls.</li>
                <li>Sniff packets in <strong>Wireshark</strong> during logins.</li>
            </ol>
        </div>
    `,
    sqli: `
        <div class="hint-block">
            <h4>Vulnerability Analysis</h4>
            <p>The query in this page directly appends your search term to a SQL statement: <code>SELECT username, email, role FROM users WHERE username = '[INPUT]'</code>. This allows query tampering.</p>
        </div>
        <div class="hint-block">
            <h4>Black-Box Verification (Nmap/SQLMap)</h4>
            <p>In Kali Linux, you can run SQLmap to automatically verify and extract the entire database:</p>
            <pre style="background:var(--bg-terminal); padding: 0.5rem; font-size:0.75rem; border:1px solid var(--border-color); margin-top:0.25rem; font-family:monospace; color:var(--neon-cyan);">sqlmap -u "http://[CONTAINER_IP]:3000/api/users/search?q=test" --batch --dump</pre>
        </div>
        <div class="hint-block">
            <h4>Manual Exploitation Hint</h4>
            <p>Type a single quote (<code>'</code>) in the search field. Notice the SQLite database returns a raw error. This indicates the query is parsed directly.</p>
        </div>
        <div class="solution-toggle">
            <button class="solution-btn" onclick="toggleSolutionDisplay()">Reveal Walkthrough & Payload</button>
            <div class="solution-content" id="solution-text-box">
                <strong>Payload 1: Bypass Search</strong><br>
                <code>' OR '1'='1</code><br>
                Lists all rows in the user table.<br><br>
                <strong>Payload 2: Extract other tables (UNION Injection)</strong><br>
                <code>' UNION SELECT username, password, email FROM users --</code><br>
                Extracts the plaintext passwords directly onto the results page!
            </div>
        </div>
    `,
    xss: `
        <div class="hint-block">
            <h4>Vulnerability Analysis</h4>
            <p><strong>Reflected XSS</strong>: The search query is reflected in the response and printed directly into the DOM using the vulnerable <code>.innerHTML</code> property without sanitization.</p>
            <p><strong>Stored XSS</strong>: Comments are stored in the database as plaintext and rendered directly back as HTML. This allows a script to execute every time a user loads the page.</p>
        </div>
        <div class="hint-block">
            <h4>Verification with Burp / ZAP</h4>
            <p>Intercept the POST request to <code>/api/comments</code> and modify the comment payload to include HTML tags or Javascript tags to verify execution.</p>
        </div>
        <div class="solution-toggle">
            <button class="solution-btn" onclick="toggleSolutionDisplay()">Reveal Walkthrough & Payload</button>
            <div class="solution-content" id="solution-text-box">
                <strong>Payload (Reflected XSS)</strong><br>
                Input this into the Reflected Search field:<br>
                <code>&lt;img src=x onerror=alert('Reflected_XSS')&gt;</code><br><br>
                <strong>Payload (Stored XSS - Cookie Theft)</strong><br>
                Input this as a Guestbook Comment:<br>
                <code>&lt;script&gt;alert("Stolen Cookies: " + document.cookie)&lt;/script&gt;</code><br><br>
                Notice that because the auth cookie has <code>httpOnly: false</code>, JavaScript can steal it!
            </div>
        </div>
    `,
    auth: `
        <div class="hint-block">
            <h4>Vulnerability Analysis</h4>
            <p><strong>User Enumeration</strong>: Login errors reveal whether the user exists or not ("User does not exist" vs "Incorrect password"). This allows hackers to scan for valid accounts.</p>
            <p><strong>Session Tampering</strong>: Once logged in, a session cookie named <code>session</code> is created. It is simply base64-encoded plain text of the username.</p>
        </div>
        <div class="hint-block">
            <h4>Sniffing with Wireshark</h4>
            <p>Launch Wireshark, listen on the loopback or docker interface. Log in as <code>guest</code>. Inspect the TCP stream to view the login credentials and session cookie transmitted in plaintext (HTTP has no encryption).</p>
        </div>
        <div class="solution-toggle">
            <button class="solution-btn" onclick="toggleSolutionDisplay()">Reveal Walkthrough & Payload</button>
            <div class="solution-content" id="solution-text-box">
                <strong>Exploitation Steps:</strong><br>
                1. Log in with credentials: <code>alice</code> / <code>password123</code>.<br>
                2. Check your cookies in the Inspector: you will see <code>session=YWxpY2U=</code>.<br>
                3. YWxpY2U= is Base64 for 'alice'.<br>
                4. Base64 encode 'admin' using Kali terminal: <code>echo -n "admin" | base64</code> (Output: <code>YWRtaW4=</code>).<br>
                5. Open Burp Suite or browser inspector, change the cookie <code>session</code> value to <code>YWRtaW4=</code>.<br>
                6. Click the "Fetch Admin Config API" button to unlock the administration panel and view the admin flag!
            </div>
        </div>
    `,
    ping: `
        <div class="hint-block">
            <h4>Vulnerability Analysis</h4>
            <p>The ping utility executes the system command: <code>ping -c 3 [INPUT]</code> via Node's <code>exec()</code>. Because the input is not sanitized or restricted, it executes commands in the container host system.</p>
        </div>
        <div class="hint-block">
            <h4>Verification with OWASP ZAP</h4>
            <p>Submit a request and capture it in OWASP ZAP. Run active scanning on the parameter, and ZAP will attempt OS Command Injection payloads to identify execution.</p>
        </div>
        <div class="solution-toggle">
            <button class="solution-btn" onclick="toggleSolutionDisplay()">Reveal Walkthrough & Payload</button>
            <div class="solution-content" id="solution-text-box">
                <strong>Payload 1: List Files</strong><br>
                <code>127.0.0.1; ls -la</code><br><br>
                <strong>Payload 2: Read Container Secrets</strong><br>
                <code>127.0.0.1 && cat /etc/passwd</code><br><br>
                <strong>Payload 3: Container Network Recon</strong><br>
                <code>127.0.0.1; ip a</code>
            </div>
        </div>
    `,
    idor: `
        <div class="hint-block">
            <h4>Vulnerability Analysis</h4>
            <p>The system retrieves invoices by reading the <code>id</code> parameter directly: <code>/api/invoice?id=1001</code>. The backend does not verify if the currently logged-in user owns that invoice.</p>
        </div>
        <div class="hint-block">
            <h4>Exploitation with Burp Intruder</h4>
            <p>1. Send the invoice request to Burp Intruder.<br>
            2. Set the payload marker on the invoice ID parameter: <code>?id=[§1001§]</code>.<br>
            3. Set payload type to Numbers, from 1000 to 1010, step 1.<br>
            4. Start the attack. Check response lengths. You will find other invoices, including ID 1003 which holds the administrative secret!</p>
        </div>
        <div class="solution-toggle">
            <button class="solution-btn" onclick="toggleSolutionDisplay()">Reveal Walkthrough & Payload</button>
            <div class="solution-content" id="solution-text-box">
                <strong>Payload:</strong><br>
                Change the invoice query ID to:<br>
                <code>1003</code><br><br>
                This fetches invoice details for ID 1003, displaying the admin flag: <code>Flag{IDOR_ELEVATION_SUCCESSFUL}</code>
            </div>
        </div>
    `,
    guide: `
        <div class="hint-block">
            <h4>Interactive Assistance</h4>
            <p>This guide page contains command structures for configuring security verification applications (Burp, nmap, Wireshark) to evaluate web servers.</p>
        </div>
    `
};

// ==========================================
// SPA TAB NAVIGATION ENGINE
// ==========================================
function switchTab(tabId) {
    // Deactivate current active nav items & contents
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    
    // Activate target nav item & content
    const targetNavItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    const targetContent = document.getElementById(`tab-${tabId}`);
    
    if (targetNavItem && targetContent) {
        targetNavItem.classList.add('active');
        targetContent.classList.add('active');
        
        // Update Titles
        document.getElementById('current-page-title').innerText = tabMeta[tabId].title;
        document.getElementById('current-page-subtitle').innerText = tabMeta[tabId].subtitle;
        
        // Update Help Content
        document.getElementById('hints-content-box').innerHTML = hintsDatabase[tabId] || hintsDatabase.dashboard;
        
        // Close solution if it was open
        const sol = document.getElementById('solution-text-box');
        if (sol) sol.classList.remove('show');
    }
}

// Global exposure for onClick events in html
window.switchTab = switchTab;

// Toggle Drawer Panels
const hintsDrawer = document.getElementById('hints-drawer');
const toggleHintsBtn = document.getElementById('toggle-hints');
const closeHintsBtn = document.getElementById('btn-close-hints');

toggleHintsBtn.addEventListener('click', () => {
    hintsDrawer.classList.toggle('open');
});

closeHintsBtn.addEventListener('click', () => {
    hintsDrawer.classList.remove('open');
});

// Solution Toggle Accordion
function toggleSolutionDisplay() {
    const sol = document.getElementById('solution-text-box');
    if (sol) {
        sol.classList.toggle('show');
    }
}
window.toggleSolutionDisplay = toggleSolutionDisplay;


// ==========================================
// LAB 1: SQL INJECTION (SQLi)
// ==========================================
const sqliInput = document.getElementById('sqli-search-input');
const sqliBtn = document.getElementById('btn-sqli-search');
const sqliTableBody = document.querySelector('#sqli-results-table tbody');
const sqliConsole = document.getElementById('sqli-console');

function logToSqliConsole(text, type = 'system') {
    const line = document.createElement('p');
    line.className = `terminal-line ${type}`;
    
    const time = new Date().toLocaleTimeString();
    line.innerHTML = `<span class="prompt">[${time}] $</span> ${text}`;
    sqliConsole.appendChild(line);
    sqliConsole.scrollTop = sqliConsole.scrollHeight;
}

sqliBtn.addEventListener('click', executeSqliSearch);
sqliInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') executeSqliSearch();
});

function executeSqliSearch() {
    const query = sqliInput.value;
    logToSqliConsole(`Executing Search API request...`, 'system');
    logToSqliConsole(`SELECT username, email, role FROM users WHERE username = '${query}'`, 'success');

    fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
            sqliTableBody.innerHTML = '';
            
            if (data.error) {
                logToSqliConsole(`DATABASE ERROR: ${data.error}`, 'error');
                
                const tr = document.createElement('tr');
                tr.innerHTML = `<td colspan="3" class="text-center text-red font-weight-bold">
                    <i class="fa-solid fa-triangle-exclamation"></i> SQL Error: ${data.error}
                </td>`;
                sqliTableBody.appendChild(tr);
            } else if (data.results && data.results.length > 0) {
                logToSqliConsole(`Returned ${data.results.length} rows successfully.`, 'success');
                
                data.results.forEach(row => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${escapeHTML(row.username)}</td>
                        <td>${escapeHTML(row.email || 'N/A')}</td>
                        <td><span class="flag-box" style="border-color:var(--border-color); color:var(--text-primary); text-shadow:none;">${escapeHTML(row.role)}</span></td>
                    `;
                    sqliTableBody.appendChild(tr);
                });
            } else {
                logToSqliConsole(`Query completed. No matching users found.`, 'system');
                const tr = document.createElement('tr');
                tr.innerHTML = `<td colspan="3" class="text-center text-muted">No users matching that search input found.</td>`;
                sqliTableBody.appendChild(tr);
            }
        })
        .catch(err => {
            logToSqliConsole(`Connection Error: ${err.message}`, 'error');
        });
}


// ==========================================
// LAB 2: CROSS-SITE SCRIPTING (XSS)
// ==========================================
// Reflected XSS
const xssRefInput = document.getElementById('xss-reflected-input');
const xssRefBtn = document.getElementById('btn-xss-reflected');
const xssRefBox = document.getElementById('xss-reflected-box');

xssRefBtn.addEventListener('click', () => {
    const q = xssRefInput.value;
    fetch(`/api/search-logs?q=${encodeURIComponent(q)}`)
        .then(res => res.json())
        .then(data => {
            // INTENTIONAL VULNERABILITY: innerHTML injection
            xssRefBox.innerHTML = `Search logs result for: <strong>${data.query}</strong> (No matches found)`;
        });
});

// Stored XSS
const xssStoredAuthor = document.getElementById('xss-stored-author');
const xssStoredContent = document.getElementById('xss-stored-content');
const xssStoredBtn = document.getElementById('btn-xss-stored-submit');
const commentsList = document.getElementById('comments-list');

function loadComments() {
    fetch('/api/comments')
        .then(res => res.json())
        .then(data => {
            if (data.comments) {
                commentsList.innerHTML = '';
                data.comments.forEach(comment => {
                    const item = document.createElement('div');
                    item.className = 'comment-item';
                    
                    // INTENTIONAL VULNERABILITY: Renders author & content unsanitized using innerHTML
                    item.innerHTML = `
                        <div class="comment-header">
                            <span class="comment-author">${comment.author}</span>
                            <span class="comment-date">${comment.date}</span>
                        </div>
                        <div class="comment-body">${comment.content}</div>
                    `;
                    commentsList.appendChild(item);
                });
            }
        });
}

xssStoredBtn.addEventListener('click', () => {
    const author = xssStoredAuthor.value;
    const content = xssStoredContent.value;
    
    if(!author || !content) return;

    fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, content })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            xssStoredContent.value = '';
            loadComments();
        }
    });
});


// ==========================================
// LAB 3: BROKEN AUTHENTICATION
// ==========================================
const authUsernameInput = document.getElementById('auth-username');
const authPasswordInput = document.getElementById('auth-password');
const authLoginBtn = document.getElementById('btn-auth-login');
const authMsgBox = document.getElementById('auth-login-message');
const cookieConsole = document.getElementById('auth-cookie-console');
const cookieDisplay = document.getElementById('current-cookie-display');
const btnLoadAdminData = document.getElementById('btn-load-admin-data');

const adminSecretContent = document.getElementById('admin-secret-content');
const adminLockedMessage = document.getElementById('admin-locked-message');

function updateCookieDisplay() {
    if (document.cookie) {
        cookieDisplay.textContent = decodeURIComponent(document.cookie);
        cookieDisplay.className = "text-green";
    } else {
        cookieDisplay.textContent = "No session cookies set.";
        cookieDisplay.className = "text-muted";
    }
}

authLoginBtn.addEventListener('click', () => {
    const username = authUsernameInput.value;
    const password = authPasswordInput.value;

    authMsgBox.innerHTML = '';

    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => {
        return res.json().then(data => ({ status: res.status, data }));
    })
    .then(({ status, data }) => {
        if (status === 200) {
            authMsgBox.innerHTML = `<div class="alert alert-success">${data.message} Session cookie created.</div>`;
            updateCookieDisplay();
        } else {
            authMsgBox.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
        }
    })
    .catch(err => {
        authMsgBox.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    });
});

btnLoadAdminData.addEventListener('click', fetchAdminData);

function fetchAdminData() {
    fetch('/api/admin/data')
        .then(res => {
            return res.json().then(data => ({ status: res.status, data }));
        })
        .then(({ status, data }) => {
            if (status === 200 && data.success) {
                adminLockedMessage.classList.add('hidden');
                adminSecretContent.classList.remove('hidden');
            } else {
                adminSecretContent.classList.add('hidden');
                adminLockedMessage.classList.remove('hidden');
                adminLockedMessage.querySelector('strong').innerText = `API Fetch Rejected (HTTP ${status})`;
                adminLockedMessage.querySelector('p').innerText = data.error || 'Access Denied.';
            }
        })
        .catch(err => {
            adminSecretContent.classList.add('hidden');
            adminLockedMessage.classList.remove('hidden');
            adminLockedMessage.querySelector('p').innerText = `Network Error: ${err.message}`;
        });
}


// ==========================================
// LAB 4: COMMAND INJECTION
// ==========================================
const pingInput = document.getElementById('ping-ip-input');
const pingBtn = document.getElementById('btn-ping-submit');
const pingConsole = document.getElementById('ping-console');

function logToPingConsole(text, isInput = false, type = '') {
    const line = document.createElement('p');
    line.className = `terminal-line ${type}`;
    if (isInput) {
        line.innerHTML = `<span class="prompt">guest@cyberseclab-host:~$</span> ${text}`;
    } else {
        line.textContent = text;
    }
    pingConsole.appendChild(line);
    pingConsole.scrollTop = pingConsole.scrollHeight;
}

pingBtn.addEventListener('click', () => {
    const ip = pingInput.value;
    if(!ip) return;

    logToPingConsole(`ping -c 3 ${ip}`, true);

    fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
    })
    .then(res => res.json())
    .then(data => {
        if(data.stdout) {
            logToPingConsole(data.stdout);
        }
        if(data.stderr) {
            logToPingConsole(data.stderr, false, 'error');
        }
        if(data.error) {
            logToPingConsole(`COMMAND ERROR (Exit Code: ${data.exitCode}): ${data.error}`, false, 'error');
        }
    })
    .catch(err => {
        logToPingConsole(`Network Error: ${err.message}`, false, 'error');
    });
});


// ==========================================
// LAB 5: IDOR
// ==========================================
const idorValInput = document.getElementById('idor-invoice-id-input');
const idorFetchBtn = document.getElementById('btn-idor-fetch');
const idorConsole = document.getElementById('idor-api-console');
const invoiceCard = document.getElementById('invoice-display-card');

function logToIdorConsole(url, status, responseBody) {
    idorConsole.innerHTML = '';
    
    const requestLine = document.createElement('p');
    requestLine.className = 'terminal-line';
    requestLine.innerHTML = `<span class="prompt">GET</span> <span class="text-cyan">${url}</span>`;
    
    const statusLine = document.createElement('p');
    statusLine.className = `terminal-line ${status === 200 ? 'text-green' : 'text-red'}`;
    statusLine.textContent = `HTTP/1.1 ${status} ${status === 200 ? 'OK' : 'ERROR'}`;

    const bodyLine = document.createElement('p');
    bodyLine.className = 'terminal-line text-muted';
    bodyLine.textContent = JSON.stringify(responseBody, null, 2);

    idorConsole.appendChild(requestLine);
    idorConsole.appendChild(statusLine);
    idorConsole.appendChild(bodyLine);
    idorConsole.scrollTop = idorConsole.scrollHeight;
}

function loadInvoice(invoiceId) {
    const url = `/api/invoice?id=${invoiceId}`;
    fetch(url)
        .then(res => {
            return res.json().then(data => ({ status: res.status, data }));
        })
        .then(({ status, data }) => {
            logToIdorConsole(url, status, data);
            
            if (status === 200 && data.success) {
                document.getElementById('inv-num').textContent = `Invoice #${data.invoice.id}`;
                document.getElementById('inv-date').textContent = data.invoice.date;
                document.getElementById('inv-uid').textContent = data.invoice.user_id;
                document.getElementById('inv-desc').textContent = data.invoice.description;
                document.getElementById('inv-amount').textContent = data.invoice.amount;
                invoiceCard.classList.remove('hidden');
            } else {
                invoiceCard.classList.add('hidden');
            }
        })
        .catch(err => {
            logToIdorConsole(url, 500, { error: err.message });
            invoiceCard.classList.add('hidden');
        });
}

// Expose loadInvoice globally
window.loadInvoice = loadInvoice;

idorFetchBtn.addEventListener('click', () => {
    const invoiceId = idorValInput.value;
    if(invoiceId) loadInvoice(invoiceId);
});


// ==========================================
// SPA INITIALIZATION
// ==========================================
// Escape HTML strings helper to prevent browser rendering issues when displaying safe details
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', () => {
    // Add Click Listeners to Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
            window.location.hash = tabId;
        });
    });

    // Handle initial routing via Hash url
    const hash = window.location.hash.substring(1);
    if (hash && tabMeta[hash]) {
        switchTab(hash);
    } else {
        switchTab('dashboard');
    }

    // Load dynamic contents on startup
    loadComments();
    updateCookieDisplay();
});
