/**
 * BFF Lesson Registry — Single Source of Truth
 *
 * Loaded by: Blueprint, Find Your Path Quiz, Resume Builder, Personalized Curriculum Lead Magnet
 * No fetch — sets window.SWAHG_LESSONS so it works on file:// + GitHub Pages.
 *
 * Schema notes:
 *   lessons[slug]          → individual lesson nodes
 *   blueprint_boxes[box]   → maps PDF blueprint boxes (5 per stage) to lesson_slugs[]
 *   va_gaps[slug]          → Mar 18 2026 community gap data (641 candidates)
 *   roles[slug]            → Job List Role Categories. Market-mix SNAPSHOT from
 *                            2026-05-11 (244 rows). NOT the live board (see
 *                            meta.live_board). Role keys here are load-bearing:
 *                            lessons[].ladders_to_roles references them, so do not
 *                            rename them. NOTE: the live board's role taxonomy has
 *                            since shifted (Customer Support now dominates; SEO +
 *                            Community Manager added); a full re-derivation is a
 *                            separate task that must remap ladders_to_roles too.
 *
 * Update protocol:
 *   - When a lesson is rewritten/published, change lessons[slug].url + status
 *   - When a new lesson is added, add to lessons[] + update affected blueprint_boxes[].lessons
 *   - When VA dataset refreshes, update va_gaps coverage_pct
 *   - When Job List role mix shifts ≥5 points, update roles.market_pct
 *
 * Status enum: live · rewrite · new · built · external
 * Tier enum: 0 (existing live) · 1 (Tier 1 rewrites) · 2 (Tier 2 new modules) · 3 (Tier 3 hero) · 4 (future)
 */

