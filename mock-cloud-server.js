import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const PORT = process.env.PORT || 3344;
const HOST = "0.0.0.0";
const DB_PATH = path.join(process.cwd(), "saas-db.json");

// Helper to load and initialize database
function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch (e) {
    console.error("Error reading DB, reinitializing...", e);
  }

  const initialDb = {
    keys: {
      "notes_user_premium_abc123": {
        email: "admin@premium-notes.com",
        created_at: new Date().toISOString()
      }
    },
    notes: {
      "notes_user_premium_abc123": [
        {
          id: 1,
          title: "Cloud Saved Note",
          content: "This note lives in the cloud database, not on your local machine.",
          created_at: new Date().toISOString()
        }
      ]
    }
  };

  saveDb(initialDb);
  return initialDb;
}

// Helper to save database
function saveDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Error writing DB...", e);
  }
}

// Beautiful cyber/glassmorphic landing page HTML
const LANDING_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AETHER NOTES // Premium MCP SaaS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Orbitron:wght@500;700;900&family=Source+Code+Pro:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-color: #06070d;
      --panel-bg: rgba(13, 17, 30, 0.7);
      --border-color: rgba(0, 240, 255, 0.2);
      --neon-cyan: #00f0ff;
      --neon-pink: #ff007f;
      --text-main: #e2e8f0;
      --text-muted: #8a99ad;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-color);
      color: var(--text-main);
      font-family: 'Inter', sans-serif;
      overflow-x: hidden;
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(255, 0, 127, 0.05) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(0, 240, 255, 0.05) 0%, transparent 40%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }

    .container {
      width: 100%;
      max-width: 850px;
      backdrop-filter: blur(12px);
      background: var(--panel-bg);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      box-shadow: 0 0 40px rgba(0, 240, 255, 0.05);
      padding: 3rem;
      position: relative;
    }

    .container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 3px;
      background: linear-gradient(90deg, var(--neon-cyan), var(--neon-pink));
      border-radius: 16px 16px 0 0;
    }

    header {
      text-align: center;
      margin-bottom: 3rem;
    }

    h1 {
      font-family: 'Orbitron', sans-serif;
      font-size: 2.2rem;
      font-weight: 900;
      letter-spacing: 2px;
      background: linear-gradient(135deg, #fff 0%, var(--text-muted) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: var(--neon-cyan);
      font-family: 'Source Code Pro', monospace;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 2.5rem;
    }

    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }

    .info-section h3 {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.1rem;
      color: #fff;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .info-section p {
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 1.5rem;
      font-size: 0.95rem;
    }

    .features-list {
      list-style: none;
    }

    .features-list li {
      margin-bottom: 0.8rem;
      display: flex;
      align-items: center;
      font-size: 0.9rem;
      color: var(--text-main);
    }

    .features-list li::before {
      content: '⚡';
      margin-right: 10px;
      color: var(--neon-pink);
    }

    .checkout-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 2rem;
      position: relative;
    }

    .form-group {
      margin-bottom: 1.2rem;
    }

    label {
      display: block;
      font-size: 0.75rem;
      font-family: 'Source Code Pro', monospace;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-bottom: 0.4rem;
      letter-spacing: 1px;
    }

    input {
      width: 100%;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 0.75rem 1rem;
      color: #fff;
      font-family: inherit;
      font-size: 0.9rem;
      transition: all 0.3s ease;
    }

    input:focus {
      outline: none;
      border-color: var(--neon-cyan);
      box-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
    }

    .card-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1rem;
    }

    .btn {
      width: 100%;
      background: linear-gradient(135deg, var(--neon-cyan) 0%, #00b8ff 100%);
      border: none;
      border-radius: 6px;
      color: #06070d;
      font-family: 'Orbitron', sans-serif;
      font-weight: 700;
      font-size: 0.95rem;
      padding: 0.9rem;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 1px;
      transition: all 0.3s ease;
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.3);
      margin-top: 0.5rem;
    }

    .btn:hover {
      background: linear-gradient(135deg, #00f0ff 0%, var(--neon-pink) 100%);
      color: #fff;
      box-shadow: 0 0 20px rgba(255, 0, 127, 0.4);
      transform: translateY(-2px);
    }

    .btn:active {
      transform: translateY(0);
    }

    .success-panel {
      display: none;
      animation: fadeIn 0.5s ease-out forwards;
    }

    .key-display {
      background: rgba(0, 240, 255, 0.05);
      border: 1px dashed var(--neon-cyan);
      padding: 1rem;
      border-radius: 8px;
      font-family: 'Source Code Pro', monospace;
      font-size: 0.85rem;
      color: var(--neon-cyan);
      text-align: center;
      margin: 1.5rem 0;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .key-display:hover {
      background: rgba(0, 240, 255, 0.1);
      box-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
    }

    .key-display::after {
      content: 'CLICK TO COPY';
      position: absolute;
      bottom: 2px;
      right: 6px;
      font-size: 0.6rem;
      color: var(--text-muted);
      letter-spacing: 0.5px;
    }

    .success-title {
      font-family: 'Orbitron', sans-serif;
      color: #00ff66;
      font-size: 1.1rem;
      text-align: center;
      margin-bottom: 0.5rem;
    }

    .instructions {
      font-size: 0.8rem;
      color: var(--text-muted);
      line-height: 1.5;
    }

    .instructions code {
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 5px;
      border-radius: 3px;
      color: #fff;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>AETHER NOTES</h1>
      <div class="subtitle">Secure Cloud Sync MCP Database // Premium Portal</div>
    </header>

    <div class="grid">
      <div class="info-section">
        <h3>⚡ Elevate Your Workflows</h3>
        <p>Sync notes seamlessly between your local developer environment, Cursor / Claude Desktop, and your transparent desktop HUD overlay.</p>
        
        <h3>💼 Lifetime License</h3>
        <p>Get instant access to your dedicated database partition. No recurring fees during the beta phase.</p>

        <ul class="features-list">
          <li>Isolated cloud storage space</li>
          <li>End-to-End JSON verification</li>
          <li>Integrated with the Aether Desktop HUD</li>
          <li>Compatible with Model Context Protocol</li>
        </ul>
      </div>

      <div class="checkout-card" id="form-container">
        <form id="checkout-form">
          <div class="form-group">
            <label for="email">Billing Email</label>
            <input type="email" id="email" required placeholder="dev@aether.net">
          </div>

          <div class="form-group">
            <label for="card">Credit Card Number</label>
            <input type="text" id="card" required placeholder="4242 4242 4242 4242">
          </div>

          <div class="card-row">
            <div class="form-group">
              <label for="expiry">Expiry Date</label>
              <input type="text" id="expiry" required placeholder="MM / YY">
            </div>
            <div class="form-group">
              <label for="cvc">CVC</label>
              <input type="text" id="cvc" required placeholder="***">
            </div>
          </div>

          <button type="submit" class="btn" id="pay-btn">Simulate Payment ($9.99)</button>
        </form>
      </div>

      <div class="checkout-card success-panel" id="success-container">
        <div class="success-title">✓ PAYMENT AUTHORIZED</div>
        <p style="font-size: 0.85rem; text-align: center; color: var(--text-muted);">Your premium license has been generated successfully.</p>
        
        <div class="key-display" id="license-key-val" onclick="copyKey()">
          notes_premium_holder...
        </div>

        <div class="instructions">
          <strong>HOW TO INSTALL:</strong>
          <ol style="margin-left: 1.2rem; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 8px;">
            <li>Copy the API Key above.</li>
            <li>In your HUD dashboard, open the <strong>NOTES</strong> tab, paste this key, and press refresh to sync.</li>
            <li>To configure Cursor, use this key in your MCP environment under: <code>MONETIZED_NOTES_API_KEY</code>.</li>
          </ol>
        </div>
        
        <button class="btn" onclick="resetForm()" style="margin-top: 1.5rem; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #fff; box-shadow: none;">Buy Another Key</button>
      </div>
    </div>
  </div>

  <script>
    const form = document.getElementById('checkout-form');
    const formContainer = document.getElementById('form-container');
    const successContainer = document.getElementById('success-container');
    const payBtn = document.getElementById('pay-btn');
    const licenseVal = document.getElementById('license-key-val');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      payBtn.disabled = true;
      payBtn.innerText = 'PROCESSING TRANSACTION...';

      const email = document.getElementById('email').value;

      try {
        const response = await fetch('/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email })
        });

        if (!response.ok) {
          throw new Error('Checkout failed');
        }

        const data = await response.json();
        
        // Show success layout
        licenseVal.innerText = data.key;
        formContainer.style.display = 'none';
        successContainer.style.display = 'block';
      } catch (err) {
        alert('Payment processor connection error. Please try again.');
        payBtn.disabled = false;
        payBtn.innerText = 'Simulate Payment ($9.99)';
      }
    });

    function copyKey() {
      navigator.clipboard.writeText(licenseVal.innerText);
      alert('API License Key copied to clipboard!');
    }

    function resetForm() {
      form.reset();
      payBtn.disabled = false;
      payBtn.innerText = 'Simulate Payment ($9.99)';
      successContainer.style.display = 'none';
      formContainer.style.display = 'block';
    }
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  // CORS Headers support for local development & cross-origin desktop widgets
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Serve landing page at GET /
  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(LANDING_PAGE_HTML);
    return;
  }

  // Handle premium checkout / key registration
  if (req.method === "POST" && url.pathname === "/checkout") {
    let body = "";
    req.on("data", chunk => { body += chunk.toString(); });
    req.on("end", () => {
      try {
        const { email } = JSON.parse(body);
        if (!email) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Email is required" }));
          return;
        }

        const db = loadDb();
        
        // Generate high-entropy API key starting with notes_premium_
        const newKey = `notes_premium_${crypto.randomBytes(16).toString("hex")}`;
        
        // Save user session
        db.keys[newKey] = {
          email: email,
          created_at: new Date().toISOString()
        };

        // Initialize empty partition for notes
        db.notes[newKey] = [
          {
            id: 1,
            title: "Premium Storage Activated",
            content: `Partition assigned to ${email}. Sync complete!`,
            created_at: new Date().toISOString()
          }
        ];

        saveDb(db);

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ key: newKey }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON request payload" }));
      }
    });
    return;
  }

  // Handle Multi-Tenant Notes Partition
  if (url.pathname === "/notes") {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized: Missing Authorization header" }));
      return;
    }

    const key = authHeader.replace("Bearer ", "").trim();
    const db = loadDb();

    // Check if the provided key is valid
    if (!db.keys[key]) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized: Invalid premium key. Purchase at homepage." }));
      return;
    }

    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ notes: db.notes[key] || [] }));
      return;
    }

    if (req.method === "POST") {
      let body = "";
      req.on("data", chunk => { body += chunk.toString(); });
      req.on("end", () => {
        try {
          const { title, content } = JSON.parse(body);
          if (!title || !content) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Title and content required" }));
            return;
          }

          if (!db.notes[key]) {
            db.notes[key] = [];
          }

          const newNote = {
            id: db.notes[key].length + 1,
            title,
            content,
            created_at: new Date().toISOString()
          };

          db.notes[key].push(newNote);
          saveDb(db);

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify(newNote));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
      return;
    }
  }

  // Fallback 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

server.listen(PORT, HOST, () => {
  console.error(`SaaS Server with landing page & checkout listening on ${HOST}:${PORT}`);
});
