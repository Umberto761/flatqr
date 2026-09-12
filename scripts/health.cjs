"use strict";

/**
 * Answer GET/HEAD /health before Next.js routing.
 * SnapDeploy + Cloudflare TLS termination has been seen to 308 /health
 * to the same HTTPS URL when the request reaches the Next standalone
 * router (trailing-slash / proxy URL normalize / forwarded proto).
 */

function healthPathname(url) {
  if (!url) return "";
  const q = url.indexOf("?");
  return q === -1 ? url : url.slice(0, q);
}

function isHealthPath(url) {
  const path = healthPathname(url);
  return path === "/health" || path === "/health/";
}

function writeHealth(req, res) {
  res.statusCode = 200;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.end("ok");
}

function installHealthIntercept() {
  const http = require("node:http");
  if (http.Server.prototype.__flatqrHealth) return;
  http.Server.prototype.__flatqrHealth = true;
  const orig = http.Server.prototype.emit;
  http.Server.prototype.emit = function patchedEmit(event, ...args) {
    if (event === "request") {
      const req = args[0];
      const res = args[1];
      if (req && res && isHealthPath(req.url)) {
        writeHealth(req, res);
        return true;
      }
    }
    return orig.apply(this, [event, ...args]);
  };
}

installHealthIntercept();

module.exports = {
  healthPathname,
  isHealthPath,
  writeHealth,
  installHealthIntercept,
};
