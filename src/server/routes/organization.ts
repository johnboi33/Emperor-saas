import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

export const organizationRouter = Router();

organizationRouter.use(requireAuth);

// Get current organization
organizationRouter.get('/current', (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;

  const org = db.prepare(`
    SELECT o.*,
           (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as user_count,
           (SELECT COUNT(*) FROM leads WHERE organization_id = o.id AND archived_at IS NULL) as lead_count
    FROM organizations o
    WHERE o.id = ?
  `).get(orgId) as any;

  if (!org) {
    return res.status(404).json({ error: 'Organization not found.' });
  }

  return res.json({
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      planLimits: JSON.parse(org.plan_limits_json || '{}'),
      settings: JSON.parse(org.settings_json || '{}'),
      userCount: org.user_count,
      leadCount: org.lead_count,
      createdAt: org.created_at
    }
  });
});

// Update organization settings (Owner or Admin)
organizationRouter.patch('/settings', requireRole(['owner', 'admin']), (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const { name, currency, industry, phone, autoAssign, requireLostReason } = req.body;

  const org = db.prepare('SELECT settings_json FROM organizations WHERE id = ?').get(orgId) as any;
  const currentSettings = JSON.parse(org?.settings_json || '{}');

  const updatedSettings = {
    ...currentSettings,
    ...(currency !== undefined ? { currency } : {}),
    ...(industry !== undefined ? { industry } : {}),
    ...(phone !== undefined ? { phone } : {}),
    ...(autoAssign !== undefined ? { autoAssign: Boolean(autoAssign) } : {}),
    ...(requireLostReason !== undefined ? { requireLostReason: Boolean(requireLostReason) } : {})
  };

  const updates: string[] = ['settings_json = ?'];
  const params: any[] = [JSON.stringify(updatedSettings)];

  if (name && name.trim()) {
    updates.push('name = ?');
    params.push(name.trim());
  }

  params.push(orgId);

  db.prepare(`UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  return res.json({
    message: 'Organization settings updated successfully.',
    settings: updatedSettings
  });
});

// Switch or upgrade subscription plan tier (Owner only)
organizationRouter.post('/plan', requireRole(['owner']), (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const { plan } = req.body;

  const validPlans: Record<string, any> = {
    starter: { maxUsers: 3, maxLeads: 250, aiEnabled: false, webhooksEnabled: false, exportEnabled: false },
    growth: { maxUsers: 15, maxLeads: 5000, aiEnabled: true, webhooksEnabled: true, exportEnabled: true },
    pro: { maxUsers: 50, maxLeads: 25000, aiEnabled: true, webhooksEnabled: true, exportEnabled: true },
    enterprise: { maxUsers: 250, maxLeads: 100000, aiEnabled: true, webhooksEnabled: true, exportEnabled: true }
  };

  if (!validPlans[plan]) {
    return res.status(400).json({ error: 'Invalid plan selected. Choose starter, growth, pro, or enterprise.' });
  }

  const limits = validPlans[plan];

  db.prepare(`
    UPDATE organizations
    SET plan = ?, plan_limits_json = ?
    WHERE id = ?
  `).run(plan, JSON.stringify(limits), orgId);

  return res.json({
    message: `Plan upgraded to ${plan.toUpperCase()} successfully.`,
    plan,
    planLimits: limits
  });
});
