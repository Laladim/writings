import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const sourcePath = path.join(__dirname, "google-apps-script.js");
const configPath = path.join(__dirname, "registration-config.json");
const captureConfigPath = path.join(repoRoot, "public/bonafide-filipino-freelancers/shared/bff-capture-config.js");
const baseTokenPath = "/Users/laladimalanta/.config/gcloud/oauth-token.json";
const tokenPath = "/Users/laladimalanta/.config/gcloud/bff-apps-script-oauth-token.json";
const scopes = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/script.projects",
  "https://www.googleapis.com/auth/script.deployments"
];

function readJson(file, fallback = {}) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${url} failed: ${response.status} ${JSON.stringify(data).slice(0, 500)}`);
  }
  return data;
}

async function accessToken() {
  const token = readJson(tokenPath);
  const base = readJson(baseTokenPath);
  const refreshToken = token.refresh_token || base.refresh_token;
  if (!refreshToken) throw new Error(`Missing refresh token. Run: node ${path.relative(repoRoot, fileURLToPath(import.meta.url))} authorize`);
  const data = await requestJson(base.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: base.client_id,
      client_secret: base.client_secret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  return data.access_token;
}

async function authorize() {
  const base = readJson(baseTokenPath);
  const loginHint = process.env.BFF_GOOGLE_LOGIN_HINT || "";
  const port = 48761;
  const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: base.client_id,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: scopes.join(" "),
    ...(loginHint ? { login_hint: loginHint } : {})
  })}`;

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, redirectUri);
      if (url.pathname !== "/oauth2callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const value = url.searchParams.get("code");
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end("<p>Authorization received. You can close this tab.</p>");
      server.close();
      if (value) resolve(value);
      else reject(new Error(url.searchParams.get("error") || "Missing OAuth code"));
    });
    server.listen(port, "127.0.0.1", () => {
      console.log(authUrl);
    });
    setTimeout(() => {
      server.close();
      reject(new Error("OAuth authorization timed out."));
    }, 10 * 60 * 1000).unref();
  });

  const data = await requestJson(base.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: base.client_id,
      client_secret: base.client_secret,
      redirect_uri: redirectUri,
      code,
      grant_type: "authorization_code"
    })
  });
  writeJson(tokenPath, { ...base, ...data, scopes, login_hint: loginHint });
  console.log(JSON.stringify({ ok: true, tokenPath }, null, 2));
}

async function ensureSpreadsheet(token, config) {
  if (config.spreadsheetId) return config.spreadsheetId;
  const sheet = await requestJson("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      properties: { title: "BFF Registrations CRM" },
      sheets: [{ properties: { title: "Registrations" } }]
    })
  });
  config.spreadsheetId = sheet.spreadsheetId;
  return config.spreadsheetId;
}

async function ensureScript(token, config) {
  if (config.scriptId) return config.scriptId;
  const project = await requestJson("https://script.googleapis.com/v1/projects", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ title: "BFF Archetype Registration Endpoint" })
  });
  config.scriptId = project.scriptId;
  return config.scriptId;
}

async function deploy() {
  const token = await accessToken();
  const config = readJson(configPath);
  const spreadsheetId = await ensureSpreadsheet(token, config);
  const scriptId = await ensureScript(token, config);
  const source = fs.readFileSync(sourcePath, "utf8").replace("__BFF_REGISTRATIONS_SPREADSHEET_ID__", spreadsheetId);

  await requestJson(`https://script.googleapis.com/v1/projects/${scriptId}/content`, {
    method: "PUT",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      files: [
        {
          name: "Code",
          type: "SERVER_JS",
          source
        },
        {
          name: "appsscript",
          type: "JSON",
          source: JSON.stringify({
            timeZone: "Asia/Manila",
            exceptionLogging: "STACKDRIVER",
            runtimeVersion: "V8",
            oauthScopes: ["https://www.googleapis.com/auth/spreadsheets"],
            webapp: {
              access: "ANYONE_ANONYMOUS",
              executeAs: "USER_DEPLOYING"
            }
          }, null, 2)
        }
      ]
    })
  });

  const version = await requestJson(`https://script.googleapis.com/v1/projects/${scriptId}/versions`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ description: `BFF registration endpoint ${new Date().toISOString()}` })
  });

  const deployment = await requestJson(`https://script.googleapis.com/v1/projects/${scriptId}/deployments`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      versionNumber: version.versionNumber,
      manifestFileName: "appsscript",
      description: "BFF archetype registration web app"
    })
  });
  const endpoint = (deployment.entryPoints || []).find(entry => entry.entryPointType === "WEB_APP")?.webApp?.url;
  if (!endpoint) throw new Error(`Deployment did not return a web app URL: ${JSON.stringify(deployment).slice(0, 500)}`);

  config.deploymentId = deployment.deploymentId;
  config.endpoint = endpoint;
  writeJson(configPath, config);
  fs.writeFileSync(captureConfigPath, `window.BFF_CAPTURE_ENDPOINT = ${JSON.stringify(endpoint)};\n`);
  console.log(JSON.stringify({ ok: true, spreadsheetId, scriptId, endpoint }, null, 2));
}

const command = process.argv[2] || "deploy";
if (command === "authorize") await authorize();
else if (command === "deploy") await deploy();
else throw new Error(`Unknown command: ${command}`);
