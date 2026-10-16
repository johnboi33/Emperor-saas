import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { analyzeAndQualifyLead } from '../ai.js';

export const publicRouter = Router();

// 1. Get Public Form Schema by slug
publicRouter.get('/forms/:slug', (req: Request, res: Response) => {
  const { slug } = req.params;

  const form = db.prepare(`
    SELECT f.id, f.title, f.slug, f.fields_config_json, f.confirmation_message, f.is_active,
           o.name as organization_name, o.settings_json
    FROM lead_forms f
    JOIN organizations o ON f.organization_id = o.id
    WHERE f.slug = ?
  `).get(slug) as any;

  if (!form || form.is_active !== 1) {
    return res.status(404).json({ error: 'This lead capture form is currently inactive or not found.' });
  }

  const settings = JSON.parse(form.settings_json || '{}');

  return res.json({
    form: {
      id: form.id,
      title: form.title,
      slug: form.slug,
      fields: JSON.parse(form.fields_config_json || '[]'),
      confirmationMessage: form.confirmation_message,
      organizationName: form.organization_name,
      currency: settings.currency || 'USD'
    }
  });
});

// 2. Submit Public Form
publicRouter.post('/forms/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params;
  const formData = req.body;

  const form = db.prepare(`
    SELECT f.*, o.name as org_name, o.plan_limits_json, o.settings_json
    FROM lead_forms f
    JOIN organizations o ON f.organization_id = o.id
    WHERE f.slug = ?
  `).get(slug) as any;

  if (!form || form.is_active !== 1) {
    return res.status(404).json({ error: 'This form is inactive or does not exist.' });
  }

  const orgId = form.organization_id;
  const firstName = (formData.firstName || formData.first_name || 'Web').trim();
  const lastName = (formData.lastName || formData.last_name || 'Visitor').trim();
  const email = formData.email ? formData.email.trim().toLowerCase() : null;
  const phone = formData.phone ? formData.phone.trim() : null;
  const company = formData.company ? formData.company.trim() : null;
  const enquiry = formData.enquiry || formData.message || formData.description || 'Public web form submission.';
  const estimatedBudget = Number(formData.estimatedBudget || formData.budget || 0) || 0;

  // 1. Check for duplicates in same organization
  let existingLead: any = null;
  if (email || phone) {
    let checkQuery = 'SELECT id, first_name, last_name, pipeline_stage_id FROM leads WHERE organization_id = ? AND archived_at IS NULL AND (';
    const params: any[] = [orgId];
    const conds: string[] = [];
    if (email) { conds.push('LOWER(email) = ?'); params.push(email); }
    if (phone) { conds.push('phone = ?'); params.push(phone); }
    checkQuery += conds.join(' OR ') + ') LIMIT 1';
    existingLead = db.prepare(checkQuery).get(...params);
  }

  let leadId = existingLead ? existingLead.id : 'lead_' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  if (existingLead) {
    // Append activity note to existing lead without corrupting stage
    db.prepare(`
      INSERT INTO activities (id, organization_id, lead_id, action_type, description, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'act_' + crypto.randomUUID().slice(0, 8),
      orgId,
      leadId,
      'form_resubmitted',
      `Repeat submission from ${firstName} ${lastName} via form "${form.title}": "${enquiry}"`,
      JSON.stringify(formData)
    );
  } else {
    // Create new lead
    db.prepare(`
      INSERT INTO leads (
        id, organization_id, first_name, last_name, email, phone, company, source,
        pipeline_stage_id, estimated_value, assigned_user_id, qualification_status,
        ai_summary, custom_fields_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unqualified', ?, ?, ?, ?)
    `).run(
      leadId,
      orgId,
      firstName,
      lastName,
      email,
      phone,
      company,
      form.title,
      form.default_pipeline_stage_id,
      estimatedBudget,
      form.auto_assign_user_id,
      enquiry,
      JSON.stringify(formData),
      now,
      now
    );

    // Initial follow-up task
    const taskId = 'task_' + crypto.randomUUID().slice(0, 8);
    const dueDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    db.prepare(`
      INSERT INTO tasks (id, organization_id, lead_id, title, description, due_date, priority, status, assigned_user_id)
      VALUES (?, ?, ?, ?, ?, ?, 'high', 'pending', ?)
    `).run(
      taskId,
      orgId,
      leadId,
      `Respond to web inquiry: ${firstName} ${lastName}`,
      `New submission via "${form.title}": ${enquiry.slice(0, 150)}`,
      dueDate,
      form.auto_assign_user_id
    );

    // Activity log
    db.prepare(`
      INSERT INTO activities (id, organization_id, lead_id, action_type, description, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'act_' + crypto.randomUUID().slice(0, 8),
      orgId,
      leadId,
      'web_form_submitted',
      `Lead captured via form "${form.title}".`,
      JSON.stringify(formData)
    );
  }

  // 2. Perform AI-assisted qualification in background/response
  try {
    const orgSettings = JSON.parse(form.settings_json || '{}');
    const aiResult = await analyzeAndQualifyLead({
      leadName: `${firstName} ${lastName}`,
      company,
      enquiryText: enquiry,
      source: form.title,
      industry: orgSettings.industry || 'Local Services',
      businessName: form.org_name
    });

    db.prepare(`
      UPDATE leads
      SET ai_intent = ?,
          ai_confidence = ?,
          ai_urgency = ?,
          qualification_status = ?
      WHERE id = ?
    `).run(
      aiResult.intent,
      aiResult.confidenceScore,
      aiResult.urgency,
      aiResult.requiresHandoff ? 'needs_review' : 'qualified',
      leadId
    );

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
        aiResult.handoffReason || 'Inquiry flagged for human review',
        `Lead ${firstName} ${lastName}: ${aiResult.intent}`,
        aiResult.suggestedNextAction,
        aiResult.urgency === 'urgent' ? 'urgent' : 'high',
        form.auto_assign_user_id
      );
    }
  } catch (aiErr) {
    console.warn('[Public Form AI Warning]', aiErr);
  }

  return res.status(200).json({
    success: true,
    message: form.confirmation_message,
    leadId
  });
});