window.SWAHG_LESSONS = {
  meta: {
    version: "1.0",
    last_updated: "2026-06-10",
    blueprint_pdf_source: "Bonafide Filipino Freelancer Simplified Blueprint",
    data_sources: {
      va_assessments: { date: "2026-03-18", candidates: 641 },
      // job_list = the 2026-05-11 market-mix SNAPSHOT that the roles[] block below
      // was derived from. It is NOT the live job board. Kept as a dated strategy
      // snapshot (roles[].market_pct only changes on a >=5pt mix shift). Do not
      // cite active_rows as the live count.
      job_list: { date: "2026-05-11", active_rows: 244, note: "market-mix snapshot for roles[]; not the live board" },
      // live_board = the count learners actually see; auto-refreshed daily by the
      // Rodge GitHub Actions pipeline. Source of truth: jobs/data/run-manifest.json.
      live_board: { date: "2026-06-10", job_count: 40, source: "jobs/data/run-manifest.json", note: "auto-refreshes daily; rolling, not cumulative" },
      lesson_scrape: { date: "2026-05-11", pages: 58 }
    }
  },

  va_gaps: {
    "time-tracking":     { name: "Time tracking",        coverage_pct: 2,  severity: "CRITICAL" },
    "email-marketing":   { name: "Email marketing",      coverage_pct: 4,  severity: "CRITICAL" },
    "social-media-tools":{ name: "Social media tools",   coverage_pct: 7,  severity: "HIGH" },
    "video-editing":     { name: "Video editing",        coverage_pct: 13, severity: "HIGH" },
    "crm":               { name: "CRM",                  coverage_pct: 14, severity: "HIGH" },
    "pm-tools":          { name: "PM tools",             coverage_pct: 23, severity: "HIGH" }
  },

  roles: {
    "customer-service": { name: "Customer Service",         market_pct: 24, jobs: 58, no_calls_jobs: 43 },
    "smm":              { name: "Social Media Manager",     market_pct: 18, jobs: 43, no_calls_jobs: 42 },
    "account-manager":  { name: "Account Manager",          market_pct: 13, jobs: 32, no_calls_jobs: 30 },
    "sdr":              { name: "Sales Development Rep",    market_pct: 13, jobs: 31, no_calls_jobs: 0 },
    "admin":            { name: "Admin Assistant",          market_pct: 9,  jobs: 23, no_calls_jobs: 20 },
    "content":          { name: "Content Creator",          market_pct: 9,  jobs: 21, no_calls_jobs: 21 },
    "va":               { name: "Virtual Assistant",        market_pct: 2,  jobs: 6,  no_calls_jobs: 5 }
  },

  stages: {
    "prep":     { name: "Preparation",   row: "top",    order: 1 },
    "warmup":   { name: "Warming Up",    row: "top",    order: 2 },
    "launch":   { name: "Launch",        row: "top",    order: 3 },
    "working":  { name: "Working on it!",row: "top",    order: 4 },
    "stage1":   { name: "Stage 1",       row: "bottom", order: 5 },
    "skill":    { name: "Skill Upgrade", row: "bottom", order: 6 },
    "higher":   { name: "Higher Level",  row: "bottom", order: 7 },
    "business": { name: "Business Branch",row:"bottom", order: 8 }
  },

  /* ────────────────────────────────────────────────────────────
   *  LESSONS — individual content units (live or queued)
   * ──────────────────────────────────────────────────────────── */
  lessons: {

    /* ====== Applicant-to-Hired series (AI-threaded case study) ====== */
    "find-clients-ai-aggregator": {
      title: "How to Find Clients With an AI Job Aggregator",
      stage: "launch",
      status: "live",
      url: "lesson-find-clients-ai-aggregator/",
      closes_va_gaps: [],
      ladders_to_roles: ["va","customer-service","smm","content","admin"],
      prerequisites: [],
      next_lessons: ["what-is-hiring-cafe-and-why-use-it","reading-a-job-post"],
      why_this_lesson: "Find more and better clients by letting an AI aggregator gather many job sites into one feed. The gentle on-ramp to using AI.",
      estimated_minutes: 20,
      tier: 1,
      format: "module"
    },
    "what-is-hiring-cafe-and-why-use-it": {
      title: "What Is hiring.cafe and Why Use It",
      stage: "launch",
      status: "live",
      url: "lesson-what-is-hiring-cafe-and-why-use-it/",
      closes_va_gaps: [],
      ladders_to_roles: ["va","customer-service","smm","content","admin"],
      prerequisites: ["find-clients-ai-aggregator"],
      next_lessons: ["why-is-an-ai-powered-job-aggregator-better-than-one-job-site"],
      why_this_lesson: "The gentlest first contact with AI: a free tool that gathers jobs for you.",
      estimated_minutes: 8,
      tier: 1,
      format: "lesson"
    },
    "why-is-an-ai-powered-job-aggregator-better-than-one-job-site": {
      title: "Why an AI Aggregator Beats One Job Site",
      stage: "launch",
      status: "live",
      url: "lesson-why-is-an-ai-powered-job-aggregator-better-than-one-job-site/",
      closes_va_gaps: [],
      ladders_to_roles: ["va","customer-service","smm","content","admin"],
      prerequisites: ["find-clients-ai-aggregator"],
      next_lessons: ["what-is-the-problem-with-relying-only-on-onlinejobs-ph"],
      why_this_lesson: "The honest comparison: one site is one window, an aggregator is the whole street.",
      estimated_minutes: 8,
      tier: 1,
      format: "lesson"
    },
    "what-is-the-problem-with-relying-only-on-onlinejobs-ph": {
      title: "The Problem With Relying Only on OnlineJobs.ph",
      stage: "launch",
      status: "live",
      url: "lesson-what-is-the-problem-with-relying-only-on-onlinejobs-ph/",
      closes_va_gaps: [],
      ladders_to_roles: ["va","customer-service","smm","content","admin"],
      prerequisites: ["find-clients-ai-aggregator"],
      next_lessons: ["how-do-i-avoid-low-ball-clients"],
      why_this_lesson: "One pond fills with one kind of pay. Keep the site, add the market.",
      estimated_minutes: 7,
      tier: 1,
      format: "lesson"
    },
    "how-do-i-avoid-low-ball-clients": {
      title: "How to Avoid Low-Ball Clients",
      stage: "launch",
      status: "live",
      url: "lesson-how-do-i-avoid-low-ball-clients/",
      closes_va_gaps: [],
      ladders_to_roles: ["va","customer-service","smm","content","admin"],
      prerequisites: ["find-clients-ai-aggregator"],
      next_lessons: ["raising-your-rate"],
      why_this_lesson: "Low offers are a pattern you can spot and skip, not a verdict on your worth.",
      estimated_minutes: 8,
      tier: 1,
      format: "lesson"
    },

    /* ====== Applicant-to-Hired: portfolio cluster ====== */
    "copy-paste-portfolio-doc": {
      title: "Build a Copy-Paste Portfolio Document",
      stage: "warmup",
      status: "live",
      url: "lesson-copy-paste-portfolio-doc/",
      closes_va_gaps: [],
      ladders_to_roles: ["va","customer-service","smm","content","admin"],
      prerequisites: [],
      next_lessons: ["what-is-a-portfolio-document-and-why-do-i-need-one","find-clients-ai-aggregator"],
      why_this_lesson: "One paste-ready document with all your details. Turns a 20-minute application into 2 and gives your wins a home.",
      estimated_minutes: 20,
      tier: 1,
      format: "module"
    },
    "what-is-a-portfolio-document-and-why-do-i-need-one": {
      title: "What Is a Portfolio Document and Why Do I Need One",
      stage: "warmup",
      status: "live",
      url: "lesson-what-is-a-portfolio-document-and-why-do-i-need-one/",
      closes_va_gaps: [],
      ladders_to_roles: ["va","customer-service","smm","content","admin"],
      prerequisites: ["copy-paste-portfolio-doc"],
      next_lessons: ["where-do-i-keep-my-portfolio-if-i-have-no-website"],
      why_this_lesson: "The plain answer for beginners: what a portfolio document is and why it comes before a website.",
      estimated_minutes: 6,
      tier: 1,
      format: "lesson"
    },
    "where-do-i-keep-my-portfolio-if-i-have-no-website": {
      title: "Where to Keep Your Portfolio With No Website",
      stage: "warmup",
      status: "live",
      url: "lesson-where-do-i-keep-my-portfolio-if-i-have-no-website/",
      closes_va_gaps: [],
      ladders_to_roles: ["va","customer-service","smm","content","admin"],
      prerequisites: ["copy-paste-portfolio-doc"],
      next_lessons: ["how-do-i-use-notion-as-a-portfolio"],
      why_this_lesson: "Free homes for your work that look professional and need no website.",
      estimated_minutes: 7,
      tier: 1,
      format: "lesson"
    },
    "how-do-i-use-notion-as-a-portfolio": {
      title: "How to Use Notion as a Portfolio",
      stage: "warmup",
      status: "live",
      url: "lesson-how-do-i-use-notion-as-a-portfolio/",
      closes_va_gaps: [],
      ladders_to_roles: ["va","customer-service","smm","content","admin"],
      prerequisites: ["copy-paste-portfolio-doc"],
      next_lessons: ["find-clients-ai-aggregator"],
      why_this_lesson: "A free, clean Notion portfolio in one sitting, with the share setting people forget.",
      estimated_minutes: 8,
      tier: 1,
      format: "lesson"
    },

    /* ====== Fresh Starter / Preparation ====== */
    "best-laptop": {
      title: "Best Laptop",
      stage: "prep",
      status: "live",
      url: "lesson-choosing-your-computer/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","account-manager","sdr","admin","content","va"],
      prerequisites: [],
      next_lessons: ["browser-expert-secrets","storage-expert-secrets"],
      why_this_lesson: "Your setup gates every other lesson. Get hardware right before spending on tools.",
      estimated_minutes: 12,
      tier: 0,
      format: "video"
    },
    "browser-expert-secrets": {
      title: "Browser Expert Secrets",
      stage: "prep",
      status: "live",
      url: "lesson-browser-expert-secrets/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","account-manager","sdr","admin","content","va"],
      prerequisites: ["best-laptop"],
      next_lessons: ["storage-expert-secrets","trello-love"],
      why_this_lesson: "Browser setup quietly saves hours every week — extensions, profiles, password manager.",
      estimated_minutes: 10,
      tier: 0,
      format: "video"
    },
    "storage-expert-secrets": {
      title: "Storage Expert Secrets",
      stage: "prep",
      status: "live",
      url: "lesson-storage-expert-secrets/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","account-manager","sdr","admin","content","va"],
      prerequisites: ["best-laptop"],
      next_lessons: ["trello-love"],
      why_this_lesson: "Google Drive vs Dropbox vs local — pick the system before files start piling up.",
      estimated_minutes: 10,
      tier: 0,
      format: "video"
    },
    "internet-connection-readiness": {
      title: "Internet Connection Readiness",
      stage: "prep",
      status: "live",
      url: "lesson-internet-connection-readiness/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","account-manager","sdr","admin","content","va"],
      prerequisites: ["best-laptop"],
      next_lessons: ["bank-account-payment-readiness","work-accessories"],
      why_this_lesson: "Tests speed, stability, backup internet, workspace signal, and the client-ready reliability line before remote work starts.",
      estimated_minutes: 15,
      tier: 2,
      format: "guide"
    },
    "bank-account-payment-readiness": {
      title: "Bank Account and Payment Readiness",
      stage: "prep",
      status: "live",
      url: "lesson-bank-account-payment-readiness/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","account-manager","sdr","admin","content","va"],
      prerequisites: [],
      next_lessons: ["browser-expert-secrets","storage-expert-secrets"],
      why_this_lesson: "Prepares an own-name receiving account, valid ID, payment-name match, backup payment rail, and simple income record before client onboarding.",
      estimated_minutes: 15,
      tier: 2,
      format: "guide"
    },
    "email-address-is-gold": {
      title: "Email Address Expert Secrets",
      stage: "prep",
      status: "rewrite",
      url: "lesson-email-address-expert-secrets/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","account-manager","sdr","admin","content","va"],
      prerequisites: [],
      next_lessons: ["email-marketing-for-vas"],
      why_this_lesson: "Existing lesson covers email setup. Being rewritten as Email Marketing for VAs (Tier 1).",
      estimated_minutes: 8,
      tier: 0,
      format: "video"
    },
    "email-marketing-for-vas": {
      title: "Email Marketing for VAs",
      stage: "warmup",
      status: "live",
      url: "lesson-email-marketing-for-vas/",
      closes_va_gaps: ["email-marketing"],
      ladders_to_roles: ["customer-service","smm","content","admin"],
      prerequisites: ["email-address-is-gold"],
      next_lessons: ["personal-branding"],
      why_this_lesson: "96% of the community lacks this skill. Title-trap fix on the old 'Email Address is Gold' lesson — covers sequences, broadcasts, list-building. Tier 1 priority.",
      estimated_minutes: 30,
      tier: 1,
      format: "article",
      build_queue_rank: 2
    },
    "free-upskilling-vault": {
      title: "The Free Upskilling Vault",
      stage: "warmup",
      status: "live",
      url: "lesson-free-upskilling-vault/",
      closes_va_gaps: ["email-marketing"],
      ladders_to_roles: ["customer-service","smm","account-manager","sdr","admin","content","va"],
      prerequisites: [],
      next_lessons: ["finish-courses-with-ai","master-tools-with-ai"],
      why_this_lesson: "The free courses and uncommon gold-find certifications worth your time in 2026, mapped to your role, each tied to the proof you should build. Finish one, prove it, move on.",
      estimated_minutes: 20,
      tier: 2,
      format: "guide"
    },
    "2026-tool-stack": {
      title: "The 2026 Tool Stack",
      stage: "warmup",
      status: "live",
      url: "lesson-2026-tool-stack/",
      closes_va_gaps: ["pm-tools","crm","email-marketing","social-media-tools","video-editing","time-tracking"],
      ladders_to_roles: ["customer-service","smm","account-manager","sdr","admin","content","va"],
      prerequisites: [],
      next_lessons: ["master-tools-with-ai","finish-courses-with-ai"],
      why_this_lesson: "The tools each remote role actually needs in 2026, where to learn each one free, and the community skill gap each one closes. Learn your role's 3 to 5, not everyone's 50.",
      estimated_minutes: 20,
      tier: 2,
      format: "guide"
    },
    "master-tools-with-ai": {
      title: "How to Master Tools Using AI",
      stage: "working",
      status: "live",
      url: "lesson-master-tools-with-ai/",
      closes_va_gaps: ["pm-tools"],
      ladders_to_roles: ["customer-service","smm","account-manager","sdr","admin","content","va"],
      prerequisites: [],
      next_lessons: ["google-sites-portfolio","resume-builder"],
      why_this_lesson: "Practice one tool at a time with free AI as your coach. Close the hire gap from about 3 tools to 5 by building one proven client task at a time.",
      estimated_minutes: 30,
      tier: 2,
      format: "module"
    },
    "30-day-hired-plan": {
      title: "The 30-Day Hired Plan",
      stage: "working",
      status: "live",
      url: "lesson-30-day-hired-plan/",
      closes_va_gaps: [],
      ladders_to_roles: ["admin","va","customer-service","account-manager"],
      prerequisites: [],
      next_lessons: ["interviews-prep","master-tools-with-ai"],
      why_this_lesson: "One AI-assisted service (inbox + calendar), one recorded proof artifact, one aimed pitch a day for 30 days. Proof-first hiring run sized to one hour a day.",
      estimated_minutes: 30,
      tier: 2,
      format: "module"
    },
    "finish-courses-with-ai": {
      title: "How to Finish a Course Using AI",
      stage: "working",
      status: "live",
      url: "lesson-finish-courses-with-ai/",
      closes_va_gaps: ["email-marketing"],
      ladders_to_roles: ["customer-service","smm","account-manager","sdr","admin","content","va"],
      prerequisites: [],
      next_lessons: ["master-tools-with-ai","email-marketing-for-vas"],
      why_this_lesson: "Sibling of the One-Tool Proof Loop: AI as examiner, not note-taker. Converts any free course into a client-visible artifact via the Course-to-Proof Loop; walkthrough closes the 96% email-marketing gap.",
      estimated_minutes: 30,
      tier: 2,
      format: "module"
    },
    "trello-love": {
      title: "Trello Love",
      stage: "prep",
      status: "live",
      url: "lesson-trello-love/",
      closes_va_gaps: ["pm-tools"],
      ladders_to_roles: ["account-manager","admin","va","content","smm"],
      prerequisites: [],
      next_lessons: [],
      why_this_lesson: "Trello is the entry-level PM tool. 77% of community lacks PM-tool fluency — this opens the door.",
      estimated_minutes: 14,
      tier: 0,
      format: "video"
    },
    "work-accessories": {
      title: "Setting Up Work Accessories",
      stage: "prep",
      status: "live",
      url: "lesson-work-accessories/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","va","admin"],
      prerequisites: ["best-laptop"],
      next_lessons: ["english-101"],
      why_this_lesson: "Headset, lighting, internet backup, ergonomic basics. Currently a gap. Quick build.",
      estimated_minutes: 10,
      tier: 2,
      format: "article"
    },

    /* ====== Fresh Starter / Warming Up ====== */
    "where-to-start": {
      title: "Where to Start?",
      stage: "warmup",
      status: "live",
      url: "lesson-where-to-start/",
      closes_va_gaps: [],
      ladders_to_roles: [],
      prerequisites: [],
      next_lessons: ["freelancer-or-va","employee-to-freelancer"],
      why_this_lesson: "Mindset + practical planning. Pairs with Freelancing Journey Lesson 2.",
      estimated_minutes: 10,
      tier: 0,
      format: "video"
    },
    "freelancer-or-va": {
      title: "Freelancer or VA?",
      stage: "warmup",
      status: "live",
      url: "lesson-freelancer-or-va/",
      closes_va_gaps: [],
      ladders_to_roles: ["va"],
      prerequisites: [],
      next_lessons: ["10-secret-skills"],
      why_this_lesson: "The first decision: who do you want to become online? Sets direction for everything after.",
      estimated_minutes: 8,
      tier: 0,
      format: "video"
    },
    "employee-to-freelancer": {
      title: "Employee to Freelancer",
      stage: "warmup",
      status: "live",
      url: "lesson-employee-to-freelancer/",
      closes_va_gaps: [],
      ladders_to_roles: [],
      prerequisites: [],
      next_lessons: ["freelancing-journey-series"],
      why_this_lesson: "If you're still employed, this is the practical transition guide — test waters first.",
      estimated_minutes: 12,
      tier: 0,
      format: "video"
    },
    "10-secret-skills": {
      title: "Your Free BFF Toolbox",
      stage: "warmup",
      status: "live",
      url: "lesson-10-secret-skills/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","account-manager","sdr","admin","content","va"],
      prerequisites: [],
      next_lessons: ["career-path-training","resume-builder"],
      why_this_lesson: "A guided tour of every free BFF resource and the exact order to use them. The 6-step Toolbox Loop: Blueprint, Archetype Finder, Curriculum, Resume Builder, Job Board, Community. Cures the where-do-I-start freeze by turning the tools from a menu into a sequence, with one small proof from each.",
      estimated_minutes: 25,
      tier: 2,
      format: "guide"
    },
    "online-jobs-account": {
      title: "OnlineJobs.ph Account Setup",
      stage: "launch",
      status: "live",
      url: "lesson-online-jobs-account/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va","account-manager","content","sdr"],
      prerequisites: ["personal-branding"],
      next_lessons: ["freelancing-platforms"],
      why_this_lesson: "Setting up OnlineJobs.ph properly first time saves weeks of platform-friction.",
      estimated_minutes: 12,
      tier: 0,
      format: "video"
    },
    "english-101": {
      title: "English Communications 101",
      stage: "warmup",
      status: "live",
      url: "lesson-english-101/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","admin","content"],
      prerequisites: [],
      next_lessons: ["customer-support-foundations"],
      why_this_lesson: "Speak English with a free AI voice coach via the Tell-It-Twice Loop. Apply to No-Calls roles now, practice daily for the talking roles that pay more.",
      estimated_minutes: 20,
      tier: 1,
      format: "module"
    },
    "support-group": {
      title: "The Value of a Support Group",
      stage: "warmup",
      status: "live",
      url: "lesson-support-group/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va"],
      prerequisites: ["english-101"],
      next_lessons: ["smm-core-strategies","groups-and-forums"],
      why_this_lesson: "Support Group box anchor. Helps learners understand why community matters and how to connect with BFF for accountability, feedback, job leads, and encouragement.",
      estimated_minutes: 12,
      tier: 0,
      format: "guide"
    },

    /* ====== Freelancing Journey (long-form anchor) ====== */
    "freelancing-journey-series": {
      title: "Freelancing Journey · Lessons 1-6",
      stage: "working",
      status: "live",
      url: "lesson-freelancing-journey-lesson-1/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va"],
      prerequisites: [],
      next_lessons: ["common-mistakes"],
      why_this_lesson: "The depth of the BFF canon. 6 lessons + activities. Currently titled 'Lesson 1-6' (needs re-titling per gap matrix Rank 10).",
      estimated_minutes: 90,
      tier: 0,
      format: "video_series"
    },
    "groups-and-forums": {
      title: "How to Use Groups and Forums Without Spamming",
      stage: "launch",
      status: "live",
      url: "lesson-groups-and-forums/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va","account-manager","content","sdr"],
      prerequisites: ["support-group"],
      next_lessons: ["job-board","freelancing-platforms"],
      why_this_lesson: "Practical guide to using Reddit, Facebook business owner groups, and VA communities for client language research, trust building, and safer networking.",
      estimated_minutes: 18,
      tier: 0,
      format: "guide"
    },

    /* ====== Career Path Training ====== */
    "career-path-training": {
      title: "Career Path Training (overview)",
      stage: "warmup",
      status: "live",
      url: "curriculum/",
      closes_va_gaps: [],
      ladders_to_roles: ["admin","content","va"],
      prerequisites: ["10-secret-skills"],
      next_lessons: ["specialized-business-skills","creative-artistic-skills"],
      why_this_lesson: "Three-track menu: Specialized Business, Creative/Artistic, Technical. Pick one to build depth.",
      estimated_minutes: 8,
      tier: 0,
      format: "video"
    },
    "specialized-business-skills": {
      title: "Specialized Business Skills",
      stage: "warmup",
      status: "live",
      url: "lesson-specialized-business-skills/",
      closes_va_gaps: [],
      ladders_to_roles: ["admin","account-manager","va","customer-service"],
      prerequisites: ["career-path-training"],
      next_lessons: ["trello-love"],
      why_this_lesson: "Admin track depth — data entry, project coordination, ops support. Closest path to Admin Assistant.",
      estimated_minutes: 25,
      tier: 0,
      format: "video"
    },
    "creative-artistic-skills": {
      title: "Creative + Artistic Skills",
      stage: "warmup",
      status: "live",
      url: "lesson-creativeartistic-skills/",
      closes_va_gaps: [],
      ladders_to_roles: ["content","smm"],
      prerequisites: ["career-path-training"],
      next_lessons: ["personal-branding","smm-core-strategies"],
      why_this_lesson: "Creative track depth — design basics, content production, visual portfolio. For Content Creator path.",
      estimated_minutes: 22,
      tier: 0,
      format: "video"
    },
    /* ====== SMM Core Training ====== */
    "smm-core-strategies": {
      title: "SMM Core Strategies",
      stage: "warmup",
      status: "live",
      url: "lesson-smm-core-strategies/",
      closes_va_gaps: [],
      ladders_to_roles: ["smm","content"],
      prerequisites: [],
      next_lessons: ["smm-toolkit-2026","instagram-strategy","fb-mobile-management"],
      why_this_lesson: "SMM strategy foundation, now content-pillar and one-week-plan driven (v3, ungated). Pairs with the SMM Toolkit workflow and the platform lessons.",
      estimated_minutes: 20,
      tier: 0,
      format: "video"
    },
    "smm-toolkit-2026": {
      title: "SMM Toolkit and Workflow 2026",
      stage: "warmup",
      status: "live",
      url: "lesson-smm-toolkit-2026/",
      closes_va_gaps: ["social-media-tools"],
      ladders_to_roles: ["smm","content"],
      prerequisites: ["smm-core-strategies"],
      next_lessons: ["getting-hired-fast","instagram-strategy"],
      why_this_lesson: "Closes the 7% social-media-tools gap with the doing, not a tour: the four-layer stack (plan, make, schedule, measure) and the repeatable weekly workflow a hired SMM runs. The execution spine the platform lessons plug into.",
      estimated_minutes: 30,
      tier: 2,
      format: "module"
    },
    "instagram-strategy": {
      title: "Instagram Strategy",
      stage: "warmup",
      status: "live",
      url: "lesson-instagram-strategy/",
      closes_va_gaps: [],
      ladders_to_roles: ["smm","content"],
      prerequisites: ["smm-core-strategies"],
      next_lessons: ["fb-mobile-management","fb-chatbot-training","pinterest-marketing","youtube-best-practices","getting-hired-fast"],
      why_this_lesson: "IG tactic depth — content cadence, hashtag strategy, reel patterns.",
      estimated_minutes: 18,
      tier: 0,
      format: "video"
    },
    "fb-chatbot-training": {
      title: "FB + Chatbot Training",
      stage: "warmup",
      status: "live",
      url: "lesson-fb-chatbot-training/",
      closes_va_gaps: ["social-media-tools"],
      ladders_to_roles: ["smm","content","customer-service"],
      prerequisites: ["smm-core-strategies"],
      next_lessons: ["fb-mobile-management"],
      why_this_lesson: "Facebook page messaging and chatbot basics for SMM and support work.",
      estimated_minutes: 22,
      tier: 0,
      format: "video"
    },
    "fb-mobile-management": {
      title: "FB Mobile Management",
      stage: "warmup",
      status: "live",
      url: "lesson-fb-mobile-management/",
      closes_va_gaps: ["social-media-tools"],
      ladders_to_roles: ["smm","content","customer-service"],
      prerequisites: ["smm-core-strategies"],
      next_lessons: ["pinterest-marketing"],
      why_this_lesson: "Manage Facebook work from mobile without losing process, access, or response discipline.",
      estimated_minutes: 18,
      tier: 0,
      format: "video"
    },
    "pinterest-marketing": {
      title: "Pinterest Marketing",
      stage: "warmup",
      status: "live",
      url: "lesson-pinterest-marketing/",
      closes_va_gaps: ["social-media-tools"],
      ladders_to_roles: ["smm","content"],
      prerequisites: ["smm-core-strategies"],
      next_lessons: ["youtube-best-practices"],
      why_this_lesson: "Platform-specific content marketing lesson for learners building SMM depth beyond Facebook and Instagram.",
      estimated_minutes: 18,
      tier: 0,
      format: "video"
    },
    "youtube-best-practices": {
      title: "YouTube Best Practices",
      stage: "warmup",
      status: "live",
      url: "lesson-youtube-best-practices/",
      closes_va_gaps: ["social-media-tools","video-editing"],
      ladders_to_roles: ["smm","content"],
      prerequisites: ["smm-core-strategies"],
      next_lessons: ["video-editing-content-vas"],
      why_this_lesson: "YouTube publishing habits, channel hygiene, and content support basics for SMM and content VA work.",
      estimated_minutes: 20,
      tier: 0,
      format: "video"
    },
    "getting-hired-fast": {
      title: "Getting Hired Fast (SMM)",
      stage: "working",
      status: "live",
      url: "lesson-getting-hired-fast/",
      closes_va_gaps: [],
      ladders_to_roles: ["smm"],
      prerequisites: ["smm-core-strategies","smm-toolkit-2026","personal-branding"],
      next_lessons: ["personal-branding","common-mistakes"],
      why_this_lesson: "Applicant tactics that get response (v3): the 30-day plan, the SMM portfolio sample a hirer actually opens, fill-in cover letter and Loom templates, and a live Job Board link. SMM-specific but principles transfer.",
      estimated_minutes: 20,
      tier: 0,
      format: "video"
    },

    /* ====== Personal Brand ====== */
    "personal-branding": {
      title: "Personal Branding",
      stage: "launch",
      status: "live",
      url: "lesson-personal-branding/",
      closes_va_gaps: [],
      ladders_to_roles: ["smm","content","admin","va","customer-service","account-manager"],
      prerequisites: [],
      next_lessons: ["online-presence","resume-builder"],
      why_this_lesson: "Voice + positioning + intro. The opening line of every async application leans on this.",
      estimated_minutes: 18,
      tier: 0,
      format: "video"
    },
    "online-presence": {
      title: "Online Presence",
      stage: "launch",
      status: "live",
      url: "lesson-online-presence/",
      closes_va_gaps: [],
      ladders_to_roles: ["smm","content","account-manager","admin","va"],
      prerequisites: ["personal-branding"],
      next_lessons: ["resume-builder"],
      why_this_lesson: "30-minute LinkedIn + portfolio + handle audit. Changes response rates noticeably.",
      estimated_minutes: 14,
      tier: 0,
      format: "video"
    },

    /* ====== Enhancement Training ====== */
    "choosing-my-client": {
      title: "Choosing My Client",
      stage: "working",
      status: "live",
      url: "lesson-choosing-my-client/",
      closes_va_gaps: [],
      ladders_to_roles: ["account-manager","customer-service","smm","va","admin","content","sdr"],
      prerequisites: [],
      next_lessons: ["common-mistakes"],
      why_this_lesson: "Four business types — pick the fit, don't just take any offer. Saves the first 90 days.",
      estimated_minutes: 12,
      tier: 0,
      format: "video"
    },

    "reading-a-job-post": {
      title: "Reading a Job Post: Red Flags and Scam Filters",
      stage: "working",
      status: "live",
      url: "lesson-reading-a-job-post/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","account-manager","sdr","admin","content","va"],
      prerequisites: ["choosing-my-client"],
      next_lessons: ["common-mistakes"],
      why_this_lesson: "Read any remote job post in two minutes and decide reject, clarify, or apply. The 7-Signal Scan protects money, samples, IDs, and energy before you reply.",
      estimated_minutes: 25,
      tier: 2,
      format: "module"
    },

    "set-your-first-rate": {
      title: "Pricing: Set Your First Rate",
      stage: "working",
      status: "live",
      url: "lesson-set-your-first-rate/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","account-manager","sdr","admin","content","va"],
      prerequisites: ["common-mistakes"],
      next_lessons: ["raising-your-rate","account-management-101"],
      why_this_lesson: "Set a first rate without racing to the bottom. The Rate Floor Method plus a four-part quoting script. Earn in dollars, stay in the Philippines.",
      estimated_minutes: 25,
      tier: 2,
      format: "module"
    },
    "raising-your-rate": {
      title: "Pricing: Raising Your Rate",
      stage: "skill",
      status: "live",
      url: "lesson-raising-your-rate/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","account-manager","sdr","admin","content","va"],
      prerequisites: ["set-your-first-rate","account-management-101"],
      next_lessons: ["building-brand-agency"],
      why_this_lesson: "When and how to raise an existing client's rate without losing the client. The Raise Trigger method, a four-part raise script, and a graceful exit if they say no.",
      estimated_minutes: 25,
      tier: 2,
      format: "module"
    },

    /* ====== Freelancing Platforms ====== */
    "freelancing-platforms": {
      title: "Freelancing Platforms",
      stage: "launch",
      status: "live",
      url: "lesson-freelancing-platforms/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va","account-manager","content","sdr"],
      prerequisites: [],
      next_lessons: ["online-jobs-account"],
      why_this_lesson: "Tour of Upwork, OnlineJobs.ph, Fiverr, ProBlogger, WWR. Where each one fits for PH applicants.",
      estimated_minutes: 16,
      tier: 0,
      format: "video"
    },

    /* ====== Additional ====== */
    "common-mistakes": {
      title: "Common Mistakes",
      stage: "working",
      status: "live",
      url: "lesson-common-mistakes/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va","account-manager","content","sdr"],
      prerequisites: [],
      next_lessons: [],
      why_this_lesson: "The recurring mistakes new freelancers make in the first 90 days. Read once before signing.",
      estimated_minutes: 14,
      tier: 0,
      format: "video"
    },

    /* ════════════════════════════════════════════════════
     *  NEW BUILDS — Tier 1 / 2 / 3 modules from the queue
     * ════════════════════════════════════════════════════ */
    "customer-support-foundations": {
      title: "Customer Support Foundations",
      stage: "stage1",
      status: "live",
      url: "lesson-customer-support-foundations/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service"],
      prerequisites: [],
      next_lessons: ["account-management-101"],
      why_this_lesson: "Largest single market gap — Customer Service = 24% of active jobs, zero BFF lessons. Highest single-bet build.",
      estimated_minutes: 45,
      tier: 1,
      format: "module",
      build_queue_rank: 1
    },
    "account-management-101": {
      title: "Account Management 101",
      stage: "skill",
      status: "live",
      url: "lesson-account-management-101/",
      closes_va_gaps: [],
      ladders_to_roles: ["account-manager","customer-service"],
      prerequisites: ["choosing-my-client"],
      next_lessons: [],
      why_this_lesson: "Closes 13% Account Manager gap. Bridges 'got hired' to 'kept the client.' Folds in Jade Kim Proposal Checklist.",
      estimated_minutes: 35,
      tier: 2,
      format: "article",
      build_queue_rank: 5
    },
    "cold-outreach-sdrs": {
      title: "Cold Outreach for SDRs",
      stage: "launch",
      status: "live",
      url: "lesson-cold-outreach-sdrs/",
      closes_va_gaps: [],
      ladders_to_roles: ["sdr"],
      prerequisites: ["personal-branding"],
      next_lessons: [],
      why_this_lesson: "13% market gap. DESIRE corpus has persuasion material — surface ONE public lesson on cadence + qualification.",
      estimated_minutes: 30,
      tier: 2,
      format: "article",
      build_queue_rank: 6
    },
    "crm-basics": {
      title: "CRM Basics for VAs",
      stage: "skill",
      status: "live",
      url: "lesson-crm-basics/",
      closes_va_gaps: ["crm"],
      ladders_to_roles: ["account-manager","sdr","admin","customer-service"],
      prerequisites: ["trello-love"],
      next_lessons: [],
      why_this_lesson: "86% of community lacks this. Pair with Account Management 101 for cross-sell value.",
      estimated_minutes: 25,
      tier: 2,
      format: "article",
      build_queue_rank: 8
    },
    "video-editing-content-vas": {
      title: "Video Editing for Content VAs",
      stage: "skill",
      status: "live",
      url: "lesson-video-editing-content-vas/",
      closes_va_gaps: ["video-editing"],
      ladders_to_roles: ["content","smm"],
      prerequisites: ["creative-artistic-skills"],
      next_lessons: [],
      why_this_lesson: "87% gap + 21 Content Creator jobs + most SMM roles now expect video editing. CapCut entry-level.",
      estimated_minutes: 30,
      tier: 2,
      format: "article",
      build_queue_rank: 9
    },
    "pm-tool-fluency": {
      title: "PM Tool Fluency (beyond Trello)",
      stage: "skill",
      status: "live",
      url: "lesson-pm-tool-fluency/",
      closes_va_gaps: ["pm-tools"],
      ladders_to_roles: ["account-manager","admin","content","customer-service","va"],
      prerequisites: ["trello-love"],
      next_lessons: [],
      why_this_lesson: "Trello Love rewrite/extension to Asana, ClickUp, Notion. 77% of community lacks fuller PM fluency.",
      estimated_minutes: 25,
      tier: 2,
      format: "article",
      build_queue_rank: 7
    },
    "interviews-prep": {
      title: "Interviews (Async + Video)",
      stage: "working",
      status: "live",
      url: "lesson-interviews-prep/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va","account-manager","content","sdr"],
      prerequisites: ["personal-branding","resume-builder"],
      next_lessons: [],
      why_this_lesson: "Currently a gap. Async (text-only) interview prep is critical for the No Calls audience.",
      estimated_minutes: 30,
      tier: 2,
      format: "article"
    },
    "internship-options": {
      title: "Internship Options and Self-Learning Paths",
      stage: "working",
      status: "live",
      url: "lesson-internship-options/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va","account-manager","content","sdr"],
      prerequisites: ["career-path-training"],
      next_lessons: ["freelancing-platforms","resume-builder"],
      why_this_lesson: "Replaces the old Internship box lesson stack with one clear menu of external internship, apprenticeship, simulation, and self-learning paths. No BFF work submission required.",
      estimated_minutes: 20,
      tier: 2,
      format: "article"
    },
    "google-sites-portfolio": {
      title: "Google Sites Portfolio | Zero Work Experience",
      stage: "working",
      status: "live",
      url: "lesson-google-sites-portfolio/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va","account-manager","content"],
      prerequisites: ["career-path-training"],
      next_lessons: ["personal-branding","online-presence","resume-builder"],
      why_this_lesson: "Skill Practice lesson for Fresh Starters with no paid client history yet. Builds three honest proof samples and publishes them in a Google Sites portfolio.",
      estimated_minutes: 35,
      tier: 2,
      format: "article"
    },
    "bpo-to-va-portfolio": {
      title: "BPO to VA Portfolio",
      stage: "working",
      status: "live",
      url: "lesson-bpo-to-va-portfolio/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","admin","va","account-manager"],
      prerequisites: ["career-path-training"],
      next_lessons: ["google-sites-portfolio","personal-branding","resume-builder"],
      why_this_lesson: "Skill Practice lesson for BPO, support, and back-office transitioners turning ticket-handling experience into VA-facing admin portfolio samples.",
      estimated_minutes: 45,
      tier: 2,
      format: "article"
    },
    "office-admin-to-va-portfolio": {
      title: "Office Admin to VA Portfolio",
      stage: "working",
      status: "live",
      url: "lesson-office-admin-to-va-portfolio/",
      closes_va_gaps: [],
      ladders_to_roles: ["admin","va","account-manager","customer-service"],
      prerequisites: ["career-path-training"],
      next_lessons: ["google-sites-portfolio","personal-branding","resume-builder"],
      why_this_lesson: "Skill Practice lesson for office admin, event coordination, operations, and corporate transitioners building Google Workspace portfolio proof.",
      estimated_minutes: 45,
      tier: 2,
      format: "article"
    },
    "business-owner-to-va-portfolio": {
      title: "Business Owner to VA Portfolio",
      stage: "working",
      status: "live",
      url: "lesson-business-owner-to-va-portfolio/",
      closes_va_gaps: [],
      ladders_to_roles: ["admin","va","customer-service","account-manager"],
      prerequisites: ["career-path-training"],
      next_lessons: ["google-sites-portfolio","personal-branding","resume-builder"],
      why_this_lesson: "Skill Practice lesson for online sellers and small-business owners turning inventory, supplier, sales, and customer experience into VA-ready Google Workspace portfolio samples.",
      estimated_minutes: 45,
      tier: 2,
      format: "article"
    },
    "onboarding-first-30-days": {
      title: "Onboarding: First 30 Days",
      stage: "stage1",
      status: "live",
      url: "lesson-onboarding-first-30-days/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va","account-manager","content"],
      prerequisites: [],
      next_lessons: ["account-management-101"],
      why_this_lesson: "Gap. Most community members improvise the first 30 days and burn relationships. High-leverage build.",
      estimated_minutes: 25,
      tier: 2,
      format: "article"
    },
    "leadership-mentorship": {
      title: "Leadership + Mentorship",
      stage: "higher",
      status: "live",
      url: "lesson-leadership-mentorship/",
      closes_va_gaps: [],
      ladders_to_roles: [],
      prerequisites: ["account-management-101"],
      next_lessons: ["building-brand-agency"],
      why_this_lesson: "Lead a team, mentor newer VAs, run a Monday meeting. Currently a gap. Draws from Live Sessions register.",
      estimated_minutes: 30,
      tier: 3,
      format: "article"
    },
    "building-brand-agency": {
      title: "Building your own Brand or Agency",
      stage: "business",
      status: "live",
      url: "lesson-building-brand-agency/",
      closes_va_gaps: [],
      ladders_to_roles: [],
      prerequisites: ["leadership-mentorship"],
      next_lessons: [],
      why_this_lesson: "Year-2 module for community members ready to stop trading hours. Folds in FB Group Plan + Market Research foundations from ABILITY corpus.",
      estimated_minutes: 60,
      tier: 4,
      format: "module"
    },
    "smm-handbook": {
      title: "SMM Handbook",
      stage: "warmup",
      status: "live",
      url: "lesson-smm-handbook/",
      closes_va_gaps: ["social-media-tools"],
      ladders_to_roles: ["smm","content"],
      prerequisites: ["smm-core-strategies"],
      next_lessons: ["instagram-strategy"],
      why_this_lesson: "Reference handbook for the SMM track. Use it alongside the core strategy and platform lessons.",
      estimated_minutes: 20,
      tier: 0,
      format: "handbook"
    },
    "freelancing-journey-lesson-2": {
      title: "Discover Your Professional Skills",
      stage: "working",
      status: "live",
      url: "lesson-freelancing-journey-lesson-2/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va","account-manager","content","sdr"],
      prerequisites: ["freelancing-journey-series"],
      next_lessons: ["freelancing-journey-lesson-3"],
      why_this_lesson: "Freelancing Journey Lesson 2 helps learners name their useful skills before applying.",
      estimated_minutes: 20,
      tier: 0,
      format: "video"
    },
    "freelancing-journey-lesson-3": {
      title: "Create a Resume That Stands Out",
      stage: "launch",
      status: "live",
      url: "lesson-freelancing-journey-lesson-3/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va","account-manager","content","sdr"],
      prerequisites: ["freelancing-journey-lesson-2"],
      next_lessons: ["resume-builder","freelancing-journey-lesson-4"],
      why_this_lesson: "Freelancing Journey resume lesson that pairs with the newer Resume Builder tool.",
      estimated_minutes: 25,
      tier: 0,
      format: "video"
    },
    "freelancing-journey-lesson-4": {
      title: "How to Improve a Crappy Cover Letter",
      stage: "launch",
      status: "live",
      url: "lesson-freelancing-journey-lesson-4/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va","account-manager","content","sdr"],
      prerequisites: ["freelancing-journey-lesson-3"],
      next_lessons: ["getting-hired-fast","freelancing-journey-lesson-5"],
      why_this_lesson: "Application-writing lesson for turning weak cover letters into clear client-facing messages.",
      estimated_minutes: 25,
      tier: 0,
      format: "video"
    },
    "freelancing-journey-lesson-5": {
      title: "How to Prepare for Job Interviews",
      stage: "working",
      status: "live",
      url: "lesson-freelancing-journey-lesson-5/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va","account-manager","content","sdr"],
      prerequisites: ["freelancing-journey-lesson-4"],
      next_lessons: ["interviews-prep","freelancing-journey-lesson-6"],
      why_this_lesson: "Freelancing Journey interview lesson that supports the newer async and video interview prep module.",
      estimated_minutes: 25,
      tier: 0,
      format: "video"
    },
    "freelancing-journey-lesson-6": {
      title: "How to Build Massive Confidence",
      stage: "working",
      status: "live",
      url: "lesson-freelancing-journey-lesson-6/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va","account-manager","content","sdr"],
      prerequisites: ["freelancing-journey-lesson-5"],
      next_lessons: ["onboarding-first-30-days"],
      why_this_lesson: "Confidence-building capstone for learners moving from training into applications and client work.",
      estimated_minutes: 20,
      tier: 0,
      format: "video"
    },
    "organize-work-files": {
      title: "Organize Your Work Files",
      stage: "stage1",
      status: "live",
      url: "lesson-bonus-tips-1/",
      closes_va_gaps: ["pm-tools"],
      ladders_to_roles: ["customer-service","smm","admin","va","account-manager","content"],
      prerequisites: ["storage-expert-secrets"],
      next_lessons: [],
      why_this_lesson: "Bonus lesson for keeping client folders, filenames, and handoffs organized.",
      estimated_minutes: 15,
      tier: 0,
      format: "video"
    },
    "article-curation-training": {
      title: "Article Curation Training",
      stage: "skill",
      status: "live",
      url: "lesson-bonus-tips-2/",
      closes_va_gaps: [],
      ladders_to_roles: ["content","smm"],
      prerequisites: ["creative-artistic-skills"],
      next_lessons: ["personal-branding"],
      why_this_lesson: "Content support lesson for finding, evaluating, and organizing article ideas.",
      estimated_minutes: 18,
      tier: 0,
      format: "video"
    },
    "ecommerce-classes": {
      title: "E-commerce Classes",
      stage: "skill",
      status: "live",
      url: "lesson-bonus-tips-3/",
      closes_va_gaps: [],
      ladders_to_roles: ["admin","content","smm","va"],
      prerequisites: ["career-path-training"],
      next_lessons: ["building-brand-agency"],
      why_this_lesson: "Bonus lesson for learners supporting online shops, product listings, and small business operations.",
      estimated_minutes: 20,
      tier: 0,
      format: "video"
    },

    /* ════════════════════════════════════════════════════
     *  BUILT INTERACTIVE TOOLS
     * ════════════════════════════════════════════════════ */
    "find-your-path-quiz": {
      title: "Find My Archetype (Step 1 of Resume Builder)",
      stage: "warmup",
      status: "built",
      url: "resume-builder/",
      closes_va_gaps: [],
      ladders_to_roles: [],
      prerequisites: [],
      next_lessons: [],
      why_this_lesson: "Interactive 3-minute quiz that maps your situation → starting lesson + Role Category.",
      estimated_minutes: 3,
      tier: 0,
      format: "interactive_tool"
    },
    "resume-builder": {
      title: "Resume Builder",
      stage: "launch",
      status: "built",
      url: "resume-builder/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va","account-manager","content","sdr"],
      prerequisites: ["personal-branding"],
      next_lessons: ["online-jobs-account"],
      why_this_lesson: "Interactive skill picker (40 skills) that live-matches you to active Job List listings as you check boxes. Letterpress preview.",
      estimated_minutes: 15,
      tier: 0,
      format: "interactive_tool"
    },
    "job-board": {
      title: "Job Board",
      stage: "launch",
      status: "built",
      url: "jobs/index.html",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va","account-manager","content","sdr"],
      prerequisites: ["find-your-path-quiz","freelancing-platforms"],
      next_lessons: ["resume-builder","interviews-prep"],
      why_this_lesson: "Live BFF job board for PH-friendly remote roles learners can review after setting up their application basics.",
      estimated_minutes: 10,
      tier: 0,
      format: "job_board"
    },
    "example-portfolio-zero-work-experience": {
      title: "Example Portfolio | Zero Work Experience",
      stage: "launch",
      status: "live",
      url: "lesson-google-sites-portfolio/fresh-starter-sample-portfolio.html",
      closes_va_gaps: [],
      ladders_to_roles: ["admin","va","customer-service","content"],
      prerequisites: ["google-sites-portfolio"],
      next_lessons: ["resume-builder"],
      why_this_lesson: "Sample Google Sites-style portfolio for Fresh Starters who need to show honest proof before they have paid client experience.",
      estimated_minutes: 8,
      tier: 0,
      format: "example"
    },
    "example-portfolio-bpo-to-virtual-assistant": {
      title: "Example Portfolio | BPO to Virtual Assistant",
      stage: "launch",
      status: "live",
      url: "lesson-bpo-to-va-portfolio/corporate-transitioner-sample-portfolio.html",
      closes_va_gaps: [],
      ladders_to_roles: ["admin","va","customer-service"],
      prerequisites: ["bpo-to-va-portfolio"],
      next_lessons: ["resume-builder"],
      why_this_lesson: "Sample Google Sites-style portfolio for BPO professionals transitioning into Virtual Assistant work.",
      estimated_minutes: 8,
      tier: 0,
      format: "example"
    },
    "example-portfolio-business-owner": {
      title: "Example Portfolio | Business Owner to Virtual Assistant",
      stage: "launch",
      status: "live",
      url: "lesson-business-owner-to-va-portfolio/business-owner-sample-portfolio.html",
      closes_va_gaps: [],
      ladders_to_roles: ["admin","va","customer-service","account-manager"],
      prerequisites: ["business-owner-to-va-portfolio"],
      next_lessons: ["resume-builder"],
      why_this_lesson: "Sample Google Sites-style portfolio for former small-business owners and online sellers transitioning into Virtual Assistant work.",
      estimated_minutes: 8,
      tier: 0,
      format: "example"
    }
  },

  /* ────────────────────────────────────────────────────────────
   *  BLUEPRINT BOXES — exact PDF labels mapped to lesson slugs
   *  These are the 30+ sub-boxes Lala drew in the BFF PDF.
   * ──────────────────────────────────────────────────────────── */
  blueprint_boxes: {

    /* TOP ROW — Preparation */
    "prep-1": { pdf_label: "Choosing your Computer",      stage: "prep",    lessons: ["best-laptop"] },
    "prep-2": { pdf_label: "Creating Work Emails",        stage: "prep",    lessons: ["email-address-is-gold","email-marketing-for-vas"] },
    "prep-3": { pdf_label: "Setting up Online Tools",     stage: "prep",    lessons: ["browser-expert-secrets","storage-expert-secrets","internet-connection-readiness","bank-account-payment-readiness"] },
    "prep-4": { pdf_label: "Organizing Work Flow",        stage: "prep",    lessons: ["trello-love"] },
    "prep-5": { pdf_label: "Setting up Work Accessories", stage: "prep",    lessons: ["work-accessories"] },

    /* TOP ROW — Warming Up */
    "warm-1": { pdf_label: "Choose Career Path",          stage: "warmup",  lessons: ["where-to-start","freelancer-or-va","employee-to-freelancer","find-your-path-quiz"] },
    "warm-2": { pdf_label: "Planning",                    stage: "warmup",  lessons: ["10-secret-skills"] },
    "warm-3": { pdf_label: "Basic Foundation",            stage: "warmup",  lessons: ["career-path-training","specialized-business-skills","creative-artistic-skills","english-101"] },
    "warm-4": { pdf_label: "Support Group",               stage: "warmup",  lessons: ["support-group"] },
    "warm-5": { pdf_label: "Ongoing Training",            stage: "warmup",  lessons: ["2026-tool-stack","free-upskilling-vault"] },

    /* TOP ROW — Launch */
    "launch-1":{ pdf_label: "Setting Up Accounts",        stage: "launch",  lessons: ["online-jobs-account","freelancing-platforms"] },
    "launch-2":{ pdf_label: "Creating Powerful Resume",   stage: "launch",  lessons: ["resume-builder","google-sites-portfolio","bpo-to-va-portfolio","office-admin-to-va-portfolio","business-owner-to-va-portfolio","example-portfolio-zero-work-experience","example-portfolio-bpo-to-virtual-assistant","example-portfolio-business-owner"] },
    "launch-3":{ pdf_label: "Job Hunting",                stage: "launch",  lessons: ["find-clients-ai-aggregator","what-is-hiring-cafe-and-why-use-it","why-is-an-ai-powered-job-aggregator-better-than-one-job-site","what-is-the-problem-with-relying-only-on-onlinejobs-ph","how-do-i-avoid-low-ball-clients","find-your-path-quiz","freelancing-platforms","job-board","reading-a-job-post"] },
    "launch-4":{ pdf_label: "Join Groups and Forums",     stage: "launch",  lessons: ["groups-and-forums"] },
    "launch-5":{ pdf_label: "Creating your Portfolio",    stage: "launch",  lessons: ["copy-paste-portfolio-doc","what-is-a-portfolio-document-and-why-do-i-need-one","where-do-i-keep-my-portfolio-if-i-have-no-website","how-do-i-use-notion-as-a-portfolio","personal-branding","online-presence","google-sites-portfolio","bpo-to-va-portfolio","office-admin-to-va-portfolio","business-owner-to-va-portfolio"] },

    /* TOP ROW — Working on it! */
    "work-1":  { pdf_label: "Interviews",                 stage: "working", lessons: ["interviews-prep","freelancing-journey-lesson-5"] },
    "work-2":  { pdf_label: "Internship",                 stage: "working", lessons: ["internship-options"] },
    "work-3":  { pdf_label: "Skill Practice",             stage: "working", lessons: ["master-tools-with-ai","30-day-hired-plan","finish-courses-with-ai","2026-tool-stack"] },
    "work-4":  { pdf_label: "Creating Proposal",          stage: "working", lessons: ["common-mistakes","set-your-first-rate"] },
    "work-5":  { pdf_label: "Bidding",                    stage: "working", lessons: ["getting-hired-fast","freelancing-platforms","common-mistakes","reading-a-job-post"] },

    /* BOTTOM ROW — Stage 1 */
    "s1-1":    { pdf_label: "Onboarding",                 stage: "stage1",  lessons: ["onboarding-first-30-days"] },
    "s1-2":    { pdf_label: "Learn Business Tools",       stage: "stage1",  lessons: ["trello-love","browser-expert-secrets","storage-expert-secrets","pm-tool-fluency","organize-work-files"] },
    "s1-3":    { pdf_label: "Collaboration",              stage: "stage1",  lessons: ["account-management-101","pm-tool-fluency","onboarding-first-30-days"] },
    "s1-4":    { pdf_label: "Client Demands",             stage: "stage1",  lessons: ["choosing-my-client","common-mistakes","reading-a-job-post"] },
    "s1-5":    { pdf_label: "Organization",               stage: "stage1",  lessons: ["trello-love","organize-work-files"] },

    /* BOTTOM ROW — Skill Upgrade */
    "sk-1":    { pdf_label: "New or Upgraded Skill",      stage: "skill",   lessons: ["customer-support-foundations","account-management-101","cold-outreach-sdrs","crm-basics","video-editing-content-vas","pm-tool-fluency","article-curation-training","ecommerce-classes"] },
    "sk-2":    { pdf_label: "More Training",              stage: "skill",   lessons: ["smm-toolkit-2026","smm-handbook","fb-chatbot-training","fb-mobile-management","pinterest-marketing","youtube-best-practices","article-curation-training","ecommerce-classes"] },
    "sk-3":    { pdf_label: "More Value to Client",       stage: "skill",   lessons: ["account-management-101","set-your-first-rate","raising-your-rate"] },
    "sk-4":    { pdf_label: "Career & Personal Growth",   stage: "skill",   lessons: ["career-path-training"] },

    /* BOTTOM ROW — Higher Level */
    "h-1":     { pdf_label: "More Clients",               stage: "higher",  lessons: ["personal-branding","online-presence"] },
    "h-2":     { pdf_label: "Multiple Skills",            stage: "higher",  lessons: ["specialized-business-skills","creative-artistic-skills"] },
    "h-3":     { pdf_label: "Leadership",                 stage: "higher",  lessons: ["leadership-mentorship"] },
    "h-4":     { pdf_label: "Rockstar Portfolio",         stage: "higher",  lessons: ["resume-builder","personal-branding"] },

    /* BOTTOM ROW — Business Branch */
    "b-1":     { pdf_label: "Building your own Brand or Agency", stage: "business", lessons: ["building-brand-agency"] }
  }
};
