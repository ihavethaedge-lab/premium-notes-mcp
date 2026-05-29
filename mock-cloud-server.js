import http from "http";

const PORT = process.env.PORT || 3344;
const HOST = "0.0.0.0";
const VALID_API_KEY = "notes_user_premium_abc123";

// In-memory database simulating a cloud database
const cloudDatabase = {
  notes: [
    {
      id: 1,
      title: "Cloud Saved Note",
      content: "This note lives in the cloud database, not on your local machine.",
      created_at: new Date().toISOString()
    }
  ]
};

const server = http.createServer((req, res) => {
  // 1. API Authentication Check (Bearer Token)
  const authHeader = req.headers["authorization"];
  if (!authHeader || authHeader !== `Bearer ${VALID_API_KEY}`) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized: Invalid or missing API key. Please purchase a key at yourproduct.com." }));
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // 2. Handle CRUD Routes
  if (req.method === "GET" && url.pathname === "/notes") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ notes: cloudDatabase.notes }));
  } 
  
  else if (req.method === "POST" && url.pathname === "/notes") {
    let body = "";
    req.on("data", chunk => { body += chunk.toString(); });
    req.on("end", () => {
      try {
        const { title, content } = JSON.parse(body);
        if (!title || !content) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Bad Request: title and content are required" }));
          return;
        }

        const newNote = {
          id: cloudDatabase.notes.length + 1,
          title,
          content,
          created_at: new Date().toISOString()
        };

        cloudDatabase.notes.push(newNote);
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify(newNote));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Bad Request: Invalid JSON body" }));
      }
    });
  } 
  
  else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  }
});

server.listen(PORT, HOST, () => {
  console.error(`SaaS Mock Cloud Database listening on ${HOST}:${PORT}`);
});
