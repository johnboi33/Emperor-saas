import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

export const pipelineRouter = Router();

pipelineRouter.use(requireAuth);

// 1. Get Pipeline Stages for current organization
pipelineRouter.get('/stages', (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;

  const stages = db.prepare(`
    SELECT ps.*,
           (SELECT COUNT(*) FROM leads WHERE pipeline_stage_id = ps.id AND archived_at IS NULL) as lead_count,
           (SELECT COALESCE(SUM(estimated_value), 0) FROM leads WHERE pipeline_stage_id = ps.id AND archived_at IS NULL) as total_value
    FROM pipeline_stages ps
    WHERE ps.organization_id = ?
    ORDER BY ps.stage_order ASC
  `).all(orgId);

  return res.json({ stages });
});

// 2. Create custom stage (Admin / Owner)
pipelineRouter.post('/stages', requireRole(['owner', 'admin']), (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const { name, color = '#fca311', isWon = 0, isLost = 0 } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Stage name is required.' });
  }

  const maxOrder = db.prepare('SELECT COALESCE(MAX(stage_order), 0) as max_order FROM pipeline_stages WHERE organization_id = ?').get(orgId) as { max_order: number };
  const newOrder = maxOrder.max_order + 1;
  const stageId = 'stage_' + crypto.randomUUID().slice(0, 8);

  db.prepare(`
    INSERT INTO pipeline_stages (id, organization_id, name, stage_order, color, is_won, is_lost)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(stageId, orgId, name.trim(), newOrder, color, isWon ? 1 : 0, isLost ? 1 : 0);

  return res.status(201).json({
    message: 'Pipeline stage created.',
    stage: { id: stageId, organization_id: orgId, name: name.trim(), stage_order: newOrder, color, is_won: isWon ? 1 : 0, is_lost: isLost ? 1 : 0 }
  });
});

// 3. Reorder stages (Admin / Owner)
pipelineRouter.put('/stages/reorder', requireRole(['owner', 'admin']), (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const { stageIds } = req.body;

  if (!Array.isArray(stageIds)) {
    return res.status(400).json({ error: 'Array of stageIds is required.' });
  }

  const update = db.prepare('UPDATE pipeline_stages SET stage_order = ? WHERE id = ? AND organization_id = ?');

  stageIds.forEach((id: string, index: number) => {
    update.run(index + 1, id, orgId);
  });

  return res.json({ message: 'Stages reordered successfully.' });
});

// 4. Update stage details
pipelineRouter.patch('/stages/:id', requireRole(['owner', 'admin']), (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const stageId = req.params.id;
  const { name, color, isWon, isLost } = req.body;

  const existing = db.prepare('SELECT * FROM pipeline_stages WHERE id = ? AND organization_id = ?').get(stageId, orgId);
  if (!existing) {
    return res.status(404).json({ error: 'Stage not found.' });
  }

  const updates: string[] = [];
  const params: any[] = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
  if (color !== undefined) { updates.push('color = ?'); params.push(color); }
  if (isWon !== undefined) { updates.push('is_won = ?'); params.push(isWon ? 1 : 0); }
  if (isLost !== undefined) { updates.push('is_lost = ?'); params.push(isLost ? 1 : 0); }

  params.push(stageId, orgId);

  db.prepare(`UPDATE pipeline_stages SET ${updates.join(', ')} WHERE id = ? AND organization_id = ?`).run(...params);

  return res.json({ message: 'Stage updated.' });
});

// 5. Delete stage (Only if no active leads)
pipelineRouter.delete('/stages/:id', requireRole(['owner', 'admin']), (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const stageId = req.params.id;

  const leadCount = (db.prepare('SELECT COUNT(*) as count FROM leads WHERE pipeline_stage_id = ? AND organization_id = ? AND archived_at IS NULL').get(stageId, orgId) as any).count;
  if (leadCount > 0) {
    return res.status(400).json({
      error: `Cannot delete stage: It contains ${leadCount} active leads. Please move the leads to another stage first.`
    });
  }

  db.prepare('DELETE FROM pipeline_stages WHERE id = ? AND organization_id = ?').run(stageId, orgId);

  return res.json({ message: 'Stage deleted successfully.' });
});

// 6. Transition Lead Stage with audit record and won/lost validation
pipelineRouter.post('/leads/:leadId/transition', (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const leadId = req.params.leadId;
  const { targetStageId, reason } = req.body;

  if (!targetStageId) {
    return res.status(400).json({ error: 'Target stage ID is required.' });
  }

  const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND organization_id = ?').get(leadId, orgId) as any;
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found or access denied.' });
  }

  const targetStage = db.prepare('SELECT * FROM pipeline_stages WHERE id = ? AND organization_id = ?').get(targetStageId, orgId) as any;
  if (!targetStage) {
    return res.status(404).json({ error: 'Target stage does not exist in your pipeline.' });
  }

  // Validate won / lost reasons if mandatory
  const org = db.prepare('SELECT settings_json FROM organizations WHERE id = ?').get(orgId) as any;
  const settings = JSON.parse(org?.settings_json || '{}');

  if (targetStage.is_lost && settings.requireLostReason && (!reason || !reason.trim())) {
    return res.status(400).json({ error: 'A reason is required when marking a lead as Lost.' });
  }

  // Prevent conflicting automated actions if a human is currently handling an active handoff
  const activeHandoff = db.prepare('SELECT id FROM human_handoffs WHERE lead_id = ? AND status = "awaiting_action"').get(leadId);
  if (activeHandoff && req.body.isAutomated) {
    return res.status(409).json({
      error: 'Automation paused: This lead is currently locked under an active human handoff review.'
    });
  }

  const updates: string[] = ['pipeline_stage_id = ?', 'updated_at = datetime("now")'];
  const params: any[] = [targetStageId];

  if (targetStage.is_lost) {
    updates.push('lost_reason = ?');
    params.push(reason || 'Closed / Lost');
  } else if (targetStage.is_won) {
    updates.push('won_reason = ?');
    params.push(reason || 'Deal won and signed');
  }

  params.push(leadId, orgId);

  db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ? AND organization_id = ?`).run(...params);

  // Log transition activity
  db.prepare(`
    INSERT INTO activities (id, organization_id, lead_id, user_id, action_type, description, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'act_' + crypto.randomUUID().slice(0, 8),
    orgId,
    leadId,
    req.user!.id,
    'pipeline_transition',
    `Moved to "${targetStage.name}" by ${req.user!.fullName}${reason ? ` (Reason: ${reason})` : ''}.`,
    JSON.stringify({ fromStageId: lead.pipeline_stage_id, toStageId: targetStageId, reason })
  );

  return res.json({
    message: `Lead successfully moved to ${targetStage.name}.`,
    targetStageId
  });
});
