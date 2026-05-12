/**
 * SWAHG Lesson Registry — Single Source of Truth
 *
 * Loaded by: Blueprint, Find Your Path Quiz, Resume Builder, Personalized Curriculum Lead Magnet
 * No fetch — sets window.SWAHG_LESSONS so it works on file:// + GitHub Pages.
 *
 * Schema notes:
 *   lessons[slug]          → individual lesson nodes
 *   blueprint_boxes[box]   → maps PDF blueprint boxes (5 per stage) to lesson_slugs[]
 *   va_gaps[slug]          → Mar 18 2026 community gap data (641 candidates)
 *   roles[slug]            → Job List Role Categories (244 active rows, 2026-05-11)
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
    last_updated: "2026-05-12",
    blueprint_pdf_source: "Bonafide Filipino Freelancer Simplified Blueprint",
    data_sources: {
      va_assessments: { date: "2026-03-18", candidates: 641 },
      job_list: { date: "2026-05-11", active_rows: 244 },
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

    /* ====== Fresh Starter / Preparation ====== */
    "best-laptop": {
      title: "Best Laptop",
      stage: "prep",
      status: "live",
      url: "https://sites.google.com/view/swahg-openuniversity/courses/freelancer-essentials/best-laptop",
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
      url: "https://sites.google.com/view/swahg-openuniversity/courses/freelancer-essentials/browser-expert-secrets",
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
      url: "https://sites.google.com/view/swahg-openuniversity/courses/freelancer-essentials/storage-expert-secrets",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","account-manager","sdr","admin","content","va"],
      prerequisites: ["best-laptop"],
      next_lessons: ["trello-love"],
      why_this_lesson: "Google Drive vs Dropbox vs local — pick the system before files start piling up.",
      estimated_minutes: 10,
      tier: 0,
      format: "video"
    },
    "email-address-is-gold": {
      title: "Email Address Expert Secrets",
      stage: "prep",
      status: "rewrite",
      url: "https://sites.google.com/view/swahg-openuniversity/courses/freelancer-essentials/email-address-is-gold",
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
      status: "new",
      url: "",
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
    "trello-love": {
      title: "Trello Love",
      stage: "prep",
      status: "live",
      url: "https://sites.google.com/view/swahg-openuniversity/courses/freelancer-essentials/trello-love",
      closes_va_gaps: ["pm-tools"],
      ladders_to_roles: ["account-manager","admin","va","content","smm"],
      prerequisites: [],
      next_lessons: ["time-tracking-discipline"],
      why_this_lesson: "Trello is the entry-level PM tool. 77% of community lacks PM-tool fluency — this opens the door.",
      estimated_minutes: 14,
      tier: 0,
      format: "video"
    },
    "work-accessories": {
      title: "Setting Up Work Accessories",
      stage: "prep",
      status: "new",
      url: "",
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
      url: "https://sites.google.com/view/swahg-openuniversity/courses/fresh-starter/where-to-start",
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
      url: "https://sites.google.com/view/swahg-openuniversity/courses/fresh-starter/freelancer-or-va",
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
      url: "https://sites.google.com/view/swahg-openuniversity/courses/fresh-starter/employee-to-freelancer",
      closes_va_gaps: [],
      ladders_to_roles: [],
      prerequisites: [],
      next_lessons: ["freelancing-journey-intro"],
      why_this_lesson: "If you're still employed, this is the practical transition guide — test waters first.",
      estimated_minutes: 12,
      tier: 0,
      format: "video"
    },
    "10-secret-skills": {
      title: "10 Secret Skills",
      stage: "warmup",
      status: "live",
      url: "https://sites.google.com/view/swahg-openuniversity/courses/fresh-starter/10-secret-skills",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va"],
      prerequisites: [],
      next_lessons: ["career-path-training"],
      why_this_lesson: "Baseline skills self-audit. Run it before picking which Warming Up track to commit to.",
      estimated_minutes: 10,
      tier: 0,
      format: "video"
    },
    "online-jobs-account": {
      title: "OnlineJobs.ph Account Setup",
      stage: "launch",
      status: "live",
      url: "https://sites.google.com/view/swahg-openuniversity/courses/fresh-starter/online-jobs-account",
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
      title: "English 101",
      stage: "warmup",
      status: "live",
      url: "https://sites.google.com/view/swahg-openuniversity/courses/additional/english-101",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","admin","content"],
      prerequisites: [],
      next_lessons: ["no-calls-va-track"],
      why_this_lesson: "For learners who don't feel fluent. Builds enough working English for async (text-only) roles.",
      estimated_minutes: 15,
      tier: 0,
      format: "video"
    },

    /* ====== Freelancing Journey (long-form anchor) ====== */
    "freelancing-journey-intro": {
      title: "Freelancing Journey · Introduction",
      stage: "warmup",
      status: "live",
      url: "https://sites.google.com/view/swahg-openuniversity/courses/freelancing-journey/introduction",
      closes_va_gaps: [],
      ladders_to_roles: [],
      prerequisites: [],
      next_lessons: ["freelancing-journey-series"],
      why_this_lesson: "Sets up the 6-lesson Fast Track. Complete the activities to earn a 1-on-1 coaching with Shela.",
      estimated_minutes: 8,
      tier: 0,
      format: "video"
    },
    "freelancing-journey-series": {
      title: "Freelancing Journey · Lessons 1-6",
      stage: "working",
      status: "live",
      url: "https://sites.google.com/view/swahg-openuniversity/courses/freelancing-journey/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va"],
      prerequisites: ["freelancing-journey-intro"],
      next_lessons: ["common-mistakes"],
      why_this_lesson: "The depth of the SWAHG canon. 6 lessons + activities. Currently titled 'Lesson 1-6' (needs re-titling per gap matrix Rank 10).",
      estimated_minutes: 90,
      tier: 0,
      format: "video_series"
    },

    /* ====== Career Path Training ====== */
    "career-path-training": {
      title: "Career Path Training (overview)",
      stage: "warmup",
      status: "live",
      url: "https://sites.google.com/view/swahg-openuniversity/courses/career-path-training/",
      closes_va_gaps: [],
      ladders_to_roles: ["admin","content","va"],
      prerequisites: ["10-secret-skills"],
      next_lessons: ["specialized-business-skills","creative-artistic-skills","technical-skills"],
      why_this_lesson: "Three-track menu: Specialized Business, Creative/Artistic, Technical. Pick one to build depth.",
      estimated_minutes: 8,
      tier: 0,
      format: "video"
    },
    "specialized-business-skills": {
      title: "Specialized Business Skills",
      stage: "warmup",
      status: "live",
      url: "https://sites.google.com/view/swahg-openuniversity/courses/career-path-training/specialized-business-skills",
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
      url: "https://sites.google.com/view/swahg-openuniversity/courses/career-path-training/creativeartistic-skills",
      closes_va_gaps: [],
      ladders_to_roles: ["content","smm"],
      prerequisites: ["career-path-training"],
      next_lessons: ["personal-branding","smm-core-strategies"],
      why_this_lesson: "Creative track depth — design basics, content production, visual portfolio. For Content Creator path.",
      estimated_minutes: 22,
      tier: 0,
      format: "video"
    },
    "technical-skills": {
      title: "Technical Skills",
      stage: "warmup",
      status: "live",
      url: "https://sites.google.com/view/swahg-openuniversity/courses/career-path-training/technical-skills",
      closes_va_gaps: [],
      ladders_to_roles: ["va","admin"],
      prerequisites: ["career-path-training"],
      next_lessons: [],
      why_this_lesson: "Technical track depth — light dev, WordPress, tool admin. Smaller market but higher rates.",
      estimated_minutes: 22,
      tier: 0,
      format: "video"
    },

    /* ====== SMM Core Training ====== */
    "smm-core-strategies": {
      title: "SMM Core Strategies",
      stage: "warmup",
      status: "live",
      url: "https://sites.google.com/view/swahg-openuniversity/courses/smm-core-training/smm-core-strategies",
      closes_va_gaps: [],
      ladders_to_roles: ["smm","content"],
      prerequisites: [],
      next_lessons: ["instagram-strategy","fb-mobile-management"],
      why_this_lesson: "SMM strategy foundation. Pairs with platform-specific lessons (IG, FB, Pinterest, YT).",
      estimated_minutes: 30,
      tier: 0,
      format: "video"
    },
    "instagram-strategy": {
      title: "Instagram Strategy",
      stage: "warmup",
      status: "live",
      url: "https://sites.google.com/view/swahg-openuniversity/courses/smm-core-training/instagram-strategy",
      closes_va_gaps: [],
      ladders_to_roles: ["smm","content"],
      prerequisites: ["smm-core-strategies"],
      next_lessons: ["getting-hired-fast"],
      why_this_lesson: "IG tactic depth — content cadence, hashtag strategy, reel patterns.",
      estimated_minutes: 18,
      tier: 0,
      format: "video"
    },
    "getting-hired-fast": {
      title: "Getting Hired Fast (SMM)",
      stage: "working",
      status: "live",
      url: "https://sites.google.com/view/swahg-openuniversity/courses/smm-core-training/getting-hired-fast",
      closes_va_gaps: [],
      ladders_to_roles: ["smm"],
      prerequisites: ["smm-core-strategies","personal-branding"],
      next_lessons: ["common-mistakes"],
      why_this_lesson: "Applicant tactics that get response — portfolio shape, sample work, timing. SMM-specific but principles transfer.",
      estimated_minutes: 18,
      tier: 0,
      format: "video"
    },

    /* ====== Personal Brand ====== */
    "personal-branding": {
      title: "Personal Branding",
      stage: "launch",
      status: "live",
      url: "https://sites.google.com/view/swahg-openuniversity/courses/writing-personal-brand/personal-branding",
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
      url: "https://sites.google.com/view/swahg-openuniversity/courses/enhancement-training/online-presence",
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
      url: "https://sites.google.com/view/swahg-openuniversity/courses/enhancement-training/choosing-my-client",
      closes_va_gaps: [],
      ladders_to_roles: ["account-manager","customer-service","smm","va","admin","content","sdr"],
      prerequisites: [],
      next_lessons: ["common-mistakes"],
      why_this_lesson: "Four business types — pick the fit, don't just take any offer. Saves the first 90 days.",
      estimated_minutes: 12,
      tier: 0,
      format: "video"
    },

    /* ====== Freelancing Platforms ====== */
    "freelancing-platforms": {
      title: "Freelancing Platforms",
      stage: "launch",
      status: "live",
      url: "https://sites.google.com/view/swahg-openuniversity/courses/freelancer-essentials/freelancing-platforms",
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
      url: "https://sites.google.com/view/swahg-openuniversity/courses/additional/common-mistakes",
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
    "time-tracking-discipline": {
      title: "Time Tracking Discipline",
      stage: "stage1",
      status: "new",
      url: "",
      closes_va_gaps: ["time-tracking"],
      ladders_to_roles: ["customer-service","smm","admin","va","account-manager","content","sdr"],
      prerequisites: ["trello-love"],
      next_lessons: [],
      why_this_lesson: "98% of community lacks this. Single-lesson, high-completion target. Tools: Toggl, Clockify, Hubstaff.",
      estimated_minutes: 20,
      tier: 2,
      format: "article",
      build_queue_rank: 3
    },
    "no-calls-va-track": {
      title: "No Calls VA Career Track",
      stage: "launch",
      status: "new",
      url: "",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","admin","content","account-manager"],
      prerequisites: ["english-101","personal-branding"],
      next_lessons: ["customer-support-foundations"],
      why_this_lesson: "Crystallizes the 185-job No-Calls opportunity into a 3-4 lesson prep path. For the English-not-fluent half. Liz's story is the opening.",
      estimated_minutes: 60,
      tier: 3,
      format: "module",
      build_queue_rank: 4
    },
    "customer-support-foundations": {
      title: "Customer Support Foundations",
      stage: "stage1",
      status: "new",
      url: "",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service"],
      prerequisites: [],
      next_lessons: ["account-management-101"],
      why_this_lesson: "Largest single market gap — Customer Service = 24% of active jobs, zero SWAHG lessons. Highest single-bet build.",
      estimated_minutes: 45,
      tier: 1,
      format: "module",
      build_queue_rank: 1
    },
    "account-management-101": {
      title: "Account Management 101",
      stage: "skill",
      status: "new",
      url: "",
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
      status: "new",
      url: "",
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
      status: "new",
      url: "",
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
      status: "new",
      url: "",
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
      status: "new",
      url: "",
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
      status: "new",
      url: "",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va","account-manager","content","sdr"],
      prerequisites: ["personal-branding","resume-builder"],
      next_lessons: [],
      why_this_lesson: "Currently a gap. Async (text-only) interview prep is critical for the No Calls audience.",
      estimated_minutes: 30,
      tier: 2,
      format: "article"
    },
    "onboarding-first-30-days": {
      title: "Onboarding: First 30 Days",
      stage: "stage1",
      status: "new",
      url: "",
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
      status: "new",
      url: "",
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
      status: "new",
      url: "",
      closes_va_gaps: [],
      ladders_to_roles: [],
      prerequisites: ["leadership-mentorship"],
      next_lessons: [],
      why_this_lesson: "Year-2 module for community members ready to stop trading hours. Folds in FB Group Plan + Market Research foundations from ABILITY corpus.",
      estimated_minutes: 60,
      tier: 4,
      format: "module"
    },

    /* ════════════════════════════════════════════════════
     *  BUILT INTERACTIVE TOOLS
     * ════════════════════════════════════════════════════ */
    "find-your-path-quiz": {
      title: "Find Your Path Quiz",
      stage: "warmup",
      status: "built",
      url: "/writings/swahg-start/",
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
      url: "/writings/swahg-resume-builder/",
      closes_va_gaps: [],
      ladders_to_roles: ["customer-service","smm","admin","va","account-manager","content","sdr"],
      prerequisites: ["personal-branding"],
      next_lessons: ["online-jobs-account"],
      why_this_lesson: "Interactive skill picker (40 skills) that live-matches you to active Job List listings as you check boxes. Letterpress preview.",
      estimated_minutes: 15,
      tier: 0,
      format: "interactive_tool"
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
    "prep-3": { pdf_label: "Setting up Online Tools",     stage: "prep",    lessons: ["browser-expert-secrets","storage-expert-secrets"] },
    "prep-4": { pdf_label: "Organizing Work Flow",        stage: "prep",    lessons: ["trello-love","time-tracking-discipline"] },
    "prep-5": { pdf_label: "Setting up Work Accessories", stage: "prep",    lessons: ["work-accessories"] },

    /* TOP ROW — Warming Up */
    "warm-1": { pdf_label: "Choose Career Path",          stage: "warmup",  lessons: ["where-to-start","freelancer-or-va","employee-to-freelancer","find-your-path-quiz"] },
    "warm-2": { pdf_label: "Planning",                    stage: "warmup",  lessons: ["freelancing-journey-intro","10-secret-skills"] },
    "warm-3": { pdf_label: "Basic Foundation",            stage: "warmup",  lessons: ["career-path-training","specialized-business-skills","creative-artistic-skills","technical-skills"] },
    "warm-4": { pdf_label: "Support Group",               stage: "warmup",  lessons: ["freelancing-journey-series"] },
    "warm-5": { pdf_label: "Ongoing Training",            stage: "warmup",  lessons: ["smm-core-strategies","personal-branding","customer-support-foundations","account-management-101","cold-outreach-sdrs","crm-basics","video-editing-content-vas"] },

    /* TOP ROW — Launch */
    "launch-1":{ pdf_label: "Setting Up Accounts",        stage: "launch",  lessons: ["online-jobs-account","freelancing-platforms"] },
    "launch-2":{ pdf_label: "Creating Powerful Resume",   stage: "launch",  lessons: ["resume-builder"] },
    "launch-3":{ pdf_label: "Job Hunting",                stage: "launch",  lessons: ["find-your-path-quiz","freelancing-platforms"] },
    "launch-4":{ pdf_label: "Join Groups and Forums",     stage: "launch",  lessons: [] },
    "launch-5":{ pdf_label: "Creating your Portfolio",    stage: "launch",  lessons: ["personal-branding","online-presence"] },

    /* TOP ROW — Working on it! */
    "work-1":  { pdf_label: "Interviews",                 stage: "working", lessons: ["interviews-prep"] },
    "work-2":  { pdf_label: "Internship",                 stage: "working", lessons: [] },
    "work-3":  { pdf_label: "Skill Practice",             stage: "working", lessons: ["career-path-training","specialized-business-skills","creative-artistic-skills","technical-skills"] },
    "work-4":  { pdf_label: "Creating Proposal",          stage: "working", lessons: ["common-mistakes"] },
    "work-5":  { pdf_label: "Bidding",                    stage: "working", lessons: ["getting-hired-fast","freelancing-platforms","common-mistakes"] },

    /* BOTTOM ROW — Stage 1 */
    "s1-1":    { pdf_label: "Onboarding",                 stage: "stage1",  lessons: ["onboarding-first-30-days"] },
    "s1-2":    { pdf_label: "Learn Business Tools",       stage: "stage1",  lessons: ["trello-love","browser-expert-secrets","storage-expert-secrets","pm-tool-fluency"] },
    "s1-3":    { pdf_label: "Collaboration",              stage: "stage1",  lessons: [] },
    "s1-4":    { pdf_label: "Client Demands",             stage: "stage1",  lessons: ["choosing-my-client","common-mistakes"] },
    "s1-5":    { pdf_label: "Organization",               stage: "stage1",  lessons: ["trello-love","time-tracking-discipline"] },

    /* BOTTOM ROW — Skill Upgrade */
    "sk-1":    { pdf_label: "New or Upgraded Skill",      stage: "skill",   lessons: ["customer-support-foundations","time-tracking-discipline","account-management-101","cold-outreach-sdrs","crm-basics","video-editing-content-vas","pm-tool-fluency"] },
    "sk-2":    { pdf_label: "More Training",              stage: "skill",   lessons: [] },
    "sk-3":    { pdf_label: "More Value to Client",       stage: "skill",   lessons: ["account-management-101"] },
    "sk-4":    { pdf_label: "Career & Personal Growth",   stage: "skill",   lessons: ["career-path-training"] },

    /* BOTTOM ROW — Higher Level */
    "h-1":     { pdf_label: "More Clients",               stage: "higher",  lessons: ["personal-branding","online-presence"] },
    "h-2":     { pdf_label: "Multiple Skills",            stage: "higher",  lessons: ["specialized-business-skills","creative-artistic-skills","technical-skills"] },
    "h-3":     { pdf_label: "Leadership",                 stage: "higher",  lessons: ["leadership-mentorship"] },
    "h-4":     { pdf_label: "Rockstar Portfolio",         stage: "higher",  lessons: ["resume-builder","personal-branding"] },

    /* BOTTOM ROW — Business Branch */
    "b-1":     { pdf_label: "Building your own Brand or Agency", stage: "business", lessons: ["building-brand-agency"] }
  }
};
