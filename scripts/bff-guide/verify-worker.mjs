import assert from "node:assert/strict";
import worker, { DEV_TURNSTILE_TOKEN, memoryStore } from "../../workers/bff-guide/worker.mjs";

const BASE = "https://worker.local";
const ADMIN_TOKEN = "test-admin-token";
const env = {
  ADMIN_TOKEN,
  DAILY_LIMIT_PER_EMAIL_IP: "20"
};

function resetMemory() {
  memoryStore.leads.clear();
  memoryStore.archetypeRegistrations.clear();
  memoryStore.privatePayloads.clear();
  memoryStore.rate.clear();
}

function request(path, init = {}) {
  return new Request(`${BASE}${path}`, init);
}

async function jsonResponse(response) {
  const data = await response.json();
  return { status: response.status, data };
}

const validPayload = {
  name: "Maria Santos",
  email: "maria@example.com",
  current_situation: "BPO or customer support worker",
  work_history: "4 years in BPO customer support. Used Zendesk, Google Sheets, Slack, and Zoom.",
  tools: ["Google Workspace", "Zendesk", "Slack", "Zoom"],
  english_confidence: "high",
  application_timeline: "Within 2 to 4 weeks",
  target_role: "customer-support-va",
  resume_status: "Old resume, not remote-ready",
  portfolio_status: "No portfolio yet",
  biggest_struggle: "My resume still sounds like a BPO resume.",
  resume_text: "Private resume text should not be stored by default.",
  process_consent: true,
  storage_consent: false,
  delivery_preference: "Google Doc link",
  turnstile_token: DEV_TURNSTILE_TOKEN
};

async function postIntake(payload) {
  return jsonResponse(await worker.fetch(request("/api/bff-guide/intake", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.8" },
    body: JSON.stringify(payload)
  }), env));
}

resetMemory();

const valid = await postIntake(validPayload);
assert.equal(valid.status, 201);
assert.equal(valid.data.ok, true);
assert.equal(valid.data.private_payload_stored, false);
assert.match(valid.data.lead_id, /^BFF-/);
assert.equal(memoryStore.leads.size, 1);
assert.equal(memoryStore.privatePayloads.size, 0);
assert.equal(JSON.stringify([...memoryStore.leads.values()]).includes(validPayload.resume_text), false);

const status = await jsonResponse(await worker.fetch(request(`/api/bff-guide/status/${valid.data.lead_id}`), env));
assert.equal(status.status, 200);
assert.equal(status.data.guide_status, "generated");
assert.equal(status.data.document_url, `manual-review:${valid.data.lead_id}`);

const badEmail = await postIntake({ ...validPayload, email: "not-an-email" });
assert.equal(badEmail.status, 400);
assert.equal(badEmail.data.errors.includes("Valid email is required."), true);

const missingConsent = await postIntake({ ...validPayload, email: "consent@example.com", process_consent: false });
assert.equal(missingConsent.status, 400);
assert.equal(missingConsent.data.errors.includes("Processing consent is required."), true);

const invalidTurnstile = await postIntake({ ...validPayload, email: "turnstile@example.com", turnstile_token: "bad-token" });
assert.equal(invalidTurnstile.status, 403);
assert.equal(invalidTurnstile.data.errors.includes("Turnstile verification failed."), true);

const docsFailure = await jsonResponse(await worker.fetch(request("/api/bff-guide/intake", {
  method: "POST",
  headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.9" },
  body: JSON.stringify({ ...validPayload, email: "docs-failure@example.com" })
}), { ...env, SIMULATE_GOOGLE_DOCS_FAILURE: "1" }));
assert.equal(docsFailure.status, 502);
assert.equal(docsFailure.data.errors.includes("Google Docs generation failed."), true);

const emailFailure = await jsonResponse(await worker.fetch(request("/api/bff-guide/intake", {
  method: "POST",
  headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.10" },
  body: JSON.stringify({ ...validPayload, email: "email-failure@example.com" })
}), { ...env, SIMULATE_EMAIL_FAILURE: "1" }));
assert.equal(emailFailure.status, 201);
assert.equal(emailFailure.data.delivery_status, "email-failed");

const stored = await postIntake({
  ...validPayload,
  email: "stored@example.com",
  storage_consent: true,
  resume_text: "Store this private resume text because consent is checked."
});
assert.equal(stored.status, 201);
assert.equal(stored.data.private_payload_stored, true);
assert.equal(memoryStore.privatePayloads.has(stored.data.lead_id), true);

