import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

export const formsRouter = Router();

formsRouter.use(requireAuth);

// 1. List Forms for current organization
formsRouter.get('/', (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;

  const forms = db.prepare(`
    SELECT f.*,
           ps.name as default_stage_name,
           u.full_name as auto_assign_user_name,
           (SELECT COUNT(*) FROM leads WHERE source = f.title AND organization_id = ?) as submissions_count
    FROM lead_forms f
    LEFT JOIN pipeline_stages ps ON f.default_pipeline_stage_id = ps.id
    LEFT JOIN users u ON f.auto_assign_user_id = u.id
    WHERE f.organization_id = ?
    ORDER BY f.created_at DESC
  `).all(orgId, orgId);

  return res.json({ forms });
});

// 2. Create or Update Form
formsRouter.post('/', requireRole(['owner', 'admin']), (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const { title, slug, fieldsConfig, autoAssignUserId, defaultPipelineStageId, confirmationMessage } = req.body;

  if (!title || !defaultPipelineStageId) {
    return res.status(400).json({ error: 'Form title and default pipeline stage are required.' });
  }

  const cleanSlug = (slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const formId = 'form_' + crypto.randomUUID().slice(0, 8);

  const existingSlug = db.prepare('SELECT id FROM lead_forms WHERE organization_id = ? AND slug = ?').get(orgId, cleanSlug);
  if (existingSlug) {
    return res.status(400).json({ error: 'A form with this slug already exists in your organization.' });
  }

  db.prepare(`
    INSERT INTO lead_forms (
      id, organization_id, title, slug, fields_config_json, is_active, auto_assign_user_id, default_pipeline_stage_id, confirmation_message
    ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).run(
    formId,
    orgId,
    title.trim(),
    cleanSlug,
    JSON.stringify(fieldsConfig || []),
    autoAssignUserId || null,
    defaultPipelineStageId,
    confirmationMessage || 'Thank you! Your information has been received.'
  );

  return res.status(201).json({ message: 'Form created successfully.', formId, slug: cleanSlug });
});
