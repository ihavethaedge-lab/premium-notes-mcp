import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import Stripe from "stripe";

const PORT = process.env.PORT || 3344;
const HOST = "0.0.0.0";
const DB_PATH = path.join(process.cwd(), "saas-db.json");

// Stripe initialization with simulator fallback
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
let stripe = null;

if (stripeSecret) {
  try {
    stripe = new Stripe(stripeSecret);
    console.error("Stripe client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Stripe client:", err.message);
  }
} else {
  console.error("STRIPE_SECRET_KEY is not set. Running in checkout simulator mode.");
}

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
    keys: {},
    notes: {}
  };

  // Setup default admin key
  initialDb.keys["notes_user_premium_abc123"] = {
    email: "admin@premium-notes.com",
    created_at: new Date().toISOString()
  };
  initialDb.notes["notes_user_premium_abc123"] = [
    {
      id: 1,
      title: "Cloud Saved Note",
      content: "This note lives in the cloud database, not on your local machine.",
      created_at: new Date().toISOString()
    }
  ];

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

// Helper to read raw request body (needed for Stripe webhook verification)
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", err => reject(err));
  });
}

// Helper to generate a new API key and initialize notes space
function registerUserKey(db, email) {
  const newKey = `notes_premium_${crypto.randomBytes(16).toString("hex")}`;
  
  db.keys[newKey] = {
    email: email,
    created_at: new Date().toISOString()
  };

  db.notes[newKey] = [
    {
      id: 1,
      title: "Premium Sync Active",
      content: `Welcome! Sync partition allocated for ${email}.`,
      created_at: new Date().toISOString()
    }
  ];

  saveDb(db);
  return newKey;
}

