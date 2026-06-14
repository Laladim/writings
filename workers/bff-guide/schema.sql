CREATE TABLE IF NOT EXISTS bff_guide_leads (
  lead_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  source_page TEXT NOT NULL,
  archetype TEXT NOT NULL,
  target_role TEXT NOT NULL,
  secondary_roles TEXT NOT NULL,
  application_timeline TEXT NOT NULL,
  guide_status TEXT NOT NULL,
  document_url TEXT NOT NULL,
  pdf_url TEXT,
  delivery_preference TEXT NOT NULL,
  delivery_status TEXT NOT NULL,
  error_message TEXT,
  private_payload_stored INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  resend_count INTEGER NOT NULL DEFAULT 0,
  last_action TEXT NOT NULL,
  ip_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_guide_leads_created_at
  ON bff_guide_leads (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bff_guide_leads_email
  ON bff_guide_leads (email);

CREATE TABLE IF NOT EXISTS bff_guide_private_payloads (
  lead_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  work_history TEXT,
  resume_text TEXT,
  biggest_struggle TEXT,
  job_url TEXT,
  FOREIGN KEY (lead_id) REFERENCES bff_guide_leads (lead_id)
);

CREATE TABLE IF NOT EXISTS bff_archetype_registrations (
  registration_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  email TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  source_page TEXT NOT NULL,
  archetype TEXT NOT NULL,
  archetype_name TEXT NOT NULL,
  blocker TEXT,
  proof_sample TEXT,
  next_lesson_url TEXT,
  q1 TEXT,
  tools TEXT,
  creative TEXT,
  q4 TEXT,
  q5 TEXT,
  experience TEXT,
  crm_status TEXT NOT NULL DEFAULT 'new',
  email_status TEXT NOT NULL DEFAULT 'not-configured',
  brevo_status TEXT NOT NULL DEFAULT 'not-configured',
  error_message TEXT,
  ip_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_archetype_registrations_created_at
  ON bff_archetype_registrations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bff_archetype_registrations_email
  ON bff_archetype_registrations (email);

CREATE INDEX IF NOT EXISTS idx_bff_archetype_registrations_status
  ON bff_archetype_registrations (crm_status);
