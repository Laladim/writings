const CONSENT_VERSION = "bff-guide-consent-2026-06-06";
const ARCHETYPE_CONSENT_VERSION = "bff-archetype-capture-2026-06-15";
const DEV_TURNSTILE_TOKEN = "dev-valid-turnstile";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const memoryStore = {
  leads: new Map(),
  archetypeRegistrations: new Map(),
  privatePayloads: new Map(),
  rate: new Map()
};

const ROLE_DATA = {
  "executive-assistant": {
    title: "Executive Assistant",
    archetype: "Generalist Admin",
    secondary: ["Project Coordinator", "CRM Assistant"]
  },
  "customer-support-va": {
    title: "Customer Support VA",
    archetype: "Corporate Transitioner",
    secondary: ["CRM Assistant", "Data Entry VA"]
  },
  "marketing-va": {
    title: "Marketing VA",
    archetype: "Creative Specialist",
    secondary: ["Content Assistant", "Social Media Assistant"]
  },
  "social-media-assistant": {
    title: "Social Media Assistant",
    archetype: "Creative Specialist",
    secondary: ["Marketing VA", "Content Assistant"]
  },
  "content-assistant": {
    title: "Content Assistant",
    archetype: "Creative Specialist",
    secondary: ["Marketing VA", "SEO Assistant"]
  },
  "crm-assistant": {
    title: "CRM Assistant",
    archetype: "Generalist Admin",
    secondary: ["Customer Support VA", "Data Entry VA"]
  },
  "bookkeeping-va": {
    title: "Bookkeeping VA",
    archetype: "Generalist Admin",
    secondary: ["Data Entry VA", "Executive Assistant"]
  },
  "project-coordinator": {
    title: "Project Coordinator",
    archetype: "Corporate Transitioner",
    secondary: ["Executive Assistant", "CRM Assistant"]
  },
  "seo-assistant": {
    title: "SEO Assistant",
    archetype: "Creative Specialist",
    secondary: ["Content Assistant", "Data Entry VA"]
  },
  "data-entry-va": {
    title: "Data Entry VA",
    archetype: "Fresh Starter",
    secondary: ["CRM Assistant", "Customer Support VA"]
  }
};

function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
      ...(init.headers || {})
    }
  });
}

function text(body, init = {}) {
  return new Response(body, {
    ...init,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
      ...(init.headers || {})
    }
  });
}

function badRequest(errors) {
  return json({ ok: false, errors }, { status: 400 });
}

function leadId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `BFF-${Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function registrationId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `BFF-REG-${Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function nowIso() {
  return new Date().toISOString();
}

function roleFor(key) {
  if (key && key !== "not-sure" && ROLE_DATA[key]) return ROLE_DATA[key];
  return ROLE_DATA["data-entry-va"];
}

function sanitizeError(message) {
  return String(message || "Unknown error").replace(/[^\w\s.,:;@/-]/g, "").slice(0, 240);
}

async function requestData(request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return request.json();
  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    return Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  }
  return {};
}

function validatePayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object") return ["JSON body is required."];
  if (payload.website) errors.push("Spam check failed.");
  if (!payload.name || String(payload.name).trim().length < 2) errors.push("Name is required.");
  if (!EMAIL_RE.test(String(payload.email || "").trim())) errors.push("Valid email is required.");
  if (!payload.process_consent) errors.push("Processing consent is required.");
  if (!payload.current_situation) errors.push("Current situation is required.");
  if (!payload.work_history) errors.push("Work history summary is required.");
  if (!Array.isArray(payload.tools) || payload.tools.length < 1) errors.push("At least one tool is required.");
  if (!payload.english_confidence) errors.push("English confidence is required.");
  if (!payload.application_timeline) errors.push("Application timeline is required.");
  if (!payload.target_role) errors.push("Target role is required.");
  if (!payload.resume_status) errors.push("Resume status is required.");
  if (!payload.portfolio_status) errors.push("Portfolio status is required.");
  if (!payload.biggest_struggle) errors.push("Biggest struggle is required.");
  if (!payload.turnstile_token) errors.push("Turnstile token is required.");
  return errors;
}

