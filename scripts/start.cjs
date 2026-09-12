"use strict";

/**
 * Bind 0.0.0.0 and process.env.PORT for container PaaS (SnapDeploy, Render, Docker).
 * Prefers the standalone server from `next build` (output: "standalone").
 *
 * SnapDeploy: set the UI "container port" / "app port" to this PORT.
 * Dockerfile default is 8080. If the UI is left at 3000, set PORT=3000
 * so the process listens where the platform probes.
 */
require("./health.cjs");

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = String(process.env.PORT || "8080");
process.env.HOSTNAME = hostname;
process.env.PORT = port;

console.log(`FlatQR: listening on ${hostname}:${port} (SnapDeploy container port must match)`);

const standaloneCandidates = [
  path.join(process.cwd(), "server.js"),
  path.join(process.cwd(), ".next", "standalone", "server.js"),
];
const standalone = standaloneCandidates.find((candidate) => fs.existsSync(candidate));
const nextCli = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

if (standalone) {
  require(standalone);
} else if (fs.existsSync(nextCli)) {
  const child = spawn(
    process.execPath,
    [
      "-r",
      require.resolve("./health.cjs"),
      nextCli,
      "start",
      "--hostname",
      hostname,
      "--port",
      port,
    ],
    { stdio: "inherit", env: process.env },
  );
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
  });
} else {
  console.error("FlatQR start: missing server.js and next CLI. Run npm run build first.");
  process.exit(1);
}
