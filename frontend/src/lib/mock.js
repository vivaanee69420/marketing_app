// Mock data for the UI build. Replaced by TanStack Query + API later.
// Shapes mirror docs/SECTIONS.md and the m1 reference behaviour.

export const businesses = [
  'GM Dental Barnet',
  'GM Dental Ashford',
  'GM Dental Rochester',
  'Fixed Teeth Solutions',
  'Warwick Lodge Dental & Implant Centre',
  'Plan 4 Growth Academy',
];

// --- Overview -------------------------------------------------------------
export const overviewMetrics = [
  { label: 'Total Marketing Spend', value: 8340, kind: 'currency', note: 'Combined Meta + Google', icon: 'PoundSterling' },
  { label: 'Tracked Revenue', value: 41200, kind: 'currency', note: 'Attributed conversions', icon: 'TrendingUp' },
  { label: 'ROAS', value: '4.94×', kind: 'text', note: 'Revenue / spend', icon: 'Target' },
  { label: 'ROI', value: '394%', kind: 'text', note: '(rev − spend) / spend', icon: 'Percent' },
  { label: 'Morning Recipients', value: 7, kind: 'number', note: 'Daily digest', icon: 'Mail' },
  { label: 'Open Tasks', value: 12, kind: 'number', note: 'Across all businesses', icon: 'ListChecks' },
];

export const hero = {
  business: 'GM Dental Ashford',
  stats: [
    { label: 'Conversions', value: '138' },
    { label: 'AI Report', value: '26 May 2026' },
    { label: 'Open Issues', value: '1' },
    { label: 'Tasks', value: '3' },
  ],
};

export const systemHealth = {
  tone: 'good',
  text: 'Last sync 26 May 2026 07:30 · last report 08:00 · digest sent 08:05. All jobs healthy.',
};

export const trend = [
  { month: 'Jan', spend: 5200, revenue: 24800 },
  { month: 'Feb', spend: 6100, revenue: 29100 },
  { month: 'Mar', spend: 6800, revenue: 32600 },
  { month: 'Apr', spend: 7200, revenue: 35900 },
  { month: 'May', spend: 8340, revenue: 41200 },
  { month: 'Jun', spend: 7600, revenue: 38400 },
];

export const jobHealth = [
  { name: 'Daily Sync', time: '07:30', tz: 'Europe/London', lastRun: '26 May 2026', status: 'ok' },
  { name: 'AI Report', time: '08:00', tz: 'Europe/London', lastRun: '26 May 2026', status: 'ok' },
  { name: 'Email Digest', time: '08:05', tz: 'Europe/London', lastRun: '26 May 2026', status: 'warn' },
];

export const businessComparison = [
  { business: 'GM Dental Barnet', spend: 2100, revenue: 9800, roi: 367, meta: 'ok', google: 'ok' },
  { business: 'GM Dental Ashford', spend: 2610, revenue: 14200, roi: 444, meta: 'ok', google: 'ok' },
  { business: 'GM Dental Rochester', spend: 1700, revenue: 6900, roi: 306, meta: 'ok', google: 'warn' },
  { business: 'Fixed Teeth Solutions', spend: 2680, revenue: 7300, roi: 172, meta: 'warn', google: 'ok' },
  { business: 'Warwick Lodge', spend: 1430, revenue: 4100, roi: 187, meta: 'ok', google: 'err' },
  { business: 'Plan 4 Growth Academy', spend: 1820, revenue: 5600, roi: 208, meta: 'ok', google: 'ok' },
];

export const campaignPerformance = [
  { business: 'GM Dental Ashford', platform: 'Google Ads', campaign: 'Dental Implants Search', spend: 860, clicks: 412, conversions: 19, cpc: 17.92 },
  { business: 'GM Dental Barnet', platform: 'Meta Ads', campaign: 'Invisalign Lead Form', spend: 520, clicks: 891, conversions: 11, cpc: 16.77 },
  { business: 'Fixed Teeth Solutions', platform: 'Google Ads', campaign: 'Emergency Dentist Search', spend: 740, clicks: 336, conversions: 8, cpc: 30.83 },
  { business: 'Warwick Lodge', platform: 'Meta Ads', campaign: 'Implant Open Day', spend: 390, clicks: 524, conversions: 6, cpc: 22.94 },
  { business: 'Plan 4 Growth Academy', platform: 'Meta Ads', campaign: 'Level 7 Implantology', spend: 780, clicks: 1040, conversions: 14, cpc: 20.00 },
];

