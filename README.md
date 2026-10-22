# CyberSecLab - Vulnerable Cybersecurity Training Environment

CyberSecLab is a lightweight, educational sandbox demonstrating common web application vulnerabilities (OWASP Top 10) in a controlled environment. The target contains intentional programming weaknesses (such as unsanitized inputs, unauthenticated objects, and plaintext records) configured to allow safety verification, pen-testing, and traffic sniffing.

---

## ⚠️ Warning
**This application is intentionally vulnerable.** 
* Only run this software locally on your personal machine or in an isolated network environment.
* Do not expose this application to the public internet.

---

## 🚀 Environment Setup & Deployment

Since Node.js or native SQLite binary compilers might not be installed on your local OS, the entire suite is packaged inside **Docker** for clean, isolated deployment.

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Launching the Labs
Open your terminal (PowerShell, Command Prompt, or terminal emulator in VS Code) in this project folder and run:
```bash
# Build the image and start the containers
docker compose up --build
```
Once started, open your web browser and navigate to:
```
http://localhost:3000
```
To stop the environment at any time, run:
```bash
docker compose down
```

---

## 🛠️ Vulnerability Analysis & Tool Verification

Use this lab with security testing tools to learn how to scan, intercept, and exploit common security flaws.

### 1. Port & Service Reconnaissance with Nmap

Verify active ports, OS information, and web configurations inside the container.
From Kali Linux or a terminal containing `nmap`, run:

```bash
# Basic scan to see if the lab is alive on port 3000
nmap -p 3000 localhost

# Aggressive Scan (Service version detection, OS detection, Script scanning)
nmap -A -p 3000 localhost

# Run HTTP enumeration scripts to discover paths
nmap --script http-enum,http-title -p 3000 localhost
```

---

### 2. Request Interception with Burp Suite or OWASP ZAP

Intercept, modify, and replay requests to bypass front-end forms.

#### Configuration (Burp Suite):
1. Start **Burp Suite Community Edition**.
2. Go to the **Proxy** tab, and click **Proxy Settings**. Verify the listener is running (default: `127.0.0.1:8080`).
3. Click the **Open Browser** button in Burp's Proxy tab (this starts an isolated Chromium instance pre-configured to route through the proxy, avoiding manual browser proxy settings!).
4. Browse to `http://localhost:3000/`.

#### Lab 3: Broken Authentication Exploit (Step-by-Step)
1. Go to the **Broken Auth** tab in the dashboard.
2. In Burp Suite, turn **Intercept is ON** (under Proxy -> Intercept).
3. Try logging in with: `alice` / `password123`.
4. In Burp, capture the POST request to `/api/login` and forward it. Note the server returns a cookie: `session=YWxpY2U=`.
5. Decode `YWxpY2U=` in Burp's **Decoder** tab (or run `echo -n "YWxpY2U=" | base64 -d` in Kali). You will see it translates to `alice`.
6. To escalate privileges: Encode the string `admin` to Base64 (Result: `YWRtaW4=`).
7. In the browser console (or by intercepting the "Fetch Admin Config API" request in Burp), replace your cookie with `session=YWRtaW4=`.
8. Click **Fetch Admin Config API** on the page. The admin database console and the administrative flag will be unlocked!

---

### 3. Packet Analysis with Wireshark

Analyze plain-text transmissions and session data across the network interface.

1. Open **Wireshark** (run as Administrator/sudo).
2. Select your loopback interface (`lo` or `Adapter for loopback traffic`) or the Docker bridge interface.
3. Apply a capture filter: `tcp.port == 3000`.
4. Start capturing packets.
5. In the browser, log in to the **Broken Auth** page using mock credentials.
6. In Wireshark, look for HTTP POST requests to `/api/login`.
7. Right-click the package row, and select **Follow -> TCP Stream**.
8. Notice that credentials (username/password) and returned cookie tokens are entirely readable in plain text because HTTP is unencrypted.

---

### 4. Automated SQL Injection with SQLmap

Use SQLmap to audit parameters and dump the internal SQLite database structures.
From your Kali Linux shell:

```bash
# Test the search endpoint for injection vulnerabilities
sqlmap -u "http://[LAB_IP]:3000/api/users/search?q=test" --batch

# Dump all database tables and credentials
sqlmap -u "http://[LAB_IP]:3000/api/users/search?q=test" --batch --dump
```
*(Note: Replace `[LAB_IP]` with the IP of your host if calling from a VM, or use `localhost` if running SQLmap directly on the host machine)*.

---

### 5. OS Command Injection (System Compromise)

Verify system access via unvalidated shell arguments.

1. Go to the **Command Injection** tab.
2. Submit `8.8.8.8` to run the ping utility.
3. Execute arbitrary command chains by appending delimiters.
4. Try inputs such as:
   * `8.8.8.8; ls -la` (Lists the files in the directory where Node is running)
   * `8.8.8.8 && cat /etc/passwd` (Reads user profiles on the Alpine container)
   * `8.8.8.8; whoami` (Returns the system privilege level: `node` or `root`)

---

### 6. IDOR (Insecure Direct Object Reference)

Verify that the application fails to restrict user authorization when loading object indices.

1. In the **IDOR** tab, notice Alice is logged in and sees her invoice ID: `1001`.
2. The page loads this via: `/api/invoice?id=1001`.
3. Try altering the query parameter manually in the fetch input field to other integers, such as `1002` or `1003`.
4. You will retrieve invoices for other users, including the administrative invoice (ID `1003`) containing the audit flag: `Flag{IDOR_ELEVATION_SUCCESSFUL}`.
