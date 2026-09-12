import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import { installHealthIntercept, isHealthPath, writeHealth } from "./health.cjs";

describe("health path matching", () => {
  it("accepts /health and /health/ with query", () => {
    expect(isHealthPath("/health")).toBe(true);
    expect(isHealthPath("/health/")).toBe(true);
    expect(isHealthPath("/health?ready=1")).toBe(true);
  });

  it("does not treat app or static routes as health", () => {
    expect(isHealthPath("/")).toBe(false);
    expect(isHealthPath("/app")).toBe(false);
    expect(isHealthPath("/_next/static/x.js")).toBe(false);
    expect(isHealthPath("/healthy")).toBe(false);
  });
});

describe("health HTTP response", () => {
  it("returns 200 text/plain without a Location header", async () => {
    const server = createServer((req, res) => {
      writeHealth(req, res);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("expected tcp address");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/health`, {
      redirect: "manual",
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "flatqr-79ebe.containers.snapdeploy.app",
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-type")).toMatch(/text\/plain/);
    expect(await response.text()).toBe("ok");
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it("intercepts /health before the application request listener", async () => {
    installHealthIntercept();
    const server = createServer((_req, res) => {
      res.statusCode = 500;
      res.end("should-not-run");
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("expected tcp address");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/health/`, {
      redirect: "manual",
      headers: { "x-forwarded-proto": "https,https" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(await response.text()).toBe("ok");
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
});
