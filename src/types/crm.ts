export type UserRole = 'owner' | 'admin' | 'manager' | 'sales_agent' | 'operations';

export interface User {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive?: number;
  createdAt?: string;
}

export interface PlanLimits {
  maxUsers: number;
  maxLeads: number;
  aiEnabled: boolean;
  webhooksEnabled: boolean;
  exportEnabled: boolean;
}

export interface OrganizationSettings {
  currency?: string;
  industry?: string;
  phone?: string;
  autoAssign?: boolean;
  requireLostReason?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'growth' | 'pro' | 'enterprise';
  planLimits: PlanLimits;
  settings?: OrganizationSettings;
  userCount?: number;
  leadCount?: number;
  createdAt?: string;
}

export interface PipelineStage {
  id: string;
  organization_id: string;
  name: string;
  stage_order: number;
  color: string;
  is_won: number;
  is_lost: number;
  lead_count?: number;
  total_value?: number;
}

export interface Lead {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  status: string;
  pipeline_stage_id: string;
  stage_name?: string;
  stage_color?: string;
  stage_order?: number;
  is_won?: number;
  is_lost?: number;
  estimated_value: number;
  assigned_user_id: string | null;
  assigned_user_name?: string;
  qualification_status: 'unqualified' | 'in_progress' | 'qualified' | 'needs_review' | 'disqualified';
  ai_intent?: string | null;
  ai_summary?: string | null;
  ai_confidence?: number | null;
  ai_urgency?: 'low' | 'medium' | 'high' | 'urgent' | null;
  lost_reason?: string | null;
  won_reason?: string | null;
  custom_fields_json?: string | null;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  pending_tasks_count?: number;
  active_handoffs_count?: number;
}

export interface Task {
  id: string;
  organization_id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'completed' | 'cancelled';
  assigned_user_id: string | null;
  assigned_user_name?: string;
  lead_first_name?: string;
  lead_last_name?: string;
  lead_company?: string;
  completed_at?: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  organization_id: string;
  lead_id: string | null;
  user_id: string | null;
  user_name?: string;
  first_name?: string;
  last_name?: string;
  action_type: string;
  description: string;
  metadata_json?: string | null;
  created_at: string;
}

export interface HumanHandoff {
  id: string;
  organization_id: string;
  lead_id: string;
  first_name?: string;
  last_name?: string;
  lead_email?: string;
  lead_phone?: string;
  lead_company?: string;
  reason: string;
  summary: string;
  next_action: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'awaiting_action' | 'in_review' | 'resolved';
  assigned_user_id: string | null;
  assigned_user_name?: string;
  resolution_notes?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface LeadFormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'number' | 'select';
  required: boolean;
  options?: string[];
}

export interface LeadForm {
  id: string;
  organization_id: string;
  title: string;
  slug: string;
  fields_config_json: string;
  is_active: number;
  auto_assign_user_id: string | null;
  auto_assign_user_name?: string;
  default_pipeline_stage_id: string;
  default_stage_name?: string;
  confirmation_message: string;
  submissions_count?: number;
  created_at: string;
}

export interface IntegrationLog {
  id: string;
  integration_name: string;
  event_type: string;
  status: 'success' | 'failed';
  error_message?: string | null;
  created_at: string;
}