export const operationalSuggestions = [
  'Connect Google Ads for Warwick Lodge — sync currently failing (token expired).',
  'Fixed Teeth Solutions ROI below 200% — review Emergency Dentist Search CPL.',
  'Enable WhatsApp reminders once a provider is configured in Settings.',
  'Add conversion values for Plan 4 Growth course enquiries to sharpen ROI.',
];

// --- Reports --------------------------------------------------------------
export const reports = [
  {
    id: 'r1', business: 'GM Dental Ashford', type: 'Per-business', date: '26 May 2026',
    summary: 'Implants search continues to drive the strongest pipeline; Meta retargeting underperforming.',
    wins: ['Implants Search ROAS 6.1×', 'Cost per lead down 8% MoM', 'Strong booking-to-consult rate'],
    losses: ['Meta retargeting CPL £41', 'Invisalign creative fatigue'],
    issues: ['Google conversion import gap on 22 May'],
    opportunities: ['Scale implants search budget +15%', 'Test new before/after creative'],
    creativeIdeas: ['Patient testimonial reels', 'Implant day countdown story'],
    adCopyIdeas: ['"Smile in a day" implant offer', 'Finance-from-£X messaging'],
  },
  {
    id: 'r2', business: 'All Businesses', type: 'Master', date: '26 May 2026',
    summary: 'Group ROI healthy at 394%. Warwick Lodge Google sync needs attention.',
    wins: ['Group ROAS 4.94×', 'Ashford best performer'],
    losses: ['Warwick Lodge Google offline', 'Fixed Teeth ROI 172%'],
    issues: ['1 sync failure', 'Digest delivery delayed 4 min'],
    opportunities: ['Reallocate spend to top-quartile practices'],
    creativeIdeas: ['Cross-practice review highlight reel'],
    adCopyIdeas: ['Local "rated 5 stars" social proof'],
  },
];

// --- Tasks ----------------------------------------------------------------
export const tasks = [
  { id: 't1', task: 'Refresh Warwick Lodge Google token', business: 'Warwick Lodge', category: 'Integration', priority: 'High', status: 'Open', source: 'AI', created: '26 May 2026' },
  { id: 't2', task: 'Review Emergency Dentist Search CPL', business: 'Fixed Teeth Solutions', category: 'Optimisation', priority: 'High', status: 'In Progress', source: 'AI', created: '25 May 2026' },
  { id: 't3', task: 'Add finance messaging to implant ads', business: 'GM Dental Ashford', category: 'Creative', priority: 'Medium', status: 'Open', source: 'AI', created: '26 May 2026' },
  { id: 't4', task: 'Collect 5 new Google reviews', business: 'GM Dental Barnet', category: 'Reviews', priority: 'Medium', status: 'Open', source: 'Manual', created: '24 May 2026' },
  { id: 't5', task: 'Set conversion values for course enquiries', business: 'Plan 4 Growth Academy', category: 'Setup', priority: 'Low', status: 'Done', source: 'Manual', created: '20 May 2026' },
];

export const taskCategories = ['Integration', 'Optimisation', 'Creative', 'Reviews', 'Setup', 'Reporting'];
export const taskPriorities = ['High', 'Medium', 'Low'];
export const taskStatuses = ['Open', 'In Progress', 'Done'];