const unauthorized = await jsonResponse(await worker.fetch(request("/api/admin/bff-guide/leads"), env));
assert.equal(unauthorized.status, 401);

const leads = await jsonResponse(await worker.fetch(request("/api/admin/bff-guide/leads", {
  headers: { authorization: `Bearer ${ADMIN_TOKEN}` }
}), env));
assert.equal(leads.status, 200);
assert.equal(leads.data.leads.length, 3);

const retry = await jsonResponse(await worker.fetch(request(`/api/admin/bff-guide/${valid.data.lead_id}/retry`, {
  method: "POST",
  headers: { authorization: `Bearer ${ADMIN_TOKEN}` }
}), env));
assert.equal(retry.status, 200);
assert.equal(retry.data.lead.guide_status, "manual-review");
assert.equal(retry.data.lead.retry_count, 1);

const resend = await jsonResponse(await worker.fetch(request(`/api/admin/bff-guide/${valid.data.lead_id}/resend`, {
  method: "POST",
  headers: { authorization: `Bearer ${ADMIN_TOKEN}` }
}), env));
assert.equal(resend.status, 200);
assert.equal(resend.data.lead.delivery_status, "resend-marked");
assert.equal(resend.data.lead.resend_count, 1);

const csv = await worker.fetch(request("/api/admin/bff-guide/export.csv", {
  headers: { authorization: `Bearer ${ADMIN_TOKEN}` }
}), env);
const csvText = await csv.text();
assert.equal(csv.status, 200);
assert.equal(csvText.includes("lead_id,created_at,name,email"), true);
assert.equal(csvText.includes("maria@example.com"), true);
assert.equal(csvText.includes(validPayload.resume_text), false);

const registrationForm = new FormData();
registrationForm.set("email", "polished@example.com");
registrationForm.set("archetype", "polished");
registrationForm.set("archetype_name", "Polished Freelancer");
registrationForm.set("blocker", "proof-packaging");
registrationForm.set("proof_sample", "client result sentence");
registrationForm.set("next_lesson_url", "../lesson-account-management-101/index.html");
registrationForm.set("q1", "freelance");
registrationForm.set("tools", "deep");
registrationForm.set("creative", "paid");
registrationForm.set("q4", "flexible");
registrationForm.set("q5", "5");
registrationForm.set("experience", "senior");
registrationForm.set("source_page", "/bonafide-filipino-freelancers/archetype/");

const registration = await jsonResponse(await worker.fetch(request("/api/bff-archetype/register", {
  method: "POST",
  headers: { "cf-connecting-ip": "203.0.113.11" },
  body: registrationForm
}), env));
assert.equal(registration.status, 201);
assert.equal(registration.data.ok, true);
assert.match(registration.data.registration_id, /^BFF-REG-/);
assert.equal(registration.data.crm_status, "new");
assert.equal(registration.data.brevo_status, "not-configured");
assert.equal(memoryStore.archetypeRegistrations.size, 1);

const storedRegistration = [...memoryStore.archetypeRegistrations.values()][0];
assert.equal(storedRegistration.email, "polished@example.com");
assert.equal(storedRegistration.archetype, "polished");
assert.equal(storedRegistration.blocker, "proof-packaging");

const registrationExport = await worker.fetch(request("/api/admin/bff-guide/archetype-registrations.csv", {
  headers: { authorization: `Bearer ${ADMIN_TOKEN}` }
}), env);
const registrationCsv = await registrationExport.text();
assert.equal(registrationExport.status, 200);
assert.equal(registrationCsv.includes("registration_id,created_at,email,archetype"), true);
assert.equal(registrationCsv.includes("polished@example.com"), true);

console.log(JSON.stringify({
  ok: true,
  tests: [
    "valid intake",
    "status",
    "bad email",
    "missing consent",
    "invalid turnstile",
    "google docs failure",
    "email failure",
    "optional private payload",
    "admin auth",
    "retry",
    "resend",
    "csv export",
    "privacy default",
    "archetype registration",
    "archetype csv export"
  ],
  leadCount: memoryStore.leads.size,
  archetypeRegistrationCount: memoryStore.archetypeRegistrations.size,
  privatePayloadCount: memoryStore.privatePayloads.size
}, null, 2));