// 3. Webhook Integration Endpoint (for Make.com, n8n, Zapier, WhatsApp bots)
publicRouter.post('/webhook/:orgId', async (req: Request, res: Response) => {
  const { orgId } = req.params;
  const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body?.eventId || req.body?.idempotencyKey;

  const org = db.prepare('SELECT id, name FROM organizations WHERE id = ?').get(orgId) as any;
  if (!org) {
    return res.status(404).json({ error: 'Organization not found.' });
  }

  // Idempotent deduplication check
  if (idempotencyKey) {
    const existingRun = db.prepare(`
      SELECT id, status, created_at FROM integration_logs
      WHERE organization_id = ? AND idempotency_key = ?
    `).get(orgId, idempotencyKey) as any;

    if (existingRun) {
      return res.status(200).json({
        message: 'Webhook already processed (Idempotent replay suppressed).',
        previousRunId: existingRun.id,
        status: existingRun.status
      });
    }
  }

  const payload = req.body || {};
  const integrationLogId = 'int_' + crypto.randomUUID().slice(0, 8);

  try {
    const firstName = payload.firstName || payload.first_name || 'Webhook';
    const lastName = payload.lastName || payload.last_name || 'Lead';
    const email = payload.email ? payload.email.toLowerCase().trim() : null;
    const phone = payload.phone || null;
    const source = payload.source || 'External Webhook (n8n/Make)';
    const value = Number(payload.value || payload.estimatedValue || 0) || 0;

    const firstStage = db.prepare('SELECT id FROM pipeline_stages WHERE organization_id = ? ORDER BY stage_order ASC LIMIT 1').get(orgId) as any;
    const leadId = 'lead_' + crypto.randomUUID().slice(0, 8);

    db.prepare(`
      INSERT INTO leads (
        id, organization_id, first_name, last_name, email, phone, company, source,
        pipeline_stage_id, estimated_value, qualification_status, custom_fields_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unqualified', ?)
    `).run(
      leadId,
      orgId,
      firstName,
      lastName,
      email,
      phone,
      payload.company || null,
      source,
      firstStage?.id,
      value,
      JSON.stringify(payload)
    );

    // Record successful integration log
    db.prepare(`
      INSERT INTO integration_logs (
        id, organization_id, integration_name, event_type, idempotency_key, status, payload_json
      ) VALUES (?, ?, ?, ?, ?, 'success', ?)
    `).run(
      integrationLogId,
      orgId,
      payload.provider || 'Make.com / n8n',
      'lead.created',
      idempotencyKey || null,
      JSON.stringify(payload)
    );

    return res.status(200).json({
      success: true,
      message: 'Lead created via webhook.',
      leadId,
      integrationLogId
    });
  } catch (err: any) {
    // Record failed integration log
    db.prepare(`
      INSERT INTO integration_logs (
        id, organization_id, integration_name, event_type, idempotency_key, status, payload_json, error_message
      ) VALUES (?, ?, ?, ?, ?, 'failed', ?, ?)
    `).run(
      integrationLogId,
      orgId,
      payload.provider || 'Make.com / n8n',
      'lead.created',
      idempotencyKey || null,
      JSON.stringify(payload),
      err.message || 'Processing failed'
    );

    return res.status(500).json({ error: 'Webhook processing failed: ' + err.message });
  }
});
