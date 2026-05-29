#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Read configuration from environment variables
const API_KEY = process.env.MONETIZED_NOTES_API_KEY;
const API_URL = process.env.NOTES_API_URL || "http://127.0.0.1:3344";

// 1. Startup Guard: Require API key
if (!API_KEY) {
  console.error("\n======================================================================");
  console.error("FATAL ERROR: MONETIZED_NOTES_API_KEY environment variable is not set.");
  console.error("Please set it to your premium license key to start the MCP server.");
  console.error("Example: set MONETIZED_NOTES_API_KEY=notes_user_premium_abc123");
  console.error("======================================================================\n");
  process.exit(1);
}

// Create MCP Server instance
const server = new Server({
  name: "monetized-notes-server",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

// Expose the list of available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "add_note",
        description: "Save a new structured note to your cloud-synchronized database",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "The title of the note" },
            content: { type: "string", description: "The body content of the note" }
          },
          required: ["title", "content"]
        }
      },
      {
        name: "list_notes",
        description: "List all notes saved in your cloud database",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "search_notes",
        description: "Search for notes containing a specific keyword in your cloud database",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search term to match" }
          },
          required: ["query"]
        }
      }
    ]
  };
});

// Handle tool executions
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  const headers = {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json"
  };

  try {
    if (name === "add_note") {
      const { title, content } = args;
      
      const response = await fetch(`${API_URL}/notes`, {
        method: "POST",
        headers,
        body: JSON.stringify({ title, content })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${response.status}`);
      }

      const note = await response.json();
      return {
        content: [
          {
            type: "text",
            text: `Successfully saved note (ID: ${note.id}) to cloud storage titled "${title}".`
          }
        ]
      };
    } 
    
    else if (name === "list_notes") {
      const response = await fetch(`${API_URL}/notes`, { headers });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      const rows = data.notes || [];
      
      if (rows.length === 0) {
        return {
          content: [{ type: "text", text: "No notes found in your cloud database." }]
        };
      }
      
      // Sort descending by date
      const sorted = [...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      const formatted = sorted
        .map(r => `[ID: ${r.id}] ${r.title} (${r.created_at})\n---\n${r.content}\n`)
        .join("\n");
        
      return {
        content: [{ type: "text", text: formatted }]
      };
    } 
    
    else if (name === "search_notes") {
      const { query } = args;
      const response = await fetch(`${API_URL}/notes`, { headers });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      const rows = data.notes || [];
      
      const filtered = rows.filter(r => 
        r.title.toLowerCase().includes(query.toLowerCase()) || 
        r.content.toLowerCase().includes(query.toLowerCase())
      );
      
      if (filtered.length === 0) {
        return {
          content: [{ type: "text", text: `No notes matched the query "${query}".` }]
        };
      }
      
      // Sort descending by date
      const sorted = filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      const formatted = sorted
        .map(r => `[ID: ${r.id}] ${r.title} (${r.created_at})\n---\n${r.content}\n`)
        .join("\n");
        
      return {
        content: [{ type: "text", text: formatted }]
      };
    } 
    
    else {
      throw new Error(`Tool not found: ${name}`);
    }
  } catch (error) {
    return {
      isError: true,
      content: [{ type: "text", text: `SaaS Connection error: ${error.message}` }]
    };
  }
});

// Start the server using stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Monetized Notes MCP Server running on stdio transport");
