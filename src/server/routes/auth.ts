import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { signToken, requireAuth, requireRole, AuthenticatedUser } from '../auth.js';

export const authRouter = Router();

// Register new business / tenant
authRouter.post('/register', (req: Request, res: Response) => {
  const { businessName, email, password, fullName, industry = 'Local Services' } = req.body;

  if (!businessName || !email || !password || !fullName) {
    return res.status(400).json({ error: 'All fields (businessName, email, password, fullName) are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + crypto.randomBytes(3).toString('hex');
  const orgId = 'org_' + crypto.randomUUID().slice(0, 8);
  const userId = 'user_' + crypto.randomUUID().slice(0, 8);
  const passwordHash = bcrypt.hashSync(password, 10);

  try {
    // 1. Create Organization
    db.prepare(`
      INSERT INTO organizations (id, name, slug, plan, plan_limits_json, settings_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      orgId,
      businessName,
      slug,
      'growth',
      JSON.stringify({ maxUsers: 10, maxLeads: 2500, aiEnabled: true, webhooksEnabled: true, exportEnabled: true }),
      JSON.stringify({
        currency: 'USD',
        industry,
        autoAssign: true,
        requireLostReason: true
      })
    );

    // 2. Create Owner User
    db.prepare(`
      INSERT INTO users (id, organization_id, email, password_hash, full_name, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, orgId, email.toLowerCase().trim(), passwordHash, fullName, 'owner', 1);

    // 3. Create Default Pipeline Stages
    const defaultStages = [
      { name: 'New Lead', order: 1, color: '#3e67bf', won: 0, lost: 0 },
      { name: 'Contact Pending', order: 2, color: '#fca311', won: 0, lost: 0 },
      { name: 'Contacted', order: 3, color: '#fdb541', won: 0, lost: 0 },
      { name: 'Qualifying', order: 4, color: '#29447e', won: 0, lost: 0 },
      { name: 'Qualified', order: 5, color: '#10b981', won: 0, lost: 0 },
      { name: 'Estimate / Consultation', order: 6, color: '#8b5cf6', won: 0, lost: 0 },
      { name: 'Won', order: 7, color: '#22c55e', won: 1, lost: 0 },
      { name: 'Lost', order: 8, color: '#ef4444', won: 0, lost: 1 }
    ];

    let firstStageId = '';
    const insertStage = db.prepare(`
      INSERT INTO pipeline_stages (id, organization_id, name, stage_order, color, is_won, is_lost)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const s of defaultStages) {
      const sId = 'stage_' + crypto.randomUUID().slice(0, 8);
      if (s.order === 1) firstStageId = sId;
      insertStage.run(sId, orgId, s.name, s.order, s.color, s.won, s.lost);
    }

    // 4. Create Default Lead Form
    db.prepare(`
      INSERT INTO lead_forms (
        id, organization_id, title, slug, fields_config_json, is_active, auto_assign_user_id, default_pipeline_stage_id, confirmation_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'form_' + crypto.randomUUID().slice(0, 8),
      orgId,
      `${businessName} Customer Contact`,
      `${slug}-contact`,
      JSON.stringify([
        { name: 'firstName', label: 'First Name', type: 'text', required: true },
        { name: 'lastName', label: 'Last Name', type: 'text', required: true },
        { name: 'email', label: 'Email Address', type: 'email', required: true },
        { name: 'phone', label: 'Phone Number', type: 'tel', required: true },
        { name: 'company', label: 'Company / Project', type: 'text', required: false },
        { name: 'enquiry', label: 'How can we help you?', type: 'textarea', required: true }
      ]),
      1,
      userId,
      firstStageId,
      'Thank you! Your inquiry has been received. Our team will contact you shortly.'
    );

    // 5. Activity log
    db.prepare(`
      INSERT INTO activities (id, organization_id, user_id, action_type, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'act_' + crypto.randomUUID().slice(0, 8),
      orgId,
      userId,
      'organization_registered',
      `Organization "${businessName}" registered by ${fullName} (${email}).`
    );

    const userObj: AuthenticatedUser = {
      id: userId,
      organizationId: orgId,
      email: email.toLowerCase().trim(),
      fullName,
      role: 'owner'
    };

    const token = signToken(userObj);

    return res.status(201).json({
      token,
      user: userObj,
      organization: {
        id: orgId,
        name: businessName,
        slug,
        plan: 'growth'
      }
    });
  } catch (err: any) {
    console.error('[Registration error]', err);
    return res.status(500).json({ error: 'Registration failed: ' + (err.message || 'Database error') });
  }
});

// Login
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const user = db.prepare(`
    SELECT u.id, u.organization_id, u.email, u.password_hash, u.full_name, u.role, u.is_active,
           o.name as org_name, o.slug as org_slug, o.plan as org_plan, o.plan_limits_json
    FROM users u
    JOIN organizations o ON u.organization_id = o.id
    WHERE u.email = ?
  `).get(cleanEmail) as any;

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (user.is_active !== 1) {
    return res.status(403).json({ error: 'Your account has been deactivated. Please contact your organization administrator.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const authUser: AuthenticatedUser = {
    id: user.id,
    organizationId: user.organization_id,
    email: user.email,
    fullName: user.full_name,
    role: user.role
  };

  const token = signToken(authUser);

  return res.json({
    token,
    user: authUser,
    organization: {
      id: user.organization_id,
      name: user.org_name,
      slug: user.org_slug,
      plan: user.org_plan,
      planLimits: JSON.parse(user.plan_limits_json || '{}')
    }
  });
});

// Current user profile & organization details
authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = db.prepare(`
    SELECT u.id, u.organization_id, u.email, u.full_name, u.role, u.is_active,
           o.name as org_name, o.slug as org_slug, o.plan as org_plan, o.plan_limits_json, o.settings_json
    FROM users u
    JOIN organizations o ON u.organization_id = o.id
    WHERE u.id = ? AND u.organization_id = ?
  `).get(req.user!.id, req.user!.organizationId) as any;

  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  return res.json({
    user: {
      id: user.id,
      organizationId: user.organization_id,
      email: user.email,
      fullName: user.full_name,
      role: user.role
    },
    organization: {
      id: user.organization_id,
      name: user.org_name,
      slug: user.org_slug,
      plan: user.org_plan,
      planLimits: JSON.parse(user.plan_limits_json || '{}'),
      settings: JSON.parse(user.settings_json || '{}')
    }
  });
});

// List organizations available for switcher / demo exploration
authRouter.get('/organizations', (req: Request, res: Response) => {
  const orgs = db.prepare(`
    SELECT o.id, o.name, o.slug, o.plan, COUNT(u.id) as user_count
    FROM organizations o
    LEFT JOIN users u ON o.id = u.organization_id
    GROUP BY o.id
    ORDER BY o.name ASC
  `).all();

  return res.json({ organizations: orgs });
});

// Switch to organization (or login as demo user for instant live tour)
authRouter.post('/switch-org', (req: Request, res: Response) => {
  const { organizationId, targetRole } = req.body;

  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID is required.' });
  }

  let query = 'SELECT u.*, o.name as org_name, o.slug as org_slug, o.plan as org_plan, o.plan_limits_json FROM users u JOIN organizations o ON u.organization_id = o.id WHERE u.organization_id = ?';
  const params: any[] = [organizationId];

  if (targetRole) {
    query += ' AND u.role = ?';
    params.push(targetRole);
  }

  query += ' LIMIT 1';

  const user = db.prepare(query).get(...params) as any;

  if (!user) {
    return res.status(404).json({ error: 'No user account found for this organization.' });
  }

  const authUser: AuthenticatedUser = {
    id: user.id,
    organizationId: user.organization_id,
    email: user.email,
    fullName: user.full_name,
    role: user.role
  };

  const token = signToken(authUser);

  return res.json({
    token,
    user: authUser,
    organization: {
      id: user.organization_id,
      name: user.org_name,
      slug: user.org_slug,
      plan: user.org_plan,
      planLimits: JSON.parse(user.plan_limits_json || '{}')
    }
  });
});

// List organization users (strictly filtered by organization_id)
authRouter.get('/users', requireAuth, (req: Request, res: Response) => {
  const users = db.prepare(`
    SELECT id, email, full_name, role, is_active, created_at
    FROM users
    WHERE organization_id = ?
    ORDER BY created_at ASC
  `).all(req.user!.organizationId);

  return res.json({ users });
});

// Invite / add employee (Requires Admin or Owner role)
authRouter.post('/users/invite', requireAuth, requireRole(['owner', 'admin']), (req: Request, res: Response) => {
  const { email, fullName, role = 'sales_agent', temporaryPassword = 'Emperor2026!' } = req.body;

  if (!email || !fullName) {
    return res.status(400).json({ error: 'Email and full name are required.' });
  }

  const org = db.prepare('SELECT plan_limits_json FROM organizations WHERE id = ?').get(req.user!.organizationId) as any;
  const planLimits = JSON.parse(org?.plan_limits_json || '{}');
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users WHERE organization_id = ?').get(req.user!.organizationId) as any).count;

  if (planLimits.maxUsers && userCount >= planLimits.maxUsers) {
    return res.status(403).json({
      error: `Plan limit reached: Your current plan allows maximum ${planLimits.maxUsers} users. Please upgrade your subscription.`
    });
  }

  const cleanEmail = email.toLowerCase().trim();
  const existing = db.prepare('SELECT id FROM users WHERE organization_id = ? AND email = ?').get(req.user!.organizationId, cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'A team member with this email already exists in your organization.' });
  }

  const newUserId = 'user_' + crypto.randomUUID().slice(0, 8);
  const passwordHash = bcrypt.hashSync(temporaryPassword, 10);

  db.prepare(`
    INSERT INTO users (id, organization_id, email, password_hash, full_name, role, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(newUserId, req.user!.organizationId, cleanEmail, passwordHash, fullName, role);

  db.prepare(`
    INSERT INTO activities (id, organization_id, user_id, action_type, description)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    'act_' + crypto.randomUUID().slice(0, 8),
    req.user!.organizationId,
    req.user!.id,
    'user_invited',
    `${req.user!.fullName} added ${fullName} (${cleanEmail}) as role "${role}".`
  );

  return res.status(201).json({
    message: 'User invited successfully.',
    user: {
      id: newUserId,
      email: cleanEmail,
      fullName,
      role,
      isActive: 1
    }
  });
});
