import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_API_KEY = "notes_user_premium_abc123";
const SAAS_URL = "http://127.0.0.1:3344";

console.log("1. Spawning Mock SaaS Cloud Server...");
const cloudProcess = spawn("node", [path.join(__dirname, "mock-cloud-server.js")]);

cloudProcess.stdout.on("data", (data) => {
  console.log(`[Cloud SaaS Stdout]: ${data.toString().trim()}`);
});

cloudProcess.stderr.on("data", (data) => {
  console.log(`[Cloud SaaS Log]: ${data.toString().trim()}`);
});

// Give the SaaS server a second to start listening
setTimeout(() => {
  console.log("\n2. Spawning MCP Server with Premium API Key...");
  
  // Set required environment variables for the MCP server
  const env = {
    ...process.env,
    MONETIZED_NOTES_API_KEY: VALID_API_KEY,
    NOTES_API_URL: SAAS_URL
  };
  
  const mcpProcess = spawn("node", [path.join(__dirname, "index.js")], { env });

  mcpProcess.stderr.on("data", (data) => {
    console.log(`[MCP Server Log]: ${data.toString().trim()}`);
  });

  let buffer = "";
  mcpProcess.stdout.on("data", (data) => {
    buffer += data.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const response = JSON.parse(line);
        console.log(`\n[Client Received Response]:`, JSON.stringify(response, null, 2));

        if (response.id === 1) {
          console.log("\n--- Sending call to 'add_note' ---");
          sendRequest(mcpProcess, {
            jsonrpc: "2.0",
            method: "tools/call",
            id: 2,
            params: {
              name: "add_note",
              arguments: {
                title: "Monetization Milestone",
                content: "Cloud authentication and request routing successfully implemented!"
              }
            }
          });
        } 
        
        else if (response.id === 2) {
          console.log("\n--- Sending call to 'list_notes' ---");
          sendRequest(mcpProcess, {
            jsonrpc: "2.0",
            method: "tools/call",
            id: 3,
            params: {
              name: "list_notes",
              arguments: {}
            }
          });
        } 
        
        else if (response.id === 3) {
          console.log("\nEnd-to-End Test completed successfully!");
          console.log("Shutting down processes...");
          mcpProcess.kill();
          cloudProcess.kill();
          process.exit(0);
        }
      } catch (e) {
        console.log(`[Non-JSON Output]: ${line}`);
      }
    }
  });

  console.log("\n--- Sending 'tools/list' request ---");
  sendRequest(mcpProcess, {
    jsonrpc: "2.0",
    method: "tools/list",
    id: 1,
    params: {}
  });

}, 1500);

function sendRequest(processInstance, requestObj) {
  const jsonStr = JSON.stringify(requestObj) + "\n";
  console.log(`[Client Sending Request]:`, JSON.stringify(requestObj, null, 2));
  processInstance.stdin.write(jsonStr);
}