async function verifyTurnstile(token, request, env) {
  if (env && env.TURNSTILE_SECRET_KEY) {
    const form = new FormData();
    form.append("secret", env.TURNSTILE_SECRET_KEY);
    form.append("response", token);
    const ip = request.headers.get("cf-connecting-ip");
    if (ip) form.append("remoteip", ip);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form
    });
    const result = await response.json();
    return Boolean(result.success);
  }
  return token === DEV_TURNSTILE_TOKEN;
}

function rateKey(request, payload) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local";
  const email = String(payload.email || "unknown").toLowerCase();
  return `${ip}:${email}`;
}

function rateLimit(request, payload, env) {
  const limit = Number(env && env.DAILY_LIMIT_PER_EMAIL_IP ? env.DAILY_LIMIT_PER_EMAIL_IP : 3);
  const key = rateKey(request, payload);
  const today = new Date().toISOString().slice(0, 10);
  const current = memoryStore.rate.get(key);
  if (!current || current.date !== today) {
    memoryStore.rate.set(key, { date: today, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}

function buildRecord(payload, request) {
  const role = roleFor(payload.target_role);
  const id = leadId();
  const createdAt = nowIso();
  return {
    lead_id: id,
    created_at: createdAt,
    updated_at: createdAt,
    name: String(payload.name).trim(),
    email: String(payload.email).trim().toLowerCase(),
    consent_version: payload.consent_version || CONSENT_VERSION,
    source_page: payload.source_page || "/bonafide-filipino-freelancers/personalized-resume-guide/",
    archetype: role.archetype,
    target_role: role.title,
    secondary_roles: role.secondary.join("; "),
    application_timeline: String(payload.application_timeline),
    guide_status: "generated",
    document_url: `manual-review:${id}`,
    pdf_url: "",
    delivery_preference: payload.delivery_preference || "Google Doc link",
    delivery_status: "concierge-review-needed",
    error_message: "",
    private_payload_stored: Boolean(payload.storage_consent),
    retry_count: 0,
    resend_count: 0,
    last_action: "intake-generated",
    ip_hash: request.headers.get("cf-connecting-ip") ? "cf-ip-present" : "local"
  };
}

function buildPrivatePayload(payload, record) {
  return {
    lead_id: record.lead_id,
    created_at: record.created_at,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    work_history: String(payload.work_history || ""),
    resume_text: String(payload.resume_text || ""),
    biggest_struggle: String(payload.biggest_struggle || ""),
    job_url: String(payload.job_url || "")
  };
}

async function putRecord(record, payload, env) {
  if (env && env.DB && typeof env.DB.prepare === "function") {
    await env.DB.prepare(`
      INSERT INTO bff_guide_leads (
        lead_id, created_at, updated_at, name, email, consent_version, source_page,
        archetype, target_role, secondary_roles, application_timeline, guide_status,
        document_url, pdf_url, delivery_preference, delivery_status, error_message,
        private_payload_stored, retry_count, resend_count, last_action, ip_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      record.lead_id, record.created_at, record.updated_at, record.name, record.email,
      record.consent_version, record.source_page, record.archetype, record.target_role,
      record.secondary_roles, record.application_timeline, record.guide_status,
      record.document_url, record.pdf_url, record.delivery_preference,
      record.delivery_status, record.error_message, record.private_payload_stored ? 1 : 0,
      record.retry_count, record.resend_count, record.last_action, record.ip_hash
    ).run();
    if (record.private_payload_stored) {
      const privatePayload = buildPrivatePayload(payload, record);
      await env.DB.prepare(`
        INSERT INTO bff_guide_private_payloads (
          lead_id, created_at, expires_at, work_history, resume_text, biggest_struggle, job_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        privatePayload.lead_id, privatePayload.created_at, privatePayload.expires_at,
        privatePayload.work_history, privatePayload.resume_text,
        privatePayload.biggest_struggle, privatePayload.job_url
      ).run();
    }
    return;
  }
  memoryStore.leads.set(record.lead_id, record);
  if (record.private_payload_stored) {
    memoryStore.privatePayloads.set(record.lead_id, buildPrivatePayload(payload, record));
  }
}

async function listRecords(env) {
  if (env && env.DB && typeof env.DB.prepare === "function") {
    const result = await env.DB.prepare(`
      SELECT lead_id, created_at, updated_at, name, email, archetype, target_role,
        application_timeline, guide_status, document_url, delivery_status,
        private_payload_stored, retry_count, resend_count, last_action
      FROM bff_guide_leads
      ORDER BY created_at DESC
      LIMIT 100
    `).all();
    return result.results || [];
  }
  return Array.from(memoryStore.leads.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function listArchetypeRegistrations(env) {
  if (env && env.DB && typeof env.DB.prepare === "function") {
    const result = await env.DB.prepare(`
      SELECT registration_id, created_at, updated_at, email, archetype, archetype_name,
        blocker, proof_sample, next_lesson_url, source_page, crm_status, email_status,
        brevo_status, error_message
      FROM bff_archetype_registrations
      ORDER BY created_at DESC
      LIMIT 500
    `).all();
    return result.results || [];
  }
  return Array.from(memoryStore.archetypeRegistrations.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function getRecord(id, env) {
  if (env && env.DB && typeof env.DB.prepare === "function") {
    const result = await env.DB.prepare("SELECT * FROM bff_guide_leads WHERE lead_id = ?").bind(id).first();
    return result || null;
  }
  return memoryStore.leads.get(id) || null;
}

function documentUrl(record, env) {
  if (env && env.GUIDE_DOCUMENT_BASE_URL) {
    return `${String(env.GUIDE_DOCUMENT_BASE_URL).replace(/\/+$/, "")}/${record.lead_id}`;
  }
  return `manual-review:${record.lead_id}`;
}

function htmlEscape(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function base64Url(input) {
  let bytes;
  if (typeof input === "string") bytes = new TextEncoder().encode(input);
  else bytes = input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToArrayBuffer(pem) {
  const clean = String(pem || "")
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function oauthAccessToken(env) {
  if (!env || !env.GOOGLE_OAUTH_REFRESH_TOKEN || !env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) return null;
  const response = await fetch(env.GOOGLE_OAUTH_TOKEN_URI || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    throw new Error(`Google OAuth token request failed: ${sanitizeError(result.error_description || result.error || response.status)}`);
  }
  return result.access_token;
}

async function serviceAccountAccessToken(env) {
  if (!env || !env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_PRIVATE_KEY) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(env.GOOGLE_PRIVATE_KEY),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    throw new Error(`Google token request failed: ${sanitizeError(result.error_description || result.error || response.status)}`);
  }
  return result.access_token;
}

async function googleAccessToken(env) {
  return await oauthAccessToken(env) || await serviceAccountAccessToken(env);
}

function guideHtml(payload, record) {
  const tools = Array.isArray(payload.tools) ? payload.tools : [];
  const role = roleFor(payload.target_role);
  const sections = [
    ["1. Your Starting Point", [
      `Name: ${record.name}`,
      `BFF archetype: ${record.archetype}`,
      `Current situation: ${payload.current_situation}`,
      `Strengths visible from intake: ${tools.slice(0, 6).join(", ") || "Starting tool list needs review"}`,
      `Main constraint: ${payload.biggest_struggle}`,
      `Plain recommendation: Aim for ${record.target_role}, but keep claims tied only to facts in the intake.`
    ]],
    ["2. Your Best-Fit Remote Role", [
      `Primary role: ${record.target_role}`,
      `Secondary roles: ${record.secondary_roles}`,
      "What employers will expect: visible proof, role-matched tools, clear written updates, and honest scope.",
      "What to avoid claiming: employers, dates, metrics, certifications, tools, or outcomes not provided in the intake."
    ]],
    ["3. Your Resume Strategy", [
      `Resume headline: ${record.target_role} for practical remote-work support`,
      `Professional summary: ${record.target_role} candidate with ${payload.current_situation} background and practical tool exposure in ${tools.slice(0, 5).join(", ") || "remote-work tools"}.`,
      "Core skills: organize the strongest tools and role-specific tasks in the top third of the resume.",
      "Remote-work signals: add timezone, availability, internet speed, backup plan, portfolio link, and OnlineJobs.ph link."
    ]],
    ["4. Resume Draft", [
      `${record.name} | ${record.email} | Philippines | LinkedIn | OnlineJobs.ph | Portfolio`,
      "Summary: keep this factual and beginner-safe.",
      "Skills: list only tools the user can explain in an interview.",
      "Experience bullets: use provided work history only. Add bracketed placeholders for missing numbers.",
      "Projects: include the proof project if paid experience is thin."
    ]],
    ["5. Portfolio or Proof Project", [
      `Project: ${record.target_role} starter proof project`,
      "Steps: create one small sample, document the workflow, add screenshots, and write a short process note.",
      "Resume bullet: Built a role-matched proof project demonstrating organized execution, clear documentation, and tool practice."
    ]],
    ["6. Application Pack", [
      "LinkedIn About: I am building my path toward this remote role with honest proof and practical tools.",
      "OnlineJobs.ph summary: I can support role-matched tasks and can share a small proof project.",
      "Email pitch: Hello, I saw your opening and believe my background fits the support tasks listed. I can share my resume and proof sample.",
      "Follow-up: Hello, I wanted to follow up on my application. I am still interested and can send a relevant sample if helpful."
    ]],
    ["7. Your BFF Lesson Path", [
      "Start with the recommended live BFF curriculum links from the guide page.",
      "Use the lesson path to strengthen gaps before applying."
    ]],
    ["8. Jobs To Watch", [
      `Watch for: ${record.target_role}`,
      "Good-fit signals: clear task list, beginner-safe expectations, tools the user knows, and sample work accepted.",
      "Red flags: unpaid trial work, vague scope, senior strategy expectations, or tools the user cannot explain."
    ]],
    ["9. Community Updates and Tutorials", [
      "Check community updates weekly.",
      "Ask: Can someone review whether my proof project is enough for beginner applications?"
    ]],
    ["10. 7-Day Action Plan", [
      "Day 1: Finalize target role.",
      "Day 2: Draft resume summary and skills.",
      "Day 3: Outline proof project.",
      "Day 4: Create proof output.",
      "Day 5: Add project to resume and profile.",
      "Day 6: Prepare application pack.",
      "Day 7: Apply to 3 to 5 matched roles and ask for feedback."
    ]],
    ["11. Final Checklist", [
      "Resume matches target role.",
      "Portfolio proof exists.",
      "OnlineJobs.ph profile is updated.",
      "LinkedIn About is updated.",
      "Application pitch is ready.",
      "BFF lessons started.",
      "Job board filter bookmarked.",
      "Community question prepared."
    ]]
  ];
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Your Personalized BFF Resume and Portfolio Guide</title>
</head>
<body>
  <h1>Your Personalized BFF Resume and Portfolio Guide</h1>
  <p><strong>Generated:</strong> ${htmlEscape(record.created_at)}</p>
  <p><strong>Lead ID:</strong> ${htmlEscape(record.lead_id)}</p>
  <p><strong>Privacy note:</strong> Personal claims in this guide are suggestions based on submitted intake answers. Review before sending to employers.</p>
  ${sections.map(([title, lines]) => `
    <h2>${htmlEscape(title)}</h2>
    <ul>${lines.map(line => `<li>${htmlEscape(line)}</li>`).join("")}</ul>
  `).join("")}
</body>
</html>`;
}

function multipartBody(metadata, html) {
  const boundary = `bff-guide-${crypto.randomUUID()}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
    `--${boundary}--`,
    ""
  ].join("\r\n");
  return { boundary, body };
}

async function createGoogleDoc(payload, record, env) {
  const token = await googleAccessToken(env);
  if (!token) return null;
  const parents = env.GOOGLE_DRIVE_FOLDER_ID ? [env.GOOGLE_DRIVE_FOLDER_ID] : undefined;
  const metadata = {
    name: `BFF Personalized Guide - ${record.name} - ${record.lead_id}`,
    mimeType: "application/vnd.google-apps.document",
    ...(parents ? { parents } : {})
  };
  const { boundary, body } = multipartBody(metadata, guideHtml(payload, record));
  const upload = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": `multipart/related; boundary=${boundary}`
    },
    body
  });
  const file = await upload.json();
  if (!upload.ok || !file.id) {
    throw new Error(`Google Docs generation failed: ${sanitizeError(file.error && file.error.message || upload.status)}`);
  }
  const permission = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/permissions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      type: "user",
      role: "reader",
      emailAddress: record.email
    })
  });
  if (!permission.ok) {
    const result = await permission.json().catch(() => ({}));
    throw new Error(`Google Docs sharing failed: ${sanitizeError(result.error && result.error.message || permission.status)}`);
  }
  return file.webViewLink || `https://docs.google.com/document/d/${file.id}/edit`;
}

async function updateAction(id, action, env) {
  const record = await getRecord(id, env);
  if (!record) return null;
  const updated = {
    ...record,
    updated_at: nowIso(),
    last_action: action
  };
  if (action === "retry") {
    updated.retry_count = Number(record.retry_count || 0) + 1;
    updated.guide_status = "manual-review";
    updated.error_message = sanitizeError("Manual retry requested.");
  }
  if (action === "resend") {
    updated.resend_count = Number(record.resend_count || 0) + 1;
    updated.delivery_status = "resend-marked";
  }
  if (env && env.DB && typeof env.DB.prepare === "function") {
    await env.DB.prepare(`
      UPDATE bff_guide_leads
      SET updated_at = ?, guide_status = ?, delivery_status = ?, error_message = ?,
        retry_count = ?, resend_count = ?, last_action = ?
      WHERE lead_id = ?
    `).bind(
      updated.updated_at, updated.guide_status, updated.delivery_status,
      updated.error_message, updated.retry_count, updated.resend_count,
      updated.last_action, id
    ).run();
    return getRecord(id, env);
  }
  memoryStore.leads.set(id, updated);
  return updated;
}

function requireAdmin(request, env) {
  const expected = env && env.ADMIN_TOKEN;
  if (!expected) return true;
  const actual = request.headers.get("authorization") || "";
  return actual === `Bearer ${expected}`;
}

function csv(records) {
  const headers = [
    "lead_id", "created_at", "name", "email", "archetype", "target_role",
    "application_timeline", "guide_status", "document_url", "delivery_status",
    "private_payload_stored", "retry_count", "resend_count"
  ];
  const rows = [headers.join(",")];
  for (const record of records) {
    rows.push(headers.map(key => `"${String(record[key] ?? "").replace(/"/g, '""')}"`).join(","));
  }
  return rows.join("\n");
}

function archetypeCsv(records) {
  const headers = [
    "registration_id", "created_at", "email", "archetype", "archetype_name",
    "blocker", "proof_sample", "next_lesson_url", "source_page", "crm_status",
    "email_status", "brevo_status", "error_message"
  ];
  const rows = [headers.join(",")];
  for (const record of records) {
    rows.push(headers.map(key => `"${String(record[key] ?? "").replace(/"/g, '""')}"`).join(","));
  }
  return rows.join("\n");
}

function archetypeName(key) {
  return {
    polished: "Polished Freelancer",
    transitioner: "Corporate Transitioner",
    creative: "Creative Specialist",
    solo: "Solo Entrepreneur",
    generalist: "Generalist Admin",
    fresh: "Fresh Starter"
  }[key] || String(key || "Unknown");
}

function validateArchetypeRegistration(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object") return ["Submission body is required."];
  if (payload.website) errors.push("Spam check failed.");
  if (!EMAIL_RE.test(String(payload.email || "").trim())) errors.push("Valid email is required.");
  if (!payload.archetype) errors.push("Archetype is required.");
  return errors;
}

function buildArchetypeRegistration(payload, request) {
  const id = registrationId();
  const createdAt = nowIso();
  const sourcePage = String(payload.source_page || request.headers.get("referer") || "/bonafide-filipino-freelancers/archetype/");
  return {
    registration_id: id,
    created_at: createdAt,
    updated_at: createdAt,
    email: String(payload.email || "").trim().toLowerCase(),
    consent_version: payload.consent_version || ARCHETYPE_CONSENT_VERSION,
    source_page: sourcePage,
    archetype: String(payload.archetype || "").trim(),
    archetype_name: String(payload.archetype_name || archetypeName(payload.archetype)),
    blocker: String(payload.blocker || ""),
    proof_sample: String(payload.proof_sample || ""),
    next_lesson_url: String(payload.next_lesson_url || ""),
    q1: String(payload.q1 || ""),
    tools: String(payload.tools || ""),
    creative: String(payload.creative || ""),
    q4: String(payload.q4 || ""),
    q5: String(payload.q5 || ""),
    experience: String(payload.experience || ""),
    crm_status: "new",
    email_status: "not-configured",
    brevo_status: "not-configured",
    error_message: "",
    ip_hash: request.headers.get("cf-connecting-ip") ? "cf-ip-present" : "local"
  };
}

async function syncBrevoContact(record, env) {
  if (!env || !env.BREVO_API_KEY) return "not-configured";
  const attributes = {
    BFF_ARCHETYPE: record.archetype_name,
    BFF_BLOCKER: record.blocker,
    BFF_PROOF_SAMPLE: record.proof_sample,
    BFF_SOURCE_PAGE: record.source_page,
    BFF_CRM_STATUS: record.crm_status
  };
  const response = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": env.BREVO_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email: record.email,
      attributes,
      updateEnabled: true,
      ...(env.BREVO_BFF_LIST_ID ? { listIds: [Number(env.BREVO_BFF_LIST_ID)] } : {})
    })
  });
  if (response.ok || response.status === 204) return "synced";
  const result = await response.json().catch(() => ({}));
  throw new Error(`Brevo contact sync failed: ${sanitizeError(result.message || response.status)}`);
}

