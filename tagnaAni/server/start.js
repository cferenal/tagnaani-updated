import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import sirv from "sirv";
import { NodeRequest, sendNodeResponse } from "srvx/node";
import app from "../dist/server/server.js";
import { createTagnaApi } from "./api.js";

const handleApi = createTagnaApi();
const staticRoot = fileURLToPath(new URL("../dist/client/", import.meta.url));
const serveAssets = sirv(staticRoot, { etag: true, dotfiles: false });

async function render(req, res) {
  try {
    const response = await app.fetch(new NodeRequest({ req, res }));
    res.setHeaders(response.headers);
    res.writeHead(response.status);
    await sendNodeResponse(res, response);
  } catch (error) {
    console.error("Tagna-Ani page error:", error.name);
    if (!res.headersSent) res.writeHead(500);
    res.end("Tagna-Ani is temporarily unavailable.");
  }
}

createServer((req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (path === "/__tagna" || path.startsWith("/__tagna/")) {
    return handleApi(req, res, path.slice("/__tagna".length));
  }
  if (req.method === "GET" || req.method === "HEAD") {
    return serveAssets(req, res, () => render(req, res));
  }
  return render(req, res);
}).listen(Number(process.env.PORT || 4173), "0.0.0.0");
