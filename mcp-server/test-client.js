#!/usr/bin/env node
/**
 * Smoke test for the local MCP server.
 * Starts the server over stdio just as Bob does, lists its tools, and runs
 * diff_infra. It does not require a Bob account or any cloud credentials.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(__dirname, "index.js")],
  cwd: projectRoot,
  stderr: "pipe",
});

const client = new Client({ name: "drift-detector-smoke-test", version: "1.0.0" });

try {
  await client.connect(transport);

  const { tools } = await client.listTools();
  const names = tools.map((tool) => tool.name).sort();
  const expected = [
    "diff_infra",
    "get_actual_state",
    "get_bobalytics_summary",
    "get_declared_state",
  ];

  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(`Tools MCP inesperadas: ${names.join(", ")}`);
  }

  const result = await client.callTool({ name: "diff_infra", arguments: {} });
  const text = result.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");

  console.log("MCP operativo.");
  console.log(`Tools disponibles: ${names.join(", ")}`);
  console.log(`Resultado de diff_infra: ${text}`);
} finally {
  await transport.close();
}
