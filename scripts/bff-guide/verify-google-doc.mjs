import assert from "node:assert/strict";
import fs from "node:fs";
import worker, { DEV_TURNSTILE_TOKEN, memoryStore } from "../../workers/bff-guide/worker.mjs";

const serviceAccountPath = process.env.BFF_GUIDE_GOOGLE_SERVICE_ACCOUNT_PATH || "/Users/laladimalanta/.config/gcloud/claude-sheets-key.json";
const oauthTokenPath = process.env.BFF_GUIDE_GOOGLE_OAUTH_TOKEN_PATH || "/Users/laladimalanta/.config/gcloud/oauth-token.json";
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
const oauthToken = fs.existsSync(oauthTokenPath) ? JSON.parse(fs.readFileSync(oauthTokenPath, "utf8")) : {};
const testEmail = process.env.BFF_GUIDE_TEST_EMAIL || oauthToken.account || serviceAccount.client_email;

if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
  throw new Error("Set BFF_GUIDE_TEST_EMAIL to a valid Google account email before running this verifier.");
}

memoryStore.leads.clear();
memoryStore.privatePayloads.clear();
memoryStore.rate.clear();

const payload = {
  name: "BFF Google Doc Test",
  email: testEmail,
  current_situation: "BPO or customer support worker",
  work_history: "3 years in customer support. Used Zendesk, Google Sheets, Slack, and Zoom.",
  tools: ["Google Workspace", "Zendesk", "Slack", "Zoom"],
  english_confidence: "high",
  application_timeline: "Within 2 to 4 weeks",
  target_role: "customer-support-va",
  resume_status: "Old resume, not remote-ready",
  portfolio_status: "No portfolio yet",
  biggest_struggle: "Needs a role-specific support proof project.",
  resume_text: "This private text should not be stored by default.",
  process_consent: true,
  storage_consent: false,
  delivery_preference: "Google Doc link",
  turnstile_token: DEV_TURNSTILE_TOKEN
};

const env = {
  ADMIN_TOKEN: "test-admin-token",
  DAILY_LIMIT_PER_EMAIL_IP: "20",
  GOOGLE_SERVICE_ACCOUNT_EMAIL: serviceAccount.client_email,
  GOOGLE_PRIVATE_KEY: serviceAccount.private_key,
  GOOGLE_OAUTH_CLIENT_ID: oauthToken.client_id,
  GOOGLE_OAUTH_CLIENT_SECRET: oauthToken.client_secret,
  GOOGLE_OAUTH_REFRESH_TOKEN: oauthToken.refresh_token,
  GOOGLE_OAUTH_TOKEN_URI: oauthToken.token_uri,
  ...(process.env.GOOGLE_DRIVE_FOLDER_ID ? { GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID } : {})
};

const response = await worker.fetch(new Request("https://worker.local/api/bff-guide/intake", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "cf-connecting-ip": "203.0.113.20"
  },
  body: JSON.stringify(payload)
}), env);

const data = await response.json();
assert.equal(response.status, 201);
assert.equal(data.ok, true);
assert.match(data.document_url, /^https:\/\/docs\.google\.com\/document\/d\//);
assert.equal(data.private_payload_stored, false);
assert.equal(JSON.stringify([...memoryStore.leads.values()]).includes(payload.resume_text), false);

console.log(JSON.stringify({
  ok: true,
  lead_id: data.lead_id,
  document_url: data.document_url,
  delivery_status: data.delivery_status,
  private_payload_stored: data.private_payload_stored
}, null, 2));
