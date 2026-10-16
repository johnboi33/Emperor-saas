import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

export const handoffsRouter = Router();

handoffsRouter.use(requireAuth);

// 1. List Human Handoffs for current organization
handoffsRouter.get('/', (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const { status = 'active' } = req.query;

  let query = `
    SELECT h.*,
           l.first_name, l.last_name, l.email as lead_email, l.phone as lead_phone, l.company as lead_company,
           u.full_name as assigned_user_name
    FROM human_handoffs h
    JOIN leads l ON h.lead_id = l.id
    LEFT JOIN users u ON h.assigned_user_id = u.id
    WHERE h.organization_id = ?
  `;
  const params: any[] = [orgId];

  if (status === 'active') {
    query += ' AND h.status != "resolved"';
  } else if (status === 'resolved') {
    query += ' AND h.status = "resolved"';
  }

  query += ' ORDER BY CASE WHEN h.priority = "urgent" THEN 1 WHEN h.priority = "high" THEN 2 ELSE 3 END, h.created_at DESC';

  const handoffs = db.prepare(query).all(...params);

  const activeCount = (db.prepare('SELECT COUNT(*) as count FROM human_handoffs WHERE organization_id = ? AND status != "resolved"').get(orgId) as any).count;

  return res.json({ handoffs, activeCount });
});

// 2. Create Manual Human Handoff
handoffsRouter.post('/', (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const { leadId, reason, summary, nextAction, priority = 'high', assignedUserId } = req.body;

  if (!leadId || !reason || !summary) {
    return res.status(400).json({ error: 'leadId, reason, and summary are required for human handoff.' });
  }

  const lead = db.prepare('SELECT first_name, last_name FROM leads WHERE id = ? AND organization_id = ?').get(leadId, orgId) as any;
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found or access denied.' });
  }

  const handoffId = 'handoff_' + crypto.randomUUID().slice(0, 8);

  db.prepare(`
    INSERT INTO human_handoffs (
      id, organization_id, lead_id, reason, summary, next_action, priority, status, assigned_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'awaiting_action', ?)
  `).run(
    handoffId,
    orgId,
    leadId,
    reason,
    summary,
    nextAction || 'Review case and contact customer directly',
    priority,
    assignedUserId || req.user!.id
  );

  // Activity record
  db.prepare(`
    INSERT INTO activities (id, organization_id, lead_id, user_id, action_type, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'act_' + crypto.randomUUID().slice(0, 8),
    orgId,
    leadId,
    req.user!.id,
    'human_handoff_escalated',
    `Escalated to Human Review: "${reason}". Automation paused on this lead until resolved.`
  );

  return res.status(201).json({
    message: 'Handoff created. Automation safely paused.',
    handoffId
  });
});

// 3. Take ownership (claim)
handoffsRouter.patch('/:id/claim', (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const handoffId = req.params.id;

  const handoff = db.prepare('SELECT * FROM human_handoffs WHERE id = ? AND organization_id = ?').get(handoffId, orgId) as any;
  if (!handoff) {
    return res.status(404).json({ error: 'Handoff record not found.' });
  }

  db.prepare(`
    UPDATE human_handoffs
    SET assigned_user_id = ?, status = 'in_review'
    WHERE id = ? AND organization_id = ?
  `).run(req.user!.id, handoffId, orgId);

  db.prepare(`
    INSERT INTO activities (id, organization_id, lead_id, user_id, action_type, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'act_' + crypto.randomUUID().slice(0, 8),
    orgId,
    handoff.lead_id,
    req.user!.id,
    'handoff_claimed',
    `${req.user!.fullName} took ownership of human handoff case.`
  );

  return res.json({ message: 'You have taken ownership of this case.' });
});

// 4. Resolve Handoff & Resume Automation
handoffsRouter.post('/:id/resolve', (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const handoffId = req.params.id;
  const { resolutionNotes } = req.body;

  if (!resolutionNotes || !resolutionNotes.trim()) {
    return res.status(400).json({ error: 'Resolution notes are required to resolve a handoff.' });
  }

  const handoff = db.prepare('SELECT * FROM human_handoffs WHERE id = ? AND organization_id = ?').get(handoffId, orgId) as any;
  if (!handoff) {
    return res.status(404).json({ error: 'Handoff record not found.' });
  }

  db.prepare(`
    UPDATE human_handoffs
    SET status = 'resolved',
        resolution_notes = ?,
        resolved_at = datetime('now')
    WHERE id = ? AND organization_id = ?
  `).run(resolutionNotes.trim(), handoffId, orgId);

  db.prepare(`
    INSERT INTO activities (id, organization_id, lead_id, user_id, action_type, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'act_' + crypto.randomUUID().slice(0, 8),
    orgId,
    handoff.lead_id,
    req.user!.id,
    'handoff_resolved',
    `Human handoff resolved by ${req.user!.fullName}. Notes: "${resolutionNotes.trim()}". Safe automation resumed.`
  );

  return res.json({ message: 'Handoff resolved successfully. Standard workflows resumed.' });
});