// --- Businesses -----------------------------------------------------------
export const businessRows = [
  { business: 'GM Dental Barnet', spend: 2100, revenue: 9800, roi: 367, meta: 'ok', google: 'ok', tz: 'Europe/London', lastSync: '26 May 2026 07:30' },
  { business: 'GM Dental Ashford', spend: 2610, revenue: 14200, roi: 444, meta: 'ok', google: 'ok', tz: 'Europe/London', lastSync: '26 May 2026 07:30' },
  { business: 'GM Dental Rochester', spend: 1700, revenue: 6900, roi: 306, meta: 'ok', google: 'warn', tz: 'Europe/London', lastSync: '26 May 2026 07:31' },
  { business: 'Fixed Teeth Solutions', spend: 2680, revenue: 7300, roi: 172, meta: 'warn', google: 'ok', tz: 'Europe/London', lastSync: '26 May 2026 07:30' },
  { business: 'Warwick Lodge', spend: 1430, revenue: 4100, roi: 187, meta: 'ok', google: 'err', tz: 'Europe/London', lastSync: '24 May 2026 07:30' },
  { business: 'Plan 4 Growth Academy', spend: 1820, revenue: 5600, roi: 208, meta: 'ok', google: 'ok', tz: 'Europe/London', lastSync: '26 May 2026 07:30' },
];

// --- Conversions / Website Leads -----------------------------------------
export const conversionTypes = ['Implant consult', 'Invisalign enquiry', 'New patient', 'Course enquiry', 'General enquiry'];

export const conversions = [
  { id: 'c1', name: 'Sarah Holt', email: 's.holt@example.com', phone: '07700 900123', business: 'GM Dental Ashford', value: 2400, matchedTo: 'utm-adset · Implants Search · 0.91', date: '26 May 2026' },
  { id: 'c2', name: 'James Reed', email: 'jreed@example.com', phone: '07700 900456', business: 'GM Dental Barnet', value: 3200, matchedTo: 'utm-campaign · Invisalign · 0.82', date: '25 May 2026' },
  { id: 'c3', name: 'Aisha Khan', email: 'a.khan@example.com', phone: '07700 900789', business: 'Fixed Teeth Solutions', value: 0, matchedTo: 'fallback · last-touch · 0.55', date: '25 May 2026' },
];

// --- Setup ----------------------------------------------------------------
export const envGroups = [
  {
    name: 'Core', rows: [
      { variable: 'DATABASE_URL', purpose: 'Supabase Postgres connection', status: 'set' },
      { variable: 'SUPABASE_JWT_SECRET', purpose: 'Verify Supabase Auth tokens', status: 'set' },
      { variable: 'SUPABASE_SERVICE_ROLE_KEY', purpose: 'Server-side Supabase admin', status: 'set' },
      { variable: 'ENCRYPTION_KEY', purpose: 'AES-256-GCM token encryption', status: 'set' },
    ],
  },
  {
    name: 'Integrations', rows: [
      { variable: 'META_APP_SECRET', purpose: 'Meta Graph OAuth', status: 'required' },
      { variable: 'GOOGLE_ADS_DEVELOPER_TOKEN', purpose: 'Google Ads API', status: 'required' },
      { variable: 'ANTHROPIC_API_KEY', purpose: 'AI reports (heuristic fallback if unset)', status: 'optional' },
      { variable: 'RESEND_API_KEY', purpose: 'Email digest delivery', status: 'optional' },
    ],
  },
];

export const setupChecklist = [
  'Create your organisation and invite team members (Supabase Auth).',
  'Add your businesses (locations) under Businesses.',
  'Connect Meta and Google Ads per business in Settings → Integrations.',
  'Define conversion types and default values in Settings.',
  'Configure the morning digest recipients and schedule.',
  'Run an on-demand sync, then generate your first AI report.',
];

export const liveEndpoints = [
  'POST /api/sync — on-demand sync for a business',
  'POST /api/reports/generate — Claude report (heuristic fallback)',
  'POST /api/conversions — manual conversion entry',
  'POST /api/imports/csv — bulk CSV feed',
  'POST /api/cron/* — scheduled jobs (CRON_SECRET gated)',
];

