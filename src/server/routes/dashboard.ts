import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get('/stats', (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;

  // 1. Overall counts & values
  const leadStats = db.prepare(`
    SELECT 
      COUNT(*) as total_leads,
      COALESCE(SUM(estimated_value), 0) as total_pipeline_value,
      COALESCE(SUM(CASE WHEN ps.is_won = 1 THEN estimated_value ELSE 0 END), 0) as won_value,
      COALESCE(SUM(CASE WHEN ps.is_won = 1 THEN 1 ELSE 0 END), 0) as won_count,
      COALESCE(SUM(CASE WHEN ps.is_lost = 1 THEN 1 ELSE 0 END), 0) as lost_count
    FROM leads l
    LEFT JOIN pipeline_stages ps ON l.pipeline_stage_id = ps.id
    WHERE l.organization_id = ? AND l.archived_at IS NULL
  `).get(orgId) as any;

  const totalClosed = (leadStats.won_count || 0) + (leadStats.lost_count || 0);
  const conversionRate = totalClosed > 0 ? Math.round(((leadStats.won_count || 0) / totalClosed) * 100) : 0;

  // 2. Tasks stats
  const taskStats = db.prepare(`
    SELECT 
      COUNT(*) as total_tasks,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
      SUM(CASE WHEN status = 'pending' AND due_date < date('now') THEN 1 ELSE 0 END) as overdue_tasks
    FROM tasks
    WHERE organization_id = ?
  `).get(orgId) as any;

  // 3. Active Handoffs
  const handoffStats = db.prepare(`
    SELECT COUNT(*) as active_handoffs
    FROM human_handoffs
    WHERE organization_id = ? AND status != 'resolved'
  `).get(orgId) as any;

  // 4. Breakdown by Pipeline Stage
  const stageBreakdown = db.prepare(`
    SELECT 
      ps.id, ps.name, ps.color, ps.stage_order, ps.is_won, ps.is_lost,
      COUNT(l.id) as lead_count,
      COALESCE(SUM(l.estimated_value), 0) as total_value
    FROM pipeline_stages ps
    LEFT JOIN leads l ON ps.id = l.pipeline_stage_id AND l.archived_at IS NULL
    WHERE ps.organization_id = ?
    GROUP BY ps.id
    ORDER BY ps.stage_order ASC
  `).all(orgId);

  // 5. Breakdown by Source
  const sourceBreakdown = db.prepare(`
    SELECT source, COUNT(*) as count, COALESCE(SUM(estimated_value), 0) as total_value
    FROM leads
    WHERE organization_id = ? AND archived_at IS NULL
    GROUP BY source
    ORDER BY count DESC
  `).all(orgId);

  // 6. Recent Activities
  const recentActivities = db.prepare(`
    SELECT a.*, u.full_name as user_name, l.first_name, l.last_name
    FROM activities a
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN leads l ON a.lead_id = l.id
    WHERE a.organization_id = ?
    ORDER BY a.created_at DESC
    LIMIT 10
  `).all(orgId);

  // 7. Recent Integration Logs
  const recentIntegrations = db.prepare(`
    SELECT id, integration_name, event_type, status, error_message, created_at
    FROM integration_logs
    WHERE organization_id = ?
    ORDER BY created_at DESC
    LIMIT 5
  `).all(orgId);

  return res.json({
    metrics: {
      totalLeads: leadStats.total_leads || 0,
      totalPipelineValue: leadStats.total_pipeline_value || 0,
      wonValue: leadStats.won_value || 0,
      wonCount: leadStats.won_count || 0,
      lostCount: leadStats.lost_count || 0,
      conversionRate,
      overdueTasks: taskStats.overdue_tasks || 0,
      pendingTasks: taskStats.pending_tasks || 0,
      activeHandoffs: handoffStats.active_handoffs || 0
    },
    stageBreakdown,
    sourceBreakdown,
    recentActivities,
    recentIntegrations
  });
});
