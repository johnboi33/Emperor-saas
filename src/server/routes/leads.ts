import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { analyzeAndQualifyLead } from '../ai.js';

export const leadsRouter = Router();

leadsRouter.use(requireAuth);

// 1. List Leads with filtering, searching, sorting, pagination
leadsRouter.get('/', (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const { search, stageId, source, assignedTo, status = 'active', page = '1', limit = '50', sortBy = 'created_at', sortOrder = 'desc' } = req.query;

  let baseQuery = `
    SELECT l.*, 
           ps.name as stage_name, ps.color as stage_color, ps.stage_order,
           u.full_name as assigned_user_name,
           (SELECT COUNT(*) FROM tasks WHERE lead_id = l.id AND status = 'pending') as pending_tasks_count,
           (SELECT COUNT(*) FROM human_handoffs WHERE lead_id = l.id AND status != 'resolved') as active_handoffs_count
    FROM leads l
    LEFT JOIN pipeline_stages ps ON l.pipeline_stage_id = ps.id
    LEFT JOIN users u ON l.assigned_user_id = u.id
    WHERE l.organization_id = ?
  `;
  const params: any[] = [orgId];

  if (status === 'archived') {
    baseQuery += ' AND l.archived_at IS NOT NULL';
  } else {
    baseQuery += ' AND l.archived_at IS NULL';
  }

  if (stageId && stageId !== 'all') {
    baseQuery += ' AND l.pipeline_stage_id = ?';
    params.push(stageId);
  }

  if (source && source !== 'all') {
    baseQuery += ' AND l.source = ?';
    params.push(source);
  }

  if (assignedTo && assignedTo !== 'all') {
    if (assignedTo === 'unassigned') {
      baseQuery += ' AND (l.assigned_user_id IS NULL OR l.assigned_user_id = "")';
    } else {
      baseQuery += ' AND l.assigned_user_id = ?';
      params.push(assignedTo);
    }
  }

  if (search && typeof search === 'string' && search.trim() !== '') {
    const term = `%${search.trim()}%`;
    baseQuery += ' AND (l.first_name LIKE ? OR l.last_name LIKE ? OR l.email LIKE ? OR l.phone LIKE ? OR l.company LIKE ? OR l.ai_intent LIKE ?)';
    params.push(term, term, term, term, term, term);
  }

  // Count total for pagination
  const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery})`;
  const countRow = db.prepare(countQuery).get(...params) as { total: number };
  const total = countRow?.total || 0;

  // Sorting
  const allowedSortCols = ['created_at', 'updated_at', 'estimated_value', 'first_name', 'last_name'];
  const sortCol = allowedSortCols.includes(sortBy as string) ? (sortBy as string) : 'created_at';
  const orderDir = (sortOrder as string).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  baseQuery += ` ORDER BY l.${sortCol} ${orderDir}`;

  const numLimit = Math.max(1, Math.min(100, parseInt(limit as string) || 50));
  const numPage = Math.max(1, parseInt(page as string) || 1);
  const offset = (numPage - 1) * numLimit;

  baseQuery += ' LIMIT ? OFFSET ?';
  params.push(numLimit, offset);

  const leads = db.prepare(baseQuery).all(...params);

  return res.json({
    leads,
    pagination: {
      total,
      page: numPage,
      limit: numLimit,
      totalPages: Math.ceil(total / numLimit)
    }
  });
});

// 2. Check for duplicate contacts
leadsRouter.get('/check-duplicate', (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const { email, phone, excludeId } = req.query;

  if (!email && !phone) {
    return res.json({ isDuplicate: false, duplicates: [] });
  }

  let query = 'SELECT id, first_name, last_name, email, phone, company, created_at FROM leads WHERE organization_id = ? AND archived_at IS NULL AND (';
  const conditions: string[] = [];
  const params: any[] = [orgId];

  if (email && typeof email === 'string' && email.trim()) {
    conditions.push('LOWER(email) = ?');
    params.push(email.trim().toLowerCase());
  }

  if (phone && typeof phone === 'string' && phone.trim()) {
    conditions.push('phone = ?');
    params.push(phone.trim());
  }

  query += conditions.join(' OR ') + ')';

  if (excludeId && typeof excludeId === 'string') {
    query += ' AND id != ?';
    params.push(excludeId);
  }

  const duplicates = db.prepare(query).all(...params);

  return res.json({
    isDuplicate: duplicates.length > 0,
    duplicates
  });
});

// 3. Create Lead
leadsRouter.post('/', (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const {
    firstName,
    lastName,
    email,
    phone,
    company,
    source = 'Direct Entry',
    pipelineStageId,
    estimatedValue = 0,
    assignedUserId,
    qualificationStatus = 'unqualified',
    enquiryText,
    customFields
  } = req.body;

  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'First name and last name are required.' });
  }

  // Check plan limits
  const org = db.prepare('SELECT plan_limits_json, name, settings_json FROM organizations WHERE id = ?').get(orgId) as any;
  const planLimits = JSON.parse(org?.plan_limits_json || '{}');
  const orgSettings = JSON.parse(org?.settings_json || '{}');

  const currentCount = (db.prepare('SELECT COUNT(*) as count FROM leads WHERE organization_id = ? AND archived_at IS NULL').get(orgId) as any).count;
  if (planLimits.maxLeads && currentCount >= planLimits.maxLeads) {
    return res.status(403).json({
      error: `Plan limit exceeded: Your subscription allows up to ${planLimits.maxLeads} leads. Please upgrade your plan.`
    });
  }

  // Determine pipeline stage
  let stageId = pipelineStageId;
  if (!stageId) {
    const firstStage = db.prepare('SELECT id FROM pipeline_stages WHERE organization_id = ? ORDER BY stage_order ASC LIMIT 1').get(orgId) as any;
    stageId = firstStage?.id;
  }

  const leadId = 'lead_' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO leads (
      id, organization_id, first_name, last_name, email, phone, company, source,
      pipeline_stage_id, estimated_value, assigned_user_id, qualification_status,
      ai_intent, ai_summary, custom_fields_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    leadId,
    orgId,
    firstName.trim(),
    lastName.trim(),
    email ? email.trim().toLowerCase() : null,
    phone ? phone.trim() : null,
    company ? company.trim() : null,
    source,
    stageId,
    Number(estimatedValue) || 0,
    assignedUserId || (orgSettings.autoAssign ? req.user!.id : null),
    qualificationStatus,
    enquiryText ? enquiryText.slice(0, 100) : null,
    enquiryText || null,
    customFields ? JSON.stringify(customFields) : null,
    now,
    now
  );

  // Automatically create a follow-up task if enquiry is present or new lead
  const taskId = 'task_' + crypto.randomUUID().slice(0, 8);
  const dueDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]; // Tomorrow
  db.prepare(`
    INSERT INTO tasks (id, organization_id, lead_id, title, description, due_date, priority, status, assigned_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    taskId,
    orgId,
    leadId,
    `Initial outreach to ${firstName} ${lastName}`,
    `Review initial inquiry (${source}) and initiate discovery call.`,
    dueDate,
    'high',
    assignedUserId || req.user!.id
  );

  // Activity log
  db.prepare(`
    INSERT INTO activities (id, organization_id, lead_id, user_id, action_type, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'act_' + crypto.randomUUID().slice(0, 8),
    orgId,
    leadId,
    req.user!.id,
    'lead_created',
    `Lead created by ${req.user!.fullName} from ${source}. Follow-up task scheduled.`
  );

  const createdLead = db.prepare('SELECT * FROM leads WHERE id = ? AND organization_id = ?').get(leadId, orgId);

  return res.status(201).json({
    message: 'Lead created successfully.',
    lead: createdLead
  });
});

// 4. Get Lead Details with full timeline, tasks, and handoffs
leadsRouter.get('/:id', (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const leadId = req.params.id;

  const lead = db.prepare(`
    SELECT l.*,
           ps.name as stage_name, ps.color as stage_color, ps.stage_order, ps.is_won, ps.is_lost,
           u.full_name as assigned_user_name, u.email as assigned_user_email
    FROM leads l
    LEFT JOIN pipeline_stages ps ON l.pipeline_stage_id = ps.id
    LEFT JOIN users u ON l.assigned_user_id = u.id
    WHERE l.id = ? AND l.organization_id = ?
  `).get(leadId, orgId) as any;

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found or access denied.' });
  }

  // Get tasks
  const tasks = db.prepare(`
    SELECT t.*, u.full_name as assigned_user_name
    FROM tasks t
    LEFT JOIN users u ON t.assigned_user_id = u.id
    WHERE t.lead_id = ? AND t.organization_id = ?
    ORDER BY t.created_at DESC
  `).all(leadId, orgId);

  // Get activities
  const activities = db.prepare(`
    SELECT a.*, u.full_name as user_name
    FROM activities a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.lead_id = ? AND a.organization_id = ?
    ORDER BY a.created_at DESC
  `).all(leadId, orgId);

  // Get handoffs
  const handoffs = db.prepare(`
    SELECT h.*, u.full_name as assigned_user_name
    FROM human_handoffs h
    LEFT JOIN users u ON h.assigned_user_id = u.id
    WHERE h.lead_id = ? AND h.organization_id = ?
    ORDER BY h.created_at DESC
  `).all(leadId, orgId);

  return res.json({
    lead,
    tasks,
    activities,
    handoffs
  });
});

// 5. Update Lead Details
leadsRouter.patch('/:id', (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const leadId = req.params.id;

  const existing = db.prepare('SELECT * FROM leads WHERE id = ? AND organization_id = ?').get(leadId, orgId) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Lead not found or access denied.' });
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    company,
    source,
    pipelineStageId,
    estimatedValue,
    assignedUserId,
    qualificationStatus,
    lostReason,
    wonReason,
    customFields
  } = req.body;

  const updates: string[] = [];
  const params: any[] = [];

  if (firstName !== undefined) { updates.push('first_name = ?'); params.push(firstName); }
  if (lastName !== undefined) { updates.push('last_name = ?'); params.push(lastName); }
  if (email !== undefined) { updates.push('email = ?'); params.push(email ? email.toLowerCase().trim() : null); }
  if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
  if (company !== undefined) { updates.push('company = ?'); params.push(company); }
  if (source !== undefined) { updates.push('source = ?'); params.push(source); }
  if (estimatedValue !== undefined) { updates.push('estimated_value = ?'); params.push(Number(estimatedValue) || 0); }
  if (assignedUserId !== undefined) { updates.push('assigned_user_id = ?'); params.push(assignedUserId || null); }
  if (qualificationStatus !== undefined) { updates.push('qualification_status = ?'); params.push(qualificationStatus); }
  if (lostReason !== undefined) { updates.push('lost_reason = ?'); params.push(lostReason); }
  if (wonReason !== undefined) { updates.push('won_reason = ?'); params.push(wonReason); }
  if (customFields !== undefined) { updates.push('custom_fields_json = ?'); params.push(JSON.stringify(customFields)); }

  // If stage changed
  if (pipelineStageId && pipelineStageId !== existing.pipeline_stage_id) {
    const stage = db.prepare('SELECT name, is_won, is_lost FROM pipeline_stages WHERE id = ? AND organization_id = ?').get(pipelineStageId, orgId) as any;
    if (!stage) {
      return res.status(400).json({ error: 'Target pipeline stage does not exist in your organization.' });
    }
    updates.push('pipeline_stage_id = ?');
    params.push(pipelineStageId);

    // Stage change audit log
    db.prepare(`
      INSERT INTO activities (id, organization_id, lead_id, user_id, action_type, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'act_' + crypto.randomUUID().slice(0, 8),
      orgId,
      leadId,
      req.user!.id,
      'stage_changed',
      `Pipeline stage changed to "${stage.name}" by ${req.user!.fullName}.`
    );
  }

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());

  params.push(leadId, orgId);

  db.prepare(`
    UPDATE leads
    SET ${updates.join(', ')}
    WHERE id = ? AND organization_id = ?
  `).run(...params);

  const updatedLead = db.prepare('SELECT * FROM leads WHERE id = ? AND organization_id = ?').get(leadId, orgId);

  return res.json({
    message: 'Lead updated successfully.',
    lead: updatedLead
  });
});

