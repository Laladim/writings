import http from "node:http";
import fs from "node:fs";
import worker from "../../workers/bff-guide/worker.mjs";

const port = Number(process.env.BFF_GUIDE_WORKER_PORT || 8787);
const host = process.env.BFF_GUIDE_WORKER_HOST || "127.0.0.1";
const env = {
  ADMIN_TOKEN: process.env.BFF_GUIDE_ADMIN_TOKEN || "test-admin-token",
  DAILY_LIMIT_PER_EMAIL_IP: process.env.BFF_GUIDE_DAILY_LIMIT || "20"
};

if (process.env.BFF_GUIDE_ENABLE_GOOGLE_DOCS === "1") {
  const serviceAccountPath = process.env.BFF_GUIDE_GOOGLE_SERVICE_ACCOUNT_PATH || "/Users/laladimalanta/.config/gcloud/claude-sheets-key.json";
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    env.GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || serviceAccount.client_email;
    env.GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || serviceAccount.private_key;
  }
  const oauthTokenPath = process.env.BFF_GUIDE_GOOGLE_OAUTH_TOKEN_PATH || "/Users/laladimalanta/.config/gcloud/oauth-token.json";
  if (fs.existsSync(oauthTokenPath)) {
    const oauthToken = JSON.parse(fs.readFileSync(oauthTokenPath, "utf8"));
    env.GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || oauthToken.client_id;
    env.GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || oauthToken.client_secret;
    env.GOOGLE_OAUTH_REFRESH_TOKEN = process.env.GOOGLE_OAUTH_REFRESH_TOKEN || oauthToken.refresh_token;
    env.GOOGLE_OAUTH_TOKEN_URI = process.env.GOOGLE_OAUTH_TOKEN_URI || oauthToken.token_uri;
  }
  if (process.env.GOOGLE_DRIVE_FOLDER_ID) env.GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
}

const server = http.createServer(async (req, res) => {
  const chunks = [];
  req.on("data", chunk => chunks.push(chunk));
  req.on("end", async () => {
    try {
      const body = Buffer.concat(chunks);
      const request = new Request(`http://${host}:${port}${req.url}`, {
        method: req.method,
        headers: req.headers,
        body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : body
      });
      const response = await worker.fetch(request, env);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end(String(error && error.message || error));
    }
  });
});

server.listen(port, host, () => {
  console.log(`BFF guide worker harness listening on http://${host}:${port}`);
});
