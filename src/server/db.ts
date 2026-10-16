import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'emperor_crm.db');
export const db = new DatabaseSync(DB_PATH);

// Initialize database pragma and tables
export function initDatabase() {
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  // 1. Organizations
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      plan TEXT NOT NULL DEFAULT 'growth',
      plan_limits_json TEXT NOT NULL,
      settings_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 2. Users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'sales_agent',
      is_active INTEGER NOT NULL DEFAULT 1,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      UNIQUE(organization_id, email)
    );
  `);

  // 3. Pipeline Stages
  db.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_stages (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      name TEXT NOT NULL,
      stage_order INTEGER NOT NULL,
      color TEXT NOT NULL DEFAULT '#fca311',
      is_won INTEGER NOT NULL DEFAULT 0,
      is_lost INTEGER NOT NULL DEFAULT 0,
      allowed_transitions_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );
  `);

  // 4. Leads
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      source TEXT NOT NULL DEFAULT 'Website Form',
      status TEXT NOT NULL DEFAULT 'active',
      pipeline_stage_id TEXT NOT NULL,
      estimated_value REAL NOT NULL DEFAULT 0,
      assigned_user_id TEXT,
      qualification_status TEXT NOT NULL DEFAULT 'unqualified',
      ai_intent TEXT,
      ai_summary TEXT,
      ai_confidence REAL,
      ai_urgency TEXT,
      consent_marketing INTEGER NOT NULL DEFAULT 1,
      lost_reason TEXT,
      won_reason TEXT,
      custom_fields_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      archived_at TEXT,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (pipeline_stage_id) REFERENCES pipeline_stages(id)
    );
  `);

  // 5. Tasks
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      lead_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending',
      assigned_user_id TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );
  `);

  // 6. Activities & Audit Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      lead_id TEXT,
      user_id TEXT,
      action_type TEXT NOT NULL,
      description TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );
  `);

  // 7. Human Handoffs
  db.exec(`
    CREATE TABLE IF NOT EXISTS human_handoffs (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      summary TEXT NOT NULL,
      next_action TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'high',
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'awaiting_action',
      assigned_user_id TEXT,
      resolution_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );
  `);

  // 8. Lead Forms
  db.exec(`
    CREATE TABLE IF NOT EXISTS lead_forms (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      fields_config_json TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      auto_assign_user_id TEXT,
      default_pipeline_stage_id TEXT NOT NULL,
      confirmation_message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      UNIQUE(organization_id, slug)
    );
  `);

  // 9. Integration Logs (Webhooks, Zapier/Make, AI)
  db.exec(`
    CREATE TABLE IF NOT EXISTS integration_logs (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      integration_name TEXT NOT NULL,
      event_type TEXT NOT NULL,
      idempotency_key TEXT,
      status TEXT NOT NULL,
      payload_json TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for high performance & fast tenant isolation
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
    CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(organization_id);
    CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(pipeline_stage_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks(lead_id);
    CREATE INDEX IF NOT EXISTS idx_activities_org ON activities(organization_id);
    CREATE INDEX IF NOT EXISTS idx_handoffs_org ON human_handoffs(organization_id);
    CREATE INDEX IF NOT EXISTS idx_handoffs_status ON human_handoffs(status);
    CREATE INDEX IF NOT EXISTS idx_integration_idem ON integration_logs(organization_id, idempotency_key);
  `);

  seedDefaultData();
}

// Seed initial default organization and users if database is fresh
function seedDefaultData() {
  const checkOrg = db.prepare('SELECT COUNT(*) as count FROM organizations').get() as { count: number };
  if (checkOrg.count > 0) return;

  const passwordHash = bcrypt.hashSync('Emperor2026!', 10);

  // 1. Apex Plumbing & HVAC (Primary Demo Org)
  const orgApexId = 'org_apex_hvac';
  db.prepare(`
    INSERT INTO organizations (id, name, slug, plan, plan_limits_json, settings_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    orgApexId,
    'Apex Plumbing & HVAC',
    'apex-hvac',
    'growth',
    JSON.stringify({ maxUsers: 15, maxLeads: 5000, aiEnabled: true, webhooksEnabled: true, exportEnabled: true }),
    JSON.stringify({
      currency: 'USD',
      industry: 'Home Services / HVAC',
      phone: '+1 (555) 382-9011',
      autoAssign: true,
      requireLostReason: true
    })
  );

  // Users for Apex
  const userOwnerId = 'user_apex_owner';
  const userAdminId = 'user_apex_admin';
  const userSalesId = 'user_apex_sales';

  const insertUser = db.prepare(`
    INSERT INTO users (id, organization_id, email, password_hash, full_name, role, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(userOwnerId, orgApexId, 'marcus@apexhvac.com', passwordHash, 'Marcus Vance (Owner)', 'owner', 1);
  insertUser.run(userAdminId, orgApexId, 'sarah.ops@apexhvac.com', passwordHash, 'Sarah Chen (Admin)', 'admin', 1);
  insertUser.run(userSalesId, orgApexId, 'david.sales@apexhvac.com', passwordHash, 'David Miller (Sales Agent)', 'sales_agent', 1);

  // Pipeline stages for Apex
  const stages = [
    { id: 'stage_apex_new', name: 'New Lead', order: 1, color: '#3e67bf', won: 0, lost: 0 },
    { id: 'stage_apex_contact_pending', name: 'Contact Pending', order: 2, color: '#fca311', won: 0, lost: 0 },
    { id: 'stage_apex_contacted', name: 'Contacted', order: 3, color: '#fdb541', won: 0, lost: 0 },
    { id: 'stage_apex_qualifying', name: 'Qualifying', order: 4, color: '#29447e', won: 0, lost: 0 },
    { id: 'stage_apex_qualified', name: 'Qualified', order: 5, color: '#10b981', won: 0, lost: 0 },
    { id: 'stage_apex_scheduled', name: 'Site Visit / Scheduled', order: 6, color: '#8b5cf6', won: 0, lost: 0 },
    { id: 'stage_apex_negotiation', name: 'Estimate / Negotiation', order: 7, color: '#ec4899', won: 0, lost: 0 },
    { id: 'stage_apex_won', name: 'Won / Signed', order: 8, color: '#22c55e', won: 1, lost: 0 },
    { id: 'stage_apex_lost', name: 'Lost', order: 9, color: '#ef4444', won: 0, lost: 1 }
  ];

  const insertStage = db.prepare(`
    INSERT INTO pipeline_stages (id, organization_id, name, stage_order, color, is_won, is_lost)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of stages) {
    insertStage.run(s.id, orgApexId, s.name, s.order, s.color, s.won, s.lost);
  }

  // Sample leads for Apex
  const sampleLeads = [
    {
      id: 'lead_apex_1',
      firstName: 'Eleanor',
      lastName: 'Rigby',
      email: 'eleanor.rigby@evergreenapts.com',
      phone: '+1 (555) 721-4902',
      company: 'Evergreen Apartments (12 units)',
      source: 'Google Ads',
      stage: 'stage_apex_scheduled',
      value: 14500,
      assigned: userSalesId,
      qualStatus: 'qualified',
      intent: 'Full commercial heat pump conversion',
      summary: 'Property manager needs dual-zone inverter heat pumps for 12 units before winter freeze.',
      urgency: 'high',
      confidence: 0.94
    },
    {
      id: 'lead_apex_2',
      firstName: 'Robert',
      lastName: 'Hawthorne',
      email: 'rhawthorne@veritaslogistics.net',
      phone: '+1 (555) 902-1144',
      company: 'Veritas Distribution Hub',
      source: 'Website Form',
      stage: 'stage_apex_qualifying',
      value: 8200,
      assigned: userSalesId,
      qualStatus: 'in_progress',
      intent: 'Rooftop AC compressor replacement',
      summary: 'Main warehouse AC unit tripping circuit breakers during afternoon peak heat.',
      urgency: 'urgent',
      confidence: 0.88
    },
    {
      id: 'lead_apex_3',
      firstName: 'Clara',
      lastName: 'Oswald',
      email: 'clara.oswald@bakerstreetcafe.org',
      phone: '+1 (555) 432-8871',
      company: 'Baker Street Roasters',
      source: 'Referral',
      stage: 'stage_apex_negotiation',
      value: 5800,
      assigned: userOwnerId,
      qualStatus: 'qualified',
      intent: 'Commercial water filtration & tankless system',
      summary: 'High-volume espresso bar needs high flow commercial filtration and rapid heating.',
      urgency: 'medium',
      confidence: 0.91
    },
    {
      id: 'lead_apex_4',
      firstName: 'Arthur',
      lastName: 'Dent',
      email: 'arthur.dent@galaxycottage.co',
      phone: '+1 (555) 672-0199',
      company: 'Private Residence',
      source: 'Local Walk-in',
      stage: 'stage_apex_new',
      value: 3400,
      assigned: userSalesId,
      qualStatus: 'unqualified',
      intent: 'Residential boiler maintenance & smart thermostat',
      summary: 'Customer hearing knocking noises in radiator pipes.',
      urgency: 'medium',
      confidence: 0.82
    },
    {
      id: 'lead_apex_5',
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'elena.rostova@prestigedental.com',
      phone: '+1 (555) 883-2211',
      company: 'Prestige Dental Clinic',
      source: 'Website Form',
      stage: 'stage_apex_won',
      value: 19200,
      assigned: userOwnerId,
      qualStatus: 'qualified',
      intent: 'Medical-grade cleanroom air purification & HVAC zoning',
      summary: 'Contract signed for 4 surgery rooms medical HVAC upgrade.',
      urgency: 'high',
      confidence: 0.98
    }
  ];

  const insertLead = db.prepare(`
    INSERT INTO leads (
      id, organization_id, first_name, last_name, email, phone, company, source,
      pipeline_stage_id, estimated_value, assigned_user_id, qualification_status,
      ai_intent, ai_summary, ai_confidence, ai_urgency, custom_fields_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const l of sampleLeads) {
    insertLead.run(
      l.id,
      orgApexId,
      l.firstName,
      l.lastName,
      l.email,
      l.phone,
      l.company,
      l.source,
      l.stage,
      l.value,
      l.assigned,
      l.qualStatus,
      l.intent,
      l.summary,
      l.confidence,
      l.urgency,
      JSON.stringify({ propertyType: 'Commercial / Multi-unit', preferredTime: 'Morning' })
    );
  }

  // Tasks for Apex
  const insertTask = db.prepare(`
    INSERT INTO tasks (id, organization_id, lead_id, title, description, due_date, priority, status, assigned_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTask.run(
    'task_apex_1',
    orgApexId,
    'lead_apex_1',
    'Conduct on-site engineering load calculation',
    'Measure square footage across all 12 units and check main breaker panel capacity.',
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    'urgent',
    'pending',
    userSalesId
  );

  insertTask.run(
    'task_apex_2',
    orgApexId,
    'lead_apex_2',
    'Send urgent rooftop crane access quote',
    'Verify if landlord allows Sunday morning rooftop lift.',
    new Date(Date.now() - 86400000).toISOString().split('T')[0], // Overdue!
    'high',
    'pending',
    userSalesId
  );

  insertTask.run(
    'task_apex_3',
    orgApexId,
    'lead_apex_3',
    'Follow up on revised filtration contract',
    'Call Clara regarding the 5-year replacement cartridge bundle.',
    new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    'medium',
    'pending',
    userOwnerId
  );

  // Human Handoff Case for Apex
  const insertHandoff = db.prepare(`
    INSERT INTO human_handoffs (
      id, organization_id, lead_id, reason, summary, next_action, priority, status, assigned_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertHandoff.run(
    'handoff_apex_1',
    orgApexId,
    'lead_apex_2',
    'Urgent emergency repair & disputed warranty claim',
    'Lead reported previous technician installation broke sensor, causing emergency freezer room overheat. Threatens dispute if not inspected by manager.',
    'Senior manager call back within 2 hours with priority inspection ticket.',
    'urgent',
    'awaiting_action',
    userOwnerId
  );

  // Default Lead Capture Form for Apex
  db.prepare(`
    INSERT INTO lead_forms (
      id, organization_id, title, slug, fields_config_json, is_active, auto_assign_user_id, default_pipeline_stage_id, confirmation_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'form_apex_contact',
    orgApexId,
    'Emergency HVAC & Commercial Quote Form',
    'apex-quote',
    JSON.stringify([
      { name: 'firstName', label: 'First Name', type: 'text', required: true },
      { name: 'lastName', label: 'Last Name', type: 'text', required: true },
      { name: 'email', label: 'Business Email', type: 'email', required: true },
      { name: 'phone', label: 'Direct Phone', type: 'tel', required: true },
      { name: 'company', label: 'Company / Facility Name', type: 'text', required: false },
      { name: 'enquiry', label: 'Describe HVAC / Plumbing Requirement', type: 'textarea', required: true },
      { name: 'estimatedBudget', label: 'Approximate Budget ($)', type: 'number', required: false }
    ]),
    1,
    userSalesId,
    'stage_apex_new',
    'Thank you! Your request has been assigned to our senior commercial estimator. We will contact you shortly.'
  );

  // 2. Summit Legal Advisors (Second Isolated Organization to rigorously prove multi-tenancy & cross-tenant security)
  const orgSummitId = 'org_summit_legal';
  db.prepare(`
    INSERT INTO organizations (id, name, slug, plan, plan_limits_json, settings_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    orgSummitId,
    'Summit Legal Advisors LLP',
    'summit-legal',
    'pro',
    JSON.stringify({ maxUsers: 50, maxLeads: 25000, aiEnabled: true, webhooksEnabled: true, exportEnabled: true }),
    JSON.stringify({ currency: 'USD', industry: 'Corporate Law', phone: '+1 (555) 880-9900' })
  );

  const userSummitOwnerId = 'user_summit_owner';
  insertUser.run(userSummitOwnerId, orgSummitId, 'elizabeth@summitlegal.com', passwordHash, 'Elizabeth Stone (Managing Partner)', 'owner', 1);

  const stageSummitNew = 'stage_summit_new';
  insertStage.run(stageSummitNew, orgSummitId, 'Retainer Consultation', 1, '#29447e', 0, 0);

  insertLead.run(
    'lead_summit_1',
    orgSummitId,
    'Geoffrey',
    'Rush',
    'geoffrey.rush@vanguardholdings.com',
    '+1 (555) 771-3300',
    'Vanguard Holdings',
    'Referral',
    stageSummitNew,
    45000,
    userSummitOwnerId,
    'qualified',
    'M&A cross-border tax advisory',
    'Series B acquisition audit and shareholder agreement drafting.',
    0.96,
    'high',
    JSON.stringify({ practiceArea: 'M&A Corporate' })
  );

  // Initial audit log
  db.prepare(`
    INSERT INTO activities (id, organization_id, lead_id, user_id, action_type, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'act_init_1',
    orgApexId,
    'lead_apex_1',
    userOwnerId,
    'system_seed',
    'Apex Plumbing & HVAC workspace initialized with baseline pipeline stages and demo leads.'
  );

  console.log('[Database] Initialized and seeded successfully with multi-tenant data.');
}