export const connectionRows = [
  { business: 'GM Dental Barnet', meta: 'ok', google: 'ok' },
  { business: 'GM Dental Ashford', meta: 'ok', google: 'ok' },
  { business: 'GM Dental Rochester', meta: 'ok', google: 'warn' },
  { business: 'Fixed Teeth Solutions', meta: 'warn', google: 'ok' },
  { business: 'Warwick Lodge', meta: 'ok', google: 'err' },
  { business: 'Plan 4 Growth Academy', meta: 'ok', google: 'ok' },
];

// --- Audit ----------------------------------------------------------------
export const auditRows = [
  { business: 'GM Dental Barnet', meta: 'ok', google: 'ok', lastSync: '26 May 2026 07:30', issue: '—' },
  { business: 'GM Dental Ashford', meta: 'ok', google: 'ok', lastSync: '26 May 2026 07:30', issue: '—' },
  { business: 'GM Dental Rochester', meta: 'ok', google: 'warn', lastSync: '26 May 2026 07:31', issue: 'Google quota near limit' },
  { business: 'Fixed Teeth Solutions', meta: 'warn', google: 'ok', lastSync: '26 May 2026 07:30', issue: 'Meta token expires in 3 days' },
  { business: 'Warwick Lodge', meta: 'ok', google: 'err', lastSync: '24 May 2026 07:30', issue: 'Google token expired — reconnect' },
  { business: 'Plan 4 Growth Academy', meta: 'ok', google: 'ok', lastSync: '26 May 2026 07:30', issue: '—' },
];

// --- Imports --------------------------------------------------------------
export const csvGuide = [
  { feed: 'Conversions', columns: 'name, email, phone, value, date, utm_source, utm_campaign, utm_adset' },
  { feed: 'Reviews', columns: 'author, platform, rating, date, body, responded' },
  { feed: 'Bookings', columns: 'datetime, practice, patient, service, deposit, status' },
  { feed: 'Organic', columns: 'channel, reach, engagements, sessions, date' },
];

export const feedTypes = ['Conversions', 'Reviews', 'Bookings', 'Organic'];

