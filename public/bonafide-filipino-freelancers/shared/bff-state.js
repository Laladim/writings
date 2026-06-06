(() => {
  const STORAGE_KEY = 'bff-transition-state-v1';
  const ARCHETYPE_LABELS = {
    polished: 'Polished Freelancer',
    transitioner: 'Corporate Transitioner',
    creative: 'Creative Specialist',
    solo: 'Solo Entrepreneur',
    generalist: 'Generalist Admin',
    fresh: 'Fresh Starter'
  };
  const ROLE_CATALOG = [
    {
      id: 'executive-assistant',
      title: 'Executive Assistant',
      aliases: ['Administrative Assistant', 'Executive Marketing Coordinator', 'Office Assistant'],
      level: 'stretch',
      bestFor: ['polished', 'transitioner', 'generalist'],
      tools: ['Google Workspace', 'MS 365', 'Notion', 'Calendly'],
      fitReason: 'Best when the student already has admin, coordination, calendar, or stakeholder follow-up experience.',
      avoidIf: 'Avoid as the first target if they cannot yet write crisp status updates or manage calendar conflicts.',
      beginnerScore: 2,
      beginnerLabel: 'Stretch for beginners',
      beginnerReason: 'This role pays better because the client expects judgment, fast writing, and low supervision.',
      proofSample: 'calendar and inbox workflow sample',
      proofSteps: ['Create a weekly calendar audit', 'Write 3 inbox triage rules', 'Draft one executive status update'],
      proofTemplate: {
        projectName: 'Executive calendar and inbox control sample',
        output: 'weekly calendar audit, inbox triage rules, and executive status update',
        metricPlaceholder: '1 week, 3 triage rules, 1 status update',
        notesPrompt: 'List the calendar conflicts you found, the inbox labels you created, and the update you would send to the executive.',
        checklist: ['Audit one sample weekly calendar', 'Write three inbox sorting rules', 'Draft one Friday executive update'],
        resumeBullet: 'Built [metric] by creating [output] for an Executive Assistant practice brief, using [tools] to show calendar ownership and executive follow-through.'
      },
      resumeAngle: 'office discipline, calendar ownership, and executive follow-through',
      salaryRangePH: 'P55k to P85k/mo',
      lessonUrl: '../lesson-office-admin-to-va-portfolio/index.html',
      lessonRoles: ['admin', 'va'],
      lessonKeywords: ['admin', 'calendar', 'inbox', 'office']
    },
    {
      id: 'marketing-va',
      title: 'Marketing VA',
      aliases: ['Marketing Coordinator', 'Marketing Assistant', 'Digital Marketing Assistant'],
      level: 'best-fit',
      bestFor: ['transitioner', 'generalist', 'fresh'],
      tools: ['Google Workspace', 'Canva', 'Meta Business Suite', 'Trello'],
      fitReason: 'Best when the student has admin reliability and wants to move into practical digital marketing support.',
      avoidIf: 'Avoid if they only want creative posting and do not want tracking, checklists, or campaign coordination.',
      beginnerScore: 4,
      beginnerLabel: 'Beginner friendly',
      beginnerReason: 'This is a good transition role because the work can start with tracking, coordination, and simple content support.',
      proofSample: '7-day campaign tracker with sample posts',
      proofSteps: ['Build a 7-day content tracker', 'Draft 3 sample captions', 'Add simple result or status columns'],
      proofTemplate: {
        projectName: '7-day campaign support tracker',
        output: 'content tracker, 3 sample captions, and campaign status columns',
        metricPlaceholder: '7 days, 3 captions, 4 status columns',
        notesPrompt: 'Describe the campaign theme, the tracker columns, and how a client would know each post is ready.',
        checklist: ['Create a 7-day content tracker', 'Draft three captions', 'Add status, owner, channel, and deadline columns'],
        resumeBullet: 'Built [metric] by creating [output] for a Marketing VA practice brief, using [tools] to show campaign coordination and organized follow-through.'
      },
      resumeAngle: 'admin coordination translated into marketing support',
      salaryRangePH: 'P30k to P55k/mo',
      lessonUrl: '../lesson-smm-core-strategies/index.html',
      lessonRoles: ['smm', 'content', 'va'],
      lessonKeywords: ['marketing', 'campaign', 'social', 'content']
    },
    {
      id: 'customer-support-va',
      title: 'Customer Support VA',
      aliases: ['Customer Support', 'Customer Support Representative', 'Technical Support Representative', 'Support Analyst'],
      level: 'best-fit',
      bestFor: ['transitioner', 'fresh', 'generalist'],
      tools: ['Gmail', 'Zendesk', 'Freshdesk', 'Google Sheets'],
      fitReason: 'Best when the student has BPO, service, admin, or customer-facing experience that can be translated into remote support.',
      avoidIf: 'Avoid if they dislike written communication, ticket follow-up, or calm repetition.',
      beginnerScore: 5,
      beginnerLabel: 'Most beginner friendly',
      beginnerReason: 'This is one of the easiest corporate-to-remote bridges because BPO, service, and admin experience convert directly into proof.',
      proofSample: 'customer reply templates and escalation tracker',
      proofSteps: ['Write 5 customer reply templates', 'Create a simple escalation tracker', 'Add one SLA or priority rule'],
      proofTemplate: {
        projectName: 'Customer reply and escalation sample',
        output: '5 reply templates, escalation tracker, and priority rule',
        metricPlaceholder: '5 templates, 1 tracker, 1 priority rule',
        notesPrompt: 'Write which customer situations you covered, how you decide priority, and when you escalate to the client.',
        checklist: ['Write five customer reply templates', 'Create one escalation tracker', 'Add one priority or SLA rule'],
        resumeBullet: 'Built [metric] by creating [output] for a Customer Support VA practice brief, using [tools] to show calm written support and ticket follow-through.'
      },
      resumeAngle: 'BPO, support, and calm written communication as remote client proof',
      salaryRangePH: 'P28k to P50k/mo',
      lessonUrl: '../lesson-customer-support-foundations/index.html',
      lessonRoles: ['customer-service', 'va'],
      lessonKeywords: ['customer', 'support', 'reply', 'service']
    },
    {
      id: 'social-media-assistant',
      title: 'Social Media Assistant',
      aliases: ['Social Media Community Manager', 'Social Media Manager', 'Streaming Media Assistant'],
      level: 'best-fit',
      bestFor: ['creative', 'fresh', 'generalist'],
      tools: ['Canva', 'CapCut', 'Meta Business Suite', 'Buffer'],
      fitReason: 'Best when the student can make visible creative output and also follow a posting system.',
      avoidIf: 'Avoid if they cannot show sample posts yet or only want strategy without execution.',
      beginnerScore: 4,
      beginnerLabel: 'Beginner friendly with samples',
      beginnerReason: 'This can work early if the student creates visible samples and proves they can follow a posting process.',
      proofSample: '7-day content calendar with 3 finished sample posts',
      proofSteps: ['Plan 7 days of posts', 'Create 3 finished sample posts', 'Add captions and publishing notes'],
      proofTemplate: {
        projectName: '7-day social media publishing sample',
        output: 'content calendar, 3 finished sample posts, captions, and publishing notes',
        metricPlaceholder: '7 days, 3 posts, 3 captions',
        notesPrompt: 'Name the audience, the content theme, the posting schedule, and the tools used to create the posts.',
        checklist: ['Plan seven days of posts', 'Create three finished Canva or CapCut samples', 'Add captions and publishing notes'],
        resumeBullet: 'Built [metric] by creating [output] for a Social Media Assistant practice brief, using [tools] to show creative output and posting discipline.'
      },
      resumeAngle: 'creative output plus organized publishing support',
      salaryRangePH: 'P32k to P55k/mo',
      lessonUrl: '../lesson-smm-handbook/index.html',
      lessonRoles: ['smm', 'content'],
      lessonKeywords: ['social', 'content', 'canva', 'calendar']
    },
    {
      id: 'content-assistant',
      title: 'Content Assistant',
      aliases: ['Content Specialist', 'Content Writer', 'Technical Writer', 'Copywriter', 'Learning and Development Specialist'],
      level: 'best-fit',
      bestFor: ['creative', 'fresh', 'transitioner'],
      tools: ['Google Docs', 'Canva', 'Notion', 'Grammarly'],
      fitReason: 'Best when the student writes clearly, researches carefully, or can repurpose existing material.',
      avoidIf: 'Avoid if they do not want revision cycles, source checking, or feedback on drafts.',
      beginnerScore: 3,
      beginnerLabel: 'Moderate entry path',
      beginnerReason: 'This is realistic when the student can show clean writing, source discipline, and comfort with revision.',
      proofSample: 'blog-to-social repurposing sample',
      proofSteps: ['Choose one source article', 'Create 5 repurposed social posts', 'Document the content angle and audience'],
      proofTemplate: {
        projectName: 'Blog-to-social repurposing sample',
        output: '5 repurposed posts with source notes and audience angle',
        metricPlaceholder: '1 article, 5 posts, 1 audience note',
        notesPrompt: 'Paste the source title, explain the content angle, and note what you changed for each platform.',
        checklist: ['Choose one source article', 'Create five repurposed posts', 'Document the audience and content angle'],
        resumeBullet: 'Built [metric] by creating [output] for a Content Assistant practice brief, using [tools] to show research, writing, and organized content production.'
      },
      resumeAngle: 'writing, research, and organized content production',
      salaryRangePH: 'P30k to P55k/mo',
      lessonUrl: '../lesson-personal-branding/index.html',
      lessonRoles: ['content', 'smm'],
      lessonKeywords: ['writing', 'content', 'brand', 'research']
    },
    {
      id: 'crm-assistant',
      title: 'CRM Assistant',
      aliases: ['Sales Assistant', 'Lead Coordinator', 'Pipeline Assistant'],
      level: 'stretch',
      bestFor: ['generalist', 'transitioner', 'solo'],
      tools: ['HubSpot CRM', 'Google Sheets', 'Pipedrive', 'Slack'],
      fitReason: 'Best when the student is organized, detail-oriented, and comfortable tracking leads or customer records.',
      avoidIf: 'Avoid if spreadsheet hygiene and follow-up reminders feel exhausting or confusing.',
      beginnerScore: 3,
      beginnerLabel: 'Moderate entry path',
      beginnerReason: 'This is viable after basic spreadsheet practice because clients need clean records and reliable follow-up.',
      proofSample: 'lead tracker and follow-up workflow',
      proofSteps: ['Create a 20-lead tracker', 'Add lead stage and next action columns', 'Write 3 follow-up templates'],
      proofTemplate: {
        projectName: 'Lead tracker and follow-up workflow',
        output: '20-lead tracker, lead stages, next actions, and follow-up templates',
        metricPlaceholder: '20 leads, 5 stages, 3 templates',
        notesPrompt: 'Explain the lead stages, the next-action logic, and when each follow-up template should be sent.',
        checklist: ['Create a 20-lead tracker', 'Add stage and next-action columns', 'Write three follow-up templates'],
        resumeBullet: 'Built [metric] by creating [output] for a CRM Assistant practice brief, using [tools] to show pipeline hygiene and follow-up discipline.'
      },
      resumeAngle: 'organized records, follow-up discipline, and customer pipeline support',
      salaryRangePH: 'P35k to P65k/mo',
      lessonUrl: '../lesson-crm-basics/index.html',
      lessonRoles: ['sdr', 'account-manager', 'admin'],
      lessonKeywords: ['crm', 'lead', 'pipeline', 'follow-up']
    },
    {
      id: 'bookkeeping-va',
      title: 'Bookkeeping VA',
      aliases: ['Bookkeeping Assistant', 'Finance Assistant', 'Accounting Assistant'],
      level: 'stretch',
      bestFor: ['generalist', 'solo', 'transitioner'],
      tools: ['QuickBooks', 'Xero', 'Google Sheets', 'Wave'],
      fitReason: 'Best when the student likes accuracy, records, receipts, and repeatable admin routines.',
      avoidIf: 'Avoid if they have no patience for reconciliation, categorization, or checking details twice.',
      beginnerScore: 2,
      beginnerLabel: 'Stretch for beginners',
      beginnerReason: 'This is attractive but less forgiving because mistakes affect money records and client trust.',
      proofSample: 'monthly expense tracker with categorized sample transactions',
      proofSteps: ['Create a sample expense sheet', 'Categorize 30 sample transactions', 'Write a monthly summary note'],
      proofTemplate: {
        projectName: 'Monthly expense tracker sample',
        output: 'expense sheet, 30 categorized transactions, and monthly summary note',
        metricPlaceholder: '30 transactions, 6 categories, 1 summary note',
        notesPrompt: 'List the transaction categories, the checks you performed, and the monthly summary you would send to a client.',
        checklist: ['Create a sample expense sheet', 'Categorize 30 sample transactions', 'Write one monthly summary note'],
        resumeBullet: 'Built [metric] by creating [output] for a Bookkeeping VA practice brief, using [tools] to show accuracy, records discipline, and financial admin support.'
      },
      resumeAngle: 'accuracy, records, and financial admin support',
      salaryRangePH: 'P35k to P70k/mo',
      lessonUrl: '../lesson-specialized-business-skills/index.html',
      lessonRoles: ['admin', 'va'],
      lessonKeywords: ['bookkeeping', 'expense', 'records', 'spreadsheet']
    },
    {
      id: 'project-coordinator',
      title: 'Project Coordinator',
      aliases: ['Project Assistant', 'Operations Coordinator', 'Case Coordinator'],
      level: 'stretch',
      bestFor: ['polished', 'transitioner', 'solo'],
      tools: ['Asana', 'ClickUp', 'Notion', 'Google Sheets'],
      fitReason: 'Best when the student already coordinates tasks, deadlines, people, or recurring operations.',
      avoidIf: 'Avoid if they cannot give direct status updates or push tasks forward without constant prompting.',
      beginnerScore: 2,
      beginnerLabel: 'Stretch for beginners',
      beginnerReason: 'This role requires ownership, status writing, and confidence moving work forward across people.',
      proofSample: 'project board with timeline, owners, and status updates',
      proofSteps: ['Create a project board', 'Add 10 tasks with owners and due dates', 'Write one weekly status update'],
      proofTemplate: {
        projectName: 'Project board and weekly status sample',
        output: 'project board, 10 tasks, owners, due dates, and weekly status update',
        metricPlaceholder: '10 tasks, 3 owners, 1 status update',
        notesPrompt: 'Describe the project goal, the task board setup, and the weekly update a client would receive.',
        checklist: ['Create one project board', 'Add 10 tasks with owners and due dates', 'Write one weekly status update'],
        resumeBullet: 'Built [metric] by creating [output] for a Project Coordinator practice brief, using [tools] to show deadline tracking and stakeholder updates.'
      },
      resumeAngle: 'coordination, deadline tracking, and stakeholder updates',
      salaryRangePH: 'P45k to P80k/mo',
      lessonUrl: '../lesson-pm-tool-fluency/index.html',
      lessonRoles: ['admin', 'account-manager', 'va'],
      lessonKeywords: ['project', 'timeline', 'status', 'operations']
    },
    {
      id: 'seo-assistant',
      title: 'SEO Assistant',
      aliases: ['SEO', 'SEO Specialist', 'Digital Marketing SEO Specialist', 'SEO Content Assistant'],
      level: 'stretch',
      bestFor: ['transitioner', 'creative', 'generalist'],
      tools: ['Google Sheets', 'Google Search Console', 'Ahrefs', 'Google Docs'],
      fitReason: 'Best when the student likes research, keywords, content structure, and careful spreadsheet work.',
      avoidIf: 'Avoid as a first target if they do not want research, source checking, or slow compounding work.',
      beginnerScore: 3,
      beginnerLabel: 'Moderate entry path',
      beginnerReason: 'SEO is realistic after one keyword research sample, but it is harder to bluff because clients inspect the logic.',
      proofSample: 'keyword research sheet with content brief',
      proofSteps: ['Research 20 keywords', 'Group keywords by search intent', 'Write one content brief'],
      proofTemplate: {
        projectName: 'Keyword research and content brief sample',
        output: '20-keyword sheet, intent groups, and 1 content brief',
        metricPlaceholder: '20 keywords, 4 intent groups, 1 brief',
        notesPrompt: 'Explain the topic, the keyword groups, and why the content brief matches the search intent.',
        checklist: ['Research 20 realistic keywords', 'Group keywords by intent', 'Write one content brief from the best keyword group'],
        resumeBullet: 'Built [metric] by creating [output] for an SEO Assistant practice brief, using [tools] to show keyword research and content planning discipline.'
      },
      resumeAngle: 'keyword research, content organization, and careful spreadsheet proof',
      salaryRangePH: 'P35k to P65k/mo',
      lessonUrl: '../lesson-smm-core-strategies/index.html',
      lessonRoles: ['content', 'smm'],
      lessonKeywords: ['seo', 'keyword', 'content', 'research']
    },
    {
      id: 'data-entry-va',
      title: 'Data Entry VA',
      aliases: ['Virtual Assistant', 'Data Entry', 'Data Quality Analyst', 'Data Analyst Assistant', 'Office Assistant'],
      level: 'best-fit',
      bestFor: ['fresh', 'generalist', 'transitioner'],
      tools: ['Google Sheets', 'Excel', 'Google Workspace', 'Airtable'],
      fitReason: 'Best when the student is careful, consistent, and needs a lower-risk first remote role with measurable output.',
      avoidIf: 'Avoid if they hate repetitive checking, spreadsheet cleanup, or following exact formatting rules.',
      beginnerScore: 5,
      beginnerLabel: 'Most beginner friendly',
      beginnerReason: 'This is one of the safest first roles because the proof can be small, visible, and easy for clients to inspect.',
      proofSample: 'clean data sheet with QA notes',
      proofSteps: ['Clean a 50-row sample sheet', 'Standardize names and categories', 'Write one QA note with fixes made'],
      proofTemplate: {
        projectName: 'Data cleanup and QA sample',
        output: '50-row cleaned sheet, standardized fields, and QA note',
        metricPlaceholder: '50 rows, 4 columns, 1 QA note',
        notesPrompt: 'List what you cleaned, what rules you followed, and how a client can inspect the final sheet.',
        checklist: ['Clean a 50-row sample sheet', 'Standardize four fields', 'Write one QA note with the fixes made'],
        resumeBullet: 'Built [metric] by creating [output] for a Data Entry VA practice brief, using [tools] to show accuracy, consistency, and spreadsheet care.'
      },
      resumeAngle: 'accuracy, spreadsheet cleanup, and reliable task completion',
      salaryRangePH: 'P25k to P45k/mo',
      lessonUrl: '../lesson-office-admin-to-va-portfolio/index.html',
      lessonRoles: ['admin', 'va'],
      lessonKeywords: ['data', 'spreadsheet', 'admin', 'accuracy']
    }
  ];
  const NOT_YET_BY_ARCHETYPE = {
    polished: [
      {
        roleId: 'social-media-assistant',
        reason: 'This may underprice a polished freelancer if the resume already proves client management, operations, or executive support.',
        prerequisite: 'Only target this if the student has visible creative samples and wants execution-heavy social work.',
        saferRoleId: 'executive-assistant'
      }
    ],
    transitioner: [
      {
        roleId: 'project-coordinator',
        reason: 'This can be too exposed when the student has not yet shown remote task ownership, status writing, and tool fluency.',
        prerequisite: 'Build one project board sample and one weekly status update before applying.',
        saferRoleId: 'marketing-va'
      }
    ],
    creative: [
      {
        roleId: 'bookkeeping-va',
        reason: 'This is usually a poor first pivot for a creative profile because clients inspect accuracy, accounting comfort, and repeatable records work.',
        prerequisite: 'Complete an expense tracker sample with categorized transactions before testing this role.',
        saferRoleId: 'social-media-assistant'
      }
    ],
    solo: [
      {
        roleId: 'customer-support-va',
        reason: 'This can waste a solo entrepreneur profile if the student already has operations, follow-up, or business ownership proof.',
        prerequisite: 'Choose this only if the student wants repetitive support work and can show calm written replies.',
        saferRoleId: 'crm-assistant'
      }
    ],
    generalist: [
      {
        roleId: 'content-assistant',
        reason: 'This is not the cleanest first target if the student has stronger admin, records, or coordination proof than writing proof.',
        prerequisite: 'Create a blog-to-social repurposing sample before presenting as a content candidate.',
        saferRoleId: 'marketing-va'
      }
    ],
    fresh: [
      {
        roleId: 'executive-assistant',
        reason: 'This role asks for judgment, polished writing, calendar conflict handling, and executive trust before the student has enough proof.',
        prerequisite: 'Start with a customer support or marketing support sample, then add calendar and inbox proof later.',
        saferRoleId: 'customer-support-va'
      }
    ]
  };

  function levelLabel(level) {
    if (level === 'best-fit') return 'Best fit';
    if (level === 'stretch') return 'Stretch';
    if (level === 'not-yet') return 'Not yet';
    return 'Role';
  }

  function read() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch (error) {
      return {};
    }
  }

  function write(patch) {
    const next = Object.assign({}, read(), patch || {}, {
      updatedAt: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function rolesForArchetype(archetype) {
    return ROLE_CATALOG
      .filter(role => role.bestFor.includes(archetype))
      .sort((a, b) => {
        const rank = { 'best-fit': 0, stretch: 1, 'not-yet': 2 };
        return (rank[a.level] ?? 9) - (rank[b.level] ?? 9);
      });
  }

  function notYetForArchetype(archetype) {
    return (NOT_YET_BY_ARCHETYPE[archetype] || [])
      .map(item => {
        const role = roleById(item.roleId);
        const saferRole = roleById(item.saferRoleId);
        if (!role) return null;
        return Object.assign({}, item, { role, saferRole });
      })
      .filter(Boolean);
  }

  function roleById(id) {
    return ROLE_CATALOG.find(role => role.id === id) || null;
  }

  function normalizeRoleTitle(title) {
    return String(title || '')
      .toLowerCase()
      .replace(/\bva\b/g, 'virtual assistant')
      .replace(/customer support\b/g, 'customer support virtual assistant')
      .replace(/virtual assistant assistant/g, 'virtual assistant')
      .trim();
  }

  function roleTitleMatches(text, candidate) {
    const normalizedText = normalizeRoleTitle(text);
    const normalizedCandidate = normalizeRoleTitle(candidate);
    if (!normalizedText || !normalizedCandidate) return false;
    return normalizedText === normalizedCandidate ||
      normalizedText.includes(normalizedCandidate);
  }

  function roleForTitle(title) {
    return ROLE_CATALOG.find(role => {
      const names = [role.title].concat(role.aliases || []);
      return names.some(name => roleTitleMatches(title, name));
    }) || null;
  }

  function archetypeLabel(archetype) {
    return ARCHETYPE_LABELS[archetype] || '';
  }

  function archetypeKeyFromLabel(label) {
    const text = String(label || '').toLowerCase();
    return Object.keys(ARCHETYPE_LABELS).find(key => ARCHETYPE_LABELS[key].toLowerCase() === text) || '';
  }

  window.BFF = {
    storageKey: STORAGE_KEY,
    archetypeLabels: ARCHETYPE_LABELS,
    roleCatalog: ROLE_CATALOG,
    notYetByArchetype: NOT_YET_BY_ARCHETYPE,
    readState: read,
    writeState: write,
    rolesForArchetype,
    notYetForArchetype,
    roleById,
    roleForTitle,
    archetypeLabel,
    archetypeKeyFromLabel,
    levelLabel
  };
})();