// 6. AI-Assisted Qualification on Lead
leadsRouter.post('/:id/ai-qualify', async (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const leadId = req.params.id;

  const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND organization_id = ?').get(leadId, orgId) as any;
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found or access denied.' });
  }

  const org = db.prepare('SELECT name, settings_json FROM organizations WHERE id = ?').get(orgId) as any;
  const orgSettings = JSON.parse(org?.settings_json || '{}');

  const inquiry = req.body.inquiryText || lead.ai_summary || `${lead.first_name} ${lead.last_name} from ${lead.company || 'Private Residence'} reached out via ${lead.source}.`;

  const aiResult = await analyzeAndQualifyLead({
    leadName: `${lead.first_name} ${lead.last_name}`,
    company: lead.company,
    enquiryText: inquiry,
    source: lead.source,
    industry: orgSettings.industry || 'Local Business',
    businessName: org?.name || 'Emperor CRM Business'
  });

  // Update lead with AI insights
  db.prepare(`
    UPDATE leads
    SET ai_intent = ?,
        ai_summary = ?,
        ai_confidence = ?,
        ai_urgency = ?,
        qualification_status = ?,
        updated_at = datetime('now')
    WHERE id = ? AND organization_id = ?
  `).run(
    aiResult.intent,
    `Summary: ${aiResult.intent}. Key needs: ${aiResult.keyRequirements.join(', ')}. Action: ${aiResult.suggestedNextAction}`,
    aiResult.confidenceScore,
    aiResult.urgency,
    aiResult.requiresHandoff ? 'needs_review' : 'qualified',
    leadId,
    orgId
  );

  // If AI or rule engine flags handoff, create human handoff case
  let handoffCreated = false;
  if (aiResult.requiresHandoff) {
    const handoffId = 'handoff_' + crypto.randomUUID().slice(0, 8);
    db.prepare(`
      INSERT INTO human_handoffs (
        id, organization_id, lead_id, reason, summary, next_action, priority, status, assigned_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'awaiting_action', ?)
    `).run(
      handoffId,
      orgId,
      leadId,
      aiResult.handoffReason || 'AI flagged inquiry for human review',
      `Lead ${lead.first_name} ${lead.last_name}: ${aiResult.intent}`,
      aiResult.suggestedNextAction,
      aiResult.urgency === 'urgent' ? 'urgent' : 'high',
      lead.assigned_user_id || req.user!.id
    );
    handoffCreated = true;
  }

  // Audit activity
  db.prepare(`
    INSERT INTO activities (id, organization_id, lead_id, user_id, action_type, description, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'act_' + crypto.randomUUID().slice(0, 8),
    orgId,
    leadId,
    req.user!.id,
    'ai_qualification_performed',
    `AI evaluated lead: Intent "${aiResult.intent}" (Confidence: ${Math.round(aiResult.confidenceScore * 100)}%). ${handoffCreated ? 'Human handoff case triggered.' : 'Proceeding with standard automation.'}`,
    JSON.stringify(aiResult)
  );

  return res.json({
    message: 'AI qualification completed.',
    qualification: aiResult,
    handoffCreated
  });
});

// 7. Add Manual Note to Lead Timeline
leadsRouter.post('/:id/notes', (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const leadId = req.params.id;
  const { note } = req.body;

  if (!note || !note.trim()) {
    return res.status(400).json({ error: 'Note content cannot be empty.' });
  }

  const lead = db.prepare('SELECT id FROM leads WHERE id = ? AND organization_id = ?').get(leadId, orgId);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found or access denied.' });
  }

  const actId = 'act_' + crypto.randomUUID().slice(0, 8);
  db.prepare(`
    INSERT INTO activities (id, organization_id, lead_id, user_id, action_type, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    actId,
    orgId,
    leadId,
    req.user!.id,
    'note_added',
    `${req.user!.fullName}: ${note.trim()}`
  );

  db.prepare('UPDATE leads SET updated_at = datetime("now") WHERE id = ?').run(leadId);

  return res.status(201).json({
    message: 'Note added to activity timeline.',
    activityId: actId
  });
});