// --- Growth Hub -----------------------------------------------------------
export const growth = {
  patients: businesses.slice(0, 4).map((b, i) => ({
    business: b, newPatients: 40 + i * 7, appointments: 88 + i * 12, completed: 70 + i * 9, revenue: 9000 + i * 2400,
  })),
  marketing: {
    summary: [
      { label: 'Total Leads', value: 421, kind: 'number' },
      { label: 'Total Pipeline Value', value: 184000, kind: 'currency' },
      { label: 'Average Conversion', value: '18.4%', kind: 'text' },
    ],
    sources: businesses.slice(0, 4).map((b, i) => ({
      business: b, spend: 2100 + i * 200, revenue: 9800 + i * 1500, converted: 30 + i * 6, avgValue: 1900 + i * 150, pipeline: 28000 + i * 5000,
    })),
    offers: businesses.slice(0, 4).map((b, i) => ({
      business: b, offer: ['Implants', 'Invisalign', 'New patient exam', 'Course bundle'][i], revenue: 14200 - i * 1800, nextStep: ['Scale budget', 'Refresh creative', 'Add finance CTA', 'Email nurture'][i],
    })),
  },
  loyalty: {
    summary: [
      { label: 'Active Members', value: 642, kind: 'number' },
      { label: 'MRR', value: 12800, kind: 'currency' },
      { label: 'Avg LTV', value: 1840, kind: 'currency' },
      { label: 'Retention Rate', value: '91%', kind: 'text' },
    ],
    tiers: [
      { name: 'Essential', price: '£12/mo', benefits: '2 check-ups, 10% off treatment', members: 410 },
      { name: 'Plus', price: '£22/mo', benefits: 'Hygiene + whitening discount', members: 178 },
      { name: 'Premium', price: '£39/mo', benefits: 'All-inclusive + priority booking', members: 54 },
    ],
    journeys: ['Welcome series (day 0–7)', 'Birthday reward', 'Lapsed-member win-back', 'Annual review reminder'],
  },
  reviews: {
    summary: [
      { label: 'Avg Rating', value: '4.8', kind: 'text' },
      { label: 'Total Reviews', value: 1284, kind: 'number' },
      { label: 'Awaiting Response', value: 6, kind: 'number' },
      { label: 'Recovery Rate', value: '72%', kind: 'text' },
    ],
    bySource: [
      { source: 'Google', count: 842, avg: '4.9' },
      { source: 'Facebook', count: 281, avg: '4.7' },
      { source: 'Trustpilot', count: 161, avg: '4.6' },
    ],
    byPractice: businesses.slice(0, 4).map((b, i) => ({ business: b, count: 320 - i * 40, avg: (4.9 - i * 0.1).toFixed(1) })),
    recent: [
      { author: 'M. Patel', platform: 'Google', business: 'GM Dental Ashford', date: '25 May 2026', body: 'Fantastic implant treatment, painless and quick.', responded: true },
      { author: 'L. Owens', platform: 'Facebook', business: 'GM Dental Barnet', date: '24 May 2026', body: 'Reception kept me waiting 20 minutes.', responded: false },
    ],
  },
  booking: {
    summary: [
      { label: 'Today', value: 18, kind: 'number' },
      { label: 'This Week', value: 96, kind: 'number' },
      { label: 'This Month', value: 412, kind: 'number' },
      { label: 'No-show Rate', value: '6.2%', kind: 'text' },
    ],
    recent: [
      { datetime: '27 May 2026 09:30', practice: 'GM Dental Ashford', patient: 'R. Singh', service: 'Implant consult', deposit: 50, status: 'Confirmed' },
      { datetime: '27 May 2026 11:00', practice: 'GM Dental Barnet', patient: 'T. Allen', service: 'Invisalign scan', deposit: 0, status: 'Pending' },
    ],
  },
  benchmark: {
    summary: [
      { label: 'Overall Ranking', value: 'Top 18%', kind: 'text' },
      { label: 'Better Than Avg', value: '7 of 9 metrics', kind: 'text' },
      { label: 'Top Quartile Uplift', value: '+24%', kind: 'text' },
    ],
    vsIndustry: [
      { metric: 'Cost per lead', ukAvg: '£28', you: '£19.81', variance: '−29%', status: 'ok' },
      { metric: 'Conversion rate', ukAvg: '14%', you: '18.4%', variance: '+31%', status: 'ok' },
      { metric: 'No-show rate', ukAvg: '9%', you: '6.2%', variance: '−31%', status: 'ok' },
      { metric: 'Review response time', ukAvg: '2 days', you: '3 days', variance: '+50%', status: 'warn' },
    ],
    opportunities: ['Cut review response time below 24h', 'Push membership upsell at consult', 'Test weekend booking slots'],
  },
  organic: [
    { channel: 'Instagram', reach: 48200, engagements: 3140, sessions: 1280 },
    { channel: 'Facebook', reach: 31800, engagements: 2010, sessions: 940 },
    { channel: 'Google Business', reach: 22400, engagements: 1620, sessions: 2100 },
  ],
};

// --- Settings -------------------------------------------------------------
export const conversionValues = [
  { business: 'GM Dental Ashford', type: 'Implant consult', value: 2400 },
  { business: 'GM Dental Barnet', type: 'Invisalign enquiry', value: 3200 },
  { business: 'Plan 4 Growth Academy', type: 'Course enquiry', value: 1200 },
];

export const implementationStatus = [
  'Multi-tenant org isolation (RLS) — implemented',
  'Meta + Google sync engine — implemented',
  'Encrypted OAuth token storage — implemented',
  'AI reports with heuristic fallback — implemented',
  'Resend morning digest — implemented',
  'SMS / WhatsApp delivery — UI only (Phase 2)',
];

export const scheduleJobs = [
  { name: 'Daily Sync', time: '07:30', tz: 'Europe/London' },
  { name: 'AI Report', time: '08:00', tz: 'Europe/London' },
  { name: 'Email Digest', time: '08:05', tz: 'Europe/London' },
];
