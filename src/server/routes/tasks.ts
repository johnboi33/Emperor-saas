import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

// 1. List Tasks with filtering
tasksRouter.get('/', (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const { leadId, assignedTo, status, overdueOnly } = req.query;

  let query = `
    SELECT t.*,
           l.first_name as lead_first_name, l.last_name as lead_last_name, l.company as lead_company,
           u.full_name as assigned_user_name
    FROM tasks t
    LEFT JOIN leads l ON t.lead_id = l.id
    LEFT JOIN users u ON t.assigned_user_id = u.id
    WHERE t.organization_id = ?
  `;
  const params: any[] = [orgId];

  if (leadId) {
    query += ' AND t.lead_id = ?';
    params.push(leadId);
  }

  if (assignedTo && assignedTo !== 'all') {
    query += ' AND t.assigned_user_id = ?';
    params.push(assignedTo);
  }

  if (status && status !== 'all') {
    query += ' AND t.status = ?';
    params.push(status);
  }

  if (overdueOnly === 'true') {
    query += ' AND t.status = "pending" AND t.due_date < date("now")';
  }

  query += ' ORDER BY CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END, t.due_date ASC, t.created_at DESC';

  const tasks = db.prepare(query).all(...params);

  // Return counts for summary widgets
  const counts = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN status = 'pending' AND due_date < date('now') THEN 1 ELSE 0 END) as overdue_count,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count
    FROM tasks
    WHERE organization_id = ?
  `).get(orgId);

  return res.json({ tasks, counts });
});

// 2. Create Task
tasksRouter.post('/', (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const { leadId, title, description, dueDate, priority = 'medium', assignedUserId } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Task title is required.' });
  }

  // Idempotency: avoid creating identical duplicate pending tasks for the same lead within 5 minutes
  if (leadId) {
    const duplicate = db.prepare(`
      SELECT id FROM tasks 
      WHERE organization_id = ? AND lead_id = ? AND title = ? AND status = 'pending' 
        AND datetime(created_at) > datetime('now', '-5 minutes')
    `).get(orgId, leadId, title.trim());

    if (duplicate) {
      return res.status(200).json({ message: 'Task already exists (deduplicated).', taskId: (duplicate as any).id });
    }
  }

  const taskId = 'task_' + crypto.randomUUID().slice(0, 8);

  db.prepare(`
    INSERT INTO tasks (id, organization_id, lead_id, title, description, due_date, priority, status, assigned_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    taskId,
    orgId,
    leadId || null,
    title.trim(),
    description || null,
    dueDate || null,
    priority,
    assignedUserId || req.user!.id
  );

  if (leadId) {
    db.prepare(`
      INSERT INTO activities (id, organization_id, lead_id, user_id, action_type, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'act_' + crypto.randomUUID().slice(0, 8),
      orgId,
      leadId,
      req.user!.id,
      'task_created',
      `Task "${title.trim()}" created by ${req.user!.fullName} (Due: ${dueDate || 'No due date'}).`
    );
  }

  return res.status(201).json({
    message: 'Task created successfully.',
    taskId
  });
});

// 3. Update Task Status or Details
tasksRouter.patch('/:id', (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const taskId = req.params.id;
  const { status, title, description, dueDate, priority, assignedUserId } = req.body;

  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND organization_id = ?').get(taskId, orgId) as any;
  if (!task) {
    return res.status(404).json({ error: 'Task not found or access denied.' });
  }

  const updates: string[] = [];
  const params: any[] = [];

  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
    if (status === 'completed') {
      updates.push('completed_at = datetime("now")');
    } else {
      updates.push('completed_at = NULL');
    }
  }

  if (title !== undefined) { updates.push('title = ?'); params.push(title.trim()); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (dueDate !== undefined) { updates.push('due_date = ?'); params.push(dueDate); }
  if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
  if (assignedUserId !== undefined) { updates.push('assigned_user_id = ?'); params.push(assignedUserId || null); }

  params.push(taskId, orgId);

  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND organization_id = ?`).run(...params);

  if (task.lead_id && status === 'completed') {
    db.prepare(`
      INSERT INTO activities (id, organization_id, lead_id, user_id, action_type, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'act_' + crypto.randomUUID().slice(0, 8),
      orgId,
      task.lead_id,
      req.user!.id,
      'task_completed',
      `Task "${task.title}" marked as completed by ${req.user!.fullName}.`
    );
  }

  return res.json({ message: 'Task updated successfully.' });
});

// 4. Delete Task
tasksRouter.delete('/:id', (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const taskId = req.params.id;

  db.prepare('DELETE FROM tasks WHERE id = ? AND organization_id = ?').run(taskId, orgId);

  return res.json({ message: 'Task deleted successfully.' });
});