// 8. Archive Lead
leadsRouter.delete('/:id', requireRole(['owner', 'admin', 'manager']), (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const leadId = req.params.id;

  const lead = db.prepare('SELECT id, first_name, last_name FROM leads WHERE id = ? AND organization_id = ?').get(leadId, orgId) as any;
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found or access denied.' });
  }

  db.prepare('UPDATE leads SET archived_at = datetime("now"), status = "archived" WHERE id = ?').run(leadId);

  db.prepare(`
    INSERT INTO activities (id, organization_id, lead_id, user_id, action_type, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'act_' + crypto.randomUUID().slice(0, 8),
    orgId,
    leadId,
    req.user!.id,
    'lead_archived',
    `Lead ${lead.first_name} ${lead.last_name} archived by ${req.user!.fullName}.`
  );

  return res.json({ message: 'Lead archived successfully.' });
});

// 9. Export Leads to CSV (Requires Admin, Owner or Manager role)
leadsRouter.get('/export/csv', requireRole(['owner', 'admin', 'manager']), (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;

  const leads = db.prepare(`
    SELECT l.id, l.first_name, l.last_name, l.email, l.phone, l.company, l.source,
           ps.name as stage, l.estimated_value, l.qualification_status, l.ai_intent,
           l.created_at, l.updated_at
    FROM leads l
    LEFT JOIN pipeline_stages ps ON l.pipeline_stage_id = ps.id
    WHERE l.organization_id = ? AND l.archived_at IS NULL
    ORDER BY l.created_at DESC
  `).all(orgId) as any[];

  const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Source', 'Stage', 'Estimated Value', 'Qualification', 'AI Intent', 'Created At'];
  const rows = leads.map(l => [
    l.id,
    `"${(l.first_name || '').replace(/"/g, '""')}"`,
    `"${(l.last_name || '').replace(/"/g, '""')}"`,
    `"${(l.email || '').replace(/"/g, '""')}"`,
    `"${(l.phone || '').replace(/"/g, '""')}"`,
    `"${(l.company || '').replace(/"/g, '""')}"`,
    `"${(l.source || '').replace(/"/g, '""')}"`,
    `"${(l.stage || '').replace(/"/g, '""')}"`,
    l.estimated_value || 0,
    `"${(l.qualification_status || '').replace(/"/g, '""')}"`,
    `"${(l.ai_intent || '').replace(/"/g, '""')}"`,
    l.created_at
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="emperor-leads-${Date.now()}.csv"`);
  return res.send(csv);
});

// 10. Import Leads from JSON/CSV rows (Requires Admin or Owner role)
leadsRouter.post('/import/batch', requireRole(['owner', 'admin']), (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const { leads } = req.body;

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: 'Valid array of lead records is required.' });
  }

  const defaultStage = db.prepare('SELECT id FROM pipeline_stages WHERE organization_id = ? ORDER BY stage_order ASC LIMIT 1').get(orgId) as any;
  const stageId = defaultStage?.id;

  const insert = db.prepare(`
    INSERT INTO leads (
      id, organization_id, first_name, last_name, email, phone, company, source,
      pipeline_stage_id, estimated_value, assigned_user_id, qualification_status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  let count = 0;
  for (const item of leads) {
    if (!item.firstName && !item.lastName) continue;
    const leadId = 'lead_' + crypto.randomUUID().slice(0, 8);
    insert.run(
      leadId,
      orgId,
      item.firstName || 'Unknown',
      item.lastName || 'Contact',
      item.email || null,
      item.phone || null,
      item.company || null,
      item.source || 'CSV Import',
      stageId,
      Number(item.estimatedValue) || 0,
      req.user!.id,
      'unqualified'
    );
    count++;
  }

  db.prepare(`
    INSERT INTO activities (id, organization_id, user_id, action_type, description)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    'act_' + crypto.randomUUID().slice(0, 8),
    orgId,
    req.user!.id,
    'leads_imported',
    `${req.user!.fullName} imported ${count} leads via batch import.`
  );

  return res.json({ message: `Successfully imported ${count} leads.`, importedCount: count });
});