async function putArchetypeRegistration(record, env) {
  if (env && env.DB && typeof env.DB.prepare === "function") {
    await env.DB.prepare(`
      INSERT INTO bff_archetype_registrations (
        registration_id, created_at, updated_at, email, consent_version, source_page,
        archetype, archetype_name, blocker, proof_sample, next_lesson_url,
        q1, tools, creative, q4, q5, experience, crm_status, email_status,
        brevo_status, error_message, ip_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      record.registration_id, record.created_at, record.updated_at, record.email,
      record.consent_version, record.source_page, record.archetype, record.archetype_name,
      record.blocker, record.proof_sample, record.next_lesson_url, record.q1, record.tools,
      record.creative, record.q4, record.q5, record.experience, record.crm_status,
      record.email_status, record.brevo_status, record.error_message, record.ip_hash
    ).run();
    return;
  }
  memoryStore.archetypeRegistrations.set(record.registration_id, record);
}

async function handleArchetypeRegistration(request, env) {
  let payload;
  try {
    payload = await requestData(request);
  } catch (error) {
    return badRequest(["Valid submission body is required."]);
  }
  const errors = validateArchetypeRegistration(payload);
  if (errors.length) return badRequest(errors);
  if (rateLimit(request, payload, { ...(env || {}), DAILY_LIMIT_PER_EMAIL_IP: env && env.DAILY_LIMIT_PER_EMAIL_IP || 10 })) {
    return json({ ok: false, errors: ["Daily submission limit reached."] }, { status: 429 });
  }

  const record = buildArchetypeRegistration(payload, request);
  try {
    record.brevo_status = await syncBrevoContact(record, env);
  } catch (error) {
    record.brevo_status = "failed";
    record.error_message = sanitizeError(error.message);
  }
  await putArchetypeRegistration(record, env);
  return json({
    ok: true,
    registration_id: record.registration_id,
    crm_status: record.crm_status,
    email_status: record.email_status,
    brevo_status: record.brevo_status
  }, { status: 201 });
}

async function handleIntake(request, env) {
  let payload;
  try {
    payload = await requestData(request);
  } catch (error) {
    return badRequest(["Valid JSON body is required."]);
  }
  const errors = validatePayload(payload);
  if (errors.length) return badRequest(errors);
  if (rateLimit(request, payload, env)) {
    return json({ ok: false, errors: ["Daily submission limit reached."] }, { status: 429 });
  }
  const turnstileOk = await verifyTurnstile(payload.turnstile_token, request, env);
  if (!turnstileOk) return json({ ok: false, errors: ["Turnstile verification failed."] }, { status: 403 });
  if (env && env.SIMULATE_GOOGLE_DOCS_FAILURE === "1") {
    return json({ ok: false, errors: ["Google Docs generation failed."] }, { status: 502 });
  }

  const record = buildRecord(payload, request);
  const googleDocUrl = await createGoogleDoc(payload, record, env);
  record.document_url = googleDocUrl || documentUrl(record, env);
  if (env && env.SIMULATE_EMAIL_FAILURE === "1") {
    record.delivery_status = "email-failed";
    record.error_message = "Email delivery failed.";
  }
  await putRecord(record, payload, env);
  return json({
    ok: true,
    lead_id: record.lead_id,
    guide_status: record.guide_status,
    document_url: record.document_url,
    delivery_status: record.delivery_status,
    private_payload_stored: record.private_payload_stored
  }, { status: 201 });
}

async function handleStatus(id, env) {
  const record = await getRecord(id, env);
  if (!record) return json({ ok: false, errors: ["Lead not found."] }, { status: 404 });
  return json({
    ok: true,
    lead_id: record.lead_id,
    guide_status: record.guide_status,
    document_url: record.document_url,
    delivery_status: record.delivery_status,
    private_payload_stored: Boolean(record.private_payload_stored)
  });
}

async function handleAdmin(request, env, action, id) {
  if (!requireAdmin(request, env)) return json({ ok: false, errors: ["Unauthorized."] }, { status: 401 });
  if (action === "leads") return json({ ok: true, leads: await listRecords(env) });
  if (action === "export") return text(csv(await listRecords(env)), { headers: { "content-type": "text/csv; charset=utf-8" } });
  if (action === "archetype-registrations") return json({ ok: true, registrations: await listArchetypeRegistrations(env) });
  if (action === "archetype-registrations.csv") return text(archetypeCsv(await listArchetypeRegistrations(env)), { headers: { "content-type": "text/csv; charset=utf-8" } });
  if ((action === "retry" || action === "resend") && id) {
    const updated = await updateAction(id, action, env);
    if (!updated) return json({ ok: false, errors: ["Lead not found."] }, { status: 404 });
    return json({ ok: true, lead: updated });
  }
  return json({ ok: false, errors: ["Unknown admin action."] }, { status: 404 });
}

async function fetchHandler(request, env = {}) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type, authorization"
      }
    });
  }
  if (request.method === "POST" && path === "/api/bff-guide/intake") return handleIntake(request, env);
  if (request.method === "POST" && path === "/api/bff-archetype/register") return handleArchetypeRegistration(request, env);
  if (request.method === "GET" && path.startsWith("/api/bff-guide/status/")) {
    return handleStatus(path.split("/").pop(), env);
  }
  if (path === "/api/admin/bff-guide/leads" && request.method === "GET") return handleAdmin(request, env, "leads");
  if (path === "/api/admin/bff-guide/export.csv" && request.method === "GET") return handleAdmin(request, env, "export");
  if (path === "/api/admin/bff-guide/archetype-registrations" && request.method === "GET") return handleAdmin(request, env, "archetype-registrations");
  if (path === "/api/admin/bff-guide/archetype-registrations.csv" && request.method === "GET") return handleAdmin(request, env, "archetype-registrations.csv");
  if (path.startsWith("/api/admin/bff-guide/") && request.method === "POST") {
    const parts = path.split("/");
    return handleAdmin(request, env, parts.pop(), parts.at(-1));
  }
  return json({ ok: false, errors: ["Not found."] }, { status: 404 });
}

export { ARCHETYPE_CONSENT_VERSION, CONSENT_VERSION, DEV_TURNSTILE_TOKEN, memoryStore, fetchHandler };

export default {
  fetch: fetchHandler
};