// Beautiful cyber/glassmorphic landing page HTML with Stripe redirect
const LANDING_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AETHER NOTES // Stripe Checkout</title>
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
      margin-bottom: 2.5rem;
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
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-group {
      margin-bottom: 1rem;
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

    .btn {
      width: 100%;
      background: linear-gradient(135deg, var(--neon-cyan) 0%, #00b8ff 100%);
      border: none;
      border-radius: 6px;
      color: #06070d;
      font-family: 'Orbitron', sans-serif;
      font-weight: 700;
      font-size: 0.9rem;
      padding: 0.9rem;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 1px;
      transition: all 0.3s ease;
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.3);
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

    .divider {
      border-top: 1px dashed rgba(255, 255, 255, 0.1);
      width: 100%;
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
      <div class="subtitle">Secure Cloud Sync MCP Database // Stripe Checkout</div>
    </header>

    <div class="grid">
      <div class="info-section">
        <h3>⚡ Direct Synapse Sync</h3>
        <p>Sync notes seamlessly between your local developer environment, Cursor / Claude Desktop, and your transparent desktop HUD overlay.</p>
        
        <h3>💼 Lifetime Premium License</h3>
        <p>One-time payment of $9.99 USD unlocks full database partitioning, dynamic credentials, and unlimited cloud storage endpoints.</p>

        <ul class="features-list">
          <li>Isolated cloud partition</li>
          <li>Secured dynamic API key authentication</li>
          <li>Full integration with the Aether Desktop HUD</li>
          <li>Direct connection via standard MCP tool interface</li>
        </ul>
      </div>

      <div class="checkout-card" id="form-container">
        <!-- Option A: Stripe Checkout Redirection -->
        <form id="checkout-form">
          <div class="form-group">
            <label for="email">Billing Email</label>
            <input type="email" id="email" required placeholder="billing@aether.net">
          </div>
          <button type="submit" class="btn" id="pay-btn">Proceed to checkout ($9.99)</button>
        </form>

        <div class="divider"></div>

        <!-- Option B: Retrieve Key -->
        <form id="retrieve-form">
          <div class="form-group">
            <label for="retrieve-email">Already bought? Retrieve Key</label>
            <input type="email" id="retrieve-email" required placeholder="Enter checkout email...">
          </div>
          <button type="submit" class="btn" id="retrieve-btn" style="background: transparent; border: 1px solid var(--neon-cyan); color: var(--neon-cyan); box-shadow: none;">Retrieve Key</button>
        </form>
      </div>

      <div class="checkout-card success-panel" id="success-container">
        <div class="success-title">✓ KEY AUTHORIZED</div>
        <p style="font-size: 0.85rem; text-align: center; color: var(--text-muted);">Your premium access license is active.</p>
        
        <div class="key-display" id="license-key-val" onclick="copyKey()">
          notes_premium_holder...
        </div>

        <div class="instructions">
          <strong>HOW TO CONFIGURE:</strong>
          <ol style="margin-left: 1.2rem; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 8px;">
            <li>Copy the API Key above.</li>
            <li>In your HUD dashboard, open the <strong>NOTES</strong> tab, paste this key, and press refresh to sync.</li>
            <li>For Cursor or Claude Desktop, set your environment variable to: <code>MONETIZED_NOTES_API_KEY</code>.</li>
          </ol>
        </div>
        
        <button class="btn" onclick="resetForm()" style="margin-top: 1rem; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #fff; box-shadow: none;">Back to Checkout</button>
      </div>
    </div>
  </div>

  <script>
    const form = document.getElementById('checkout-form');
    const formContainer = document.getElementById('form-container');
    const successContainer = document.getElementById('success-container');
    const payBtn = document.getElementById('pay-btn');
    const licenseVal = document.getElementById('license-key-val');

    // Handle checkout redirection or simulator
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      payBtn.disabled = true;
      payBtn.innerText = 'REDIRECTING TO CHECKOUT...';

      const email = document.getElementById('email').value;

      try {
        const response = await fetch('/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email })
        });

        if (!response.ok) {
          throw new Error('Session creation failed');
        }

        const data = await response.json();
        
        if (data.fallback) {
          // Server fell back to simulator mode (no Stripe keys configured)
          licenseVal.innerText = data.key;
          formContainer.style.display = 'none';
          successContainer.style.display = 'block';
        } else if (data.url) {
          // Redirect browser directly to Stripe secure Checkout portal
          window.location.href = data.url;
        } else {
          throw new Error('Invalid server response');
        }
      } catch (err) {
        alert('Stripe connection error. Running in fallback mode? Please try again.');
        payBtn.disabled = false;
        payBtn.innerText = 'Proceed to checkout ($9.99)';
      }
    });

    // Handle key retrieval lookup
    const retrieveForm = document.getElementById('retrieve-form');
    const retrieveBtn = document.getElementById('retrieve-btn');

    retrieveForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      retrieveBtn.disabled = true;
      retrieveBtn.innerText = 'CONNECTING SECURE VAULT...';

      const email = document.getElementById('retrieve-email').value.trim();

      try {
        const response = await fetch('/retrieve-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email })
        });

        if (response.status === 404) {
          alert('No keys found for this email. Complete transaction first.');
        } else if (!response.ok) {
          throw new Error('Retrieval error');
        } else {
          const data = await response.json();
          licenseVal.innerText = data.key;
          formContainer.style.display = 'none';
          successContainer.style.display = 'block';
        }
      } catch (err) {
        alert('Database lookup failed. Try again.');
      } finally {
        retrieveBtn.disabled = false;
        retrieveBtn.innerText = 'Retrieve Key';
      }
    });

    // Handle success alerts and redirects
    window.addEventListener('DOMContentLoaded', () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('checkout_status') === 'success') {
        const banner = document.createElement('div');
        banner.style.cssText = "background: rgba(0, 255, 102, 0.1); border: 1px solid #00ff66; color: #00ff66; padding: 12px; border-radius: 8px; font-size: 0.8rem; text-align: center; margin-bottom: 20px; font-family: 'Source Code Pro', monospace;";
        banner.innerText = "✓ STRIPE CHECKOUT COMPLETED SUCCESSFULLY! Enter email below to retrieve your API Key.";
        document.querySelector('.grid').insertAdjacentElement('beforebegin', banner);
      } else if (params.get('checkout_status') === 'cancel') {
        const banner = document.createElement('div');
        banner.style.cssText = "background: rgba(255, 0, 127, 0.1); border: 1px solid #ff007f; color: #ff007f; padding: 12px; border-radius: 8px; font-size: 0.8rem; text-align: center; margin-bottom: 20px; font-family: 'Source Code Pro', monospace;";
        banner.innerText = "✗ TRANSACTION REJECTED/CANCELLED. Stripe session terminated.";
        document.querySelector('.grid').insertAdjacentElement('beforebegin', banner);
      }
    });

    function copyKey() {
      navigator.clipboard.writeText(licenseVal.innerText);
      alert('Premium API Key copied to clipboard!');
    }

    function resetForm() {
      form.reset();
      retrieveForm.reset();
      payBtn.disabled = false;
      payBtn.innerText = 'Proceed to checkout ($9.99)';
      successContainer.style.display = 'none';
      formContainer.style.display = 'flex';
      
      // Clean query parameters from URL
      window.history.replaceState({}, document.title, "/");
    }
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  // CORS Headers support
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // 1. Serve landing page at GET /
  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(LANDING_PAGE_HTML);
    return;
  }

  // 2. Create Stripe Checkout Session (or fallback simulator)
  if (req.method === "POST" && url.pathname === "/create-checkout-session") {
    try {
      const rawBody = await getRawBody(req);
      const { email } = JSON.parse(rawBody.toString("utf8"));
      if (!email) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Email required" }));
        return;
      }

      if (stripe) {
        // Build checkout session pointing to Stripe hosted portal
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          customer_email: email,
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: "Aether Notes Premium License",
                  description: "Lifetime secure cloud partition for MCP and Desktop HUD integration",
                },
                unit_amount: 999, // $9.99 USD
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `https://${req.headers.host}/?checkout_status=success`,
          cancel_url: `https://${req.headers.host}/?checkout_status=cancel`,
        });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ url: session.url }));
      } else {
        // Falling back to simulator mode dynamically
        const db = loadDb();
        const generatedKey = registerUserKey(db, email);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ fallback: true, key: generatedKey }));
      }
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `Checkout session creation failed: ${err.message}` }));
    }
    return;
  }

  // 3. Handle Key Retrieval
  if (req.method === "POST" && url.pathname === "/retrieve-key") {
    try {
      const rawBody = await getRawBody(req);
      const { email } = JSON.parse(rawBody.toString("utf8"));
      if (!email) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Email required" }));
        return;
      }

      const db = loadDb();
      let matchedKey = null;

      // Look up key matching the email
      for (const [key, details] of Object.entries(db.keys)) {
        if (details.email.toLowerCase() === email.toLowerCase()) {
          matchedKey = key;
          break;
        }
      }

      if (matchedKey) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ key: matchedKey }));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No key found for this email" }));
      }
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
    return;
  }

  // 4. Stripe Webhook Handler (checkout.session.completed)
  if (req.method === "POST" && url.pathname === "/webhook") {
    try {
      const rawBody = await getRawBody(req);
      const sig = req.headers["stripe-signature"];

      if (!stripe || !stripeWebhookSecret) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Stripe not fully configured locally." }));
        return;
      }

      let event;
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, stripeWebhookSecret);
      } catch (err) {
        console.error(`Webhook Signature verification failed: ${err.message}`);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `Signature verification failed: ${err.message}` }));
        return;
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const email = session.customer_details?.email || session.customer_email;

        if (email) {
          console.error(`Webhook: Payment received for ${email}. Creating license key.`);
          const db = loadDb();
          const generatedKey = registerUserKey(db, email);
          console.error(`Webhook: Generated key ${generatedKey} for email ${email}`);
        }
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ received: true }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `Webhook handling error: ${err.message}` }));
    }
    return;
  }

  // 5. Handle Multi-Tenant Notes Partition
  if (url.pathname === "/notes") {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized: Missing Authorization header" }));
      return;
    }

    const key = authHeader.replace("Bearer ", "").trim();
    const db = loadDb();

    // Verify key existence in SaaS store
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
      try {
        const rawBody = await getRawBody(req);
        const { title, content } = JSON.parse(rawBody.toString("utf8"));
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
        res.end(JSON.stringify({ error: "Invalid JSON request body" }));
      }
      return;
    }
  }

  // Fallback 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

server.listen(PORT, HOST, () => {
  console.error(`SaaS Stripe Server listening on ${HOST}:${PORT}`);
});
