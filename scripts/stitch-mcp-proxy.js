#!/usr/bin/env node
/**
 * Stitch MCP proxy.
 *
 * Google's Stitch MCP server answers `tools/list` with ~324 KB of JSON, of
 * which ~279 KB (86%) are `outputSchema` fields. That payload exceeds the MCP
 * client's tool-definition budget, so the client reports "tools fetch failed"
 * and no Stitch tool becomes available.
 *
 * This proxy is a stdio MCP server that forwards every message verbatim to the
 * upstream HTTP endpoint and strips `outputSchema` from `tools/list` responses
 * on the way back (~324 KB -> ~45 KB). `outputSchema` is optional metadata in
 * the MCP spec; actual tool results are unaffected.
 *
 * Configuration (env):
 *   STITCH_API_KEY  required — value for the X-Goog-Api-Key header
 *   STITCH_MCP_URL  optional — upstream endpoint (defaults to Google's)
 *
 * stdout carries JSON-RPC only. All diagnostics go to stderr.
 */

'use strict';

const readline = require('readline');

const UPSTREAM_URL = process.env.STITCH_MCP_URL || 'https://stitch.googleapis.com/mcp';
const API_KEY = process.env.STITCH_API_KEY;

if (!API_KEY) {
  process.stderr.write('[stitch-proxy] STITCH_API_KEY is not set; aborting.\n');
  process.exit(1);
}

/** Remove `outputSchema` from every tool in a `tools/list` result. */
function stripOutputSchemas(message) {
  const tools = message && message.result && message.result.tools;
  if (!Array.isArray(tools)) return message;

  for (const tool of tools) {
    delete tool.outputSchema;
  }
  return message;
}

/**
 * Parse an upstream body that may be plain JSON or an SSE stream.
 * Returns the first JSON-RPC message found, or null when the body is empty
 * (which is how the server acknowledges notifications).
 */
function parseUpstreamBody(body, contentType) {
  const text = body.trim();
  if (!text) return null;

  if (contentType.includes('text/event-stream')) {
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload) return JSON.parse(payload);
    }
    return null;
  }

  return JSON.parse(text);
}

async function forward(request) {
  const response = await fetch(UPSTREAM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'X-Goog-Api-Key': API_KEY,
    },
    body: JSON.stringify(request),
  });

  const contentType = response.headers.get('content-type') || '';
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`upstream HTTP ${response.status}: ${body.slice(0, 200)}`);
  }

  return parseUpstreamBody(body, contentType);
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function handleLine(line) {
  const text = line.trim();
  if (!text) return;

  let request;
  try {
    request = JSON.parse(text);
  } catch (err) {
    process.stderr.write(`[stitch-proxy] dropped unparsable line: ${err.message}\n`);
    return;
  }

  // Notifications have no `id` and expect no reply.
  const isNotification = request.id === undefined || request.id === null;

  try {
    const response = await forward(request);
    if (isNotification || !response) return;

    send(request.method === 'tools/list' ? stripOutputSchemas(response) : response);
  } catch (err) {
    process.stderr.write(`[stitch-proxy] ${request.method} failed: ${err.message}\n`);
    if (isNotification) return;

    send({
      jsonrpc: '2.0',
      id: request.id,
      error: { code: -32603, message: `proxy: ${err.message}` },
    });
  }
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });

// Serialize handling so responses cannot interleave mid-write on stdout.
let queue = Promise.resolve();
rl.on('line', (line) => {
  queue = queue.then(() => handleLine(line));
});

rl.on('close', () => {
  queue.finally(() => process.exit(0));
});
