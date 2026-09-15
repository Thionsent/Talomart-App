import { createServer, request as createRequest } from "node:http";

const callbackPath = "/api/payments/mpesa/callback";
const listenPort = Number.parseInt(process.env.MPESA_PROXY_PORT ?? "3002", 10);
const targetUrl = new URL(
  process.env.MPESA_PROXY_TARGET ??
    `http://127.0.0.1:3000${callbackPath}`,
);
const maxBodyBytes = 1024 * 1024;

if (!Number.isInteger(listenPort) || listenPort < 1 || listenPort > 65_535) {
  throw new Error("MPESA_PROXY_PORT must be a valid TCP port.");
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", "http://localhost");

  if (request.method !== "POST" || requestUrl.pathname !== callbackPath) {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  const chunks = [];
  let bodySize = 0;
  let rejected = false;

  request.on("data", (chunk) => {
    bodySize += chunk.length;

    if (bodySize > maxBodyBytes) {
      rejected = true;
      response.writeHead(413, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "Payload too large" }));
      request.destroy();
      return;
    }

    chunks.push(chunk);
  });

  request.on("end", () => {
    if (rejected) return;

    const body = Buffer.concat(chunks);
    const upstreamRequest = createRequest(
      {
        hostname: targetUrl.hostname,
        port: targetUrl.port,
        path: targetUrl.pathname,
        method: "POST",
        headers: {
          "content-type": request.headers["content-type"] ?? "application/json",
          "content-length": body.length,
          "user-agent": "talomart-mpesa-sandbox-proxy",
        },
        timeout: 10_000,
      },
      (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode ?? 502, {
          "content-type":
            upstreamResponse.headers["content-type"] ?? "application/json",
        });
        upstreamResponse.pipe(response);
      },
    );

    upstreamRequest.on("timeout", () => {
      upstreamRequest.destroy(new Error("Upstream request timed out"));
    });

    upstreamRequest.on("error", () => {
      if (!response.headersSent) {
        response.writeHead(502, { "content-type": "application/json" });
      }
      response.end(JSON.stringify({ error: "Callback upstream unavailable" }));
    });

    upstreamRequest.end(body);
  });
});

server.listen(listenPort, "127.0.0.1", () => {
  console.log(
    `M-Pesa callback-only proxy listening on http://127.0.0.1:${listenPort}${callbackPath}`,
  );
});

