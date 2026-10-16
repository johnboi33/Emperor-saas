import {
  User,
  Organization,
  Lead,
  PipelineStage,
  Task,
  Activity,
  HumanHandoff,
  LeadForm,
  IntegrationLog
} from '../types/crm.js';

const TOKEN_KEY = 'emperor_crm_auth_token';

export const api = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    if (response.status === 401 && !endpoint.includes('/api/auth/login')) {
      // Session invalid or expired
      this.clearToken();
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.error || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data as T;
  },

  // Auth & Organizations
  auth: {
    async register(data: { businessName: string; email: string; password: string; fullName: string; industry?: string }) {
      return api.request<{ token: string; user: User; organization: Organization }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async login(data: { email: string; password: string }) {
      return api.request<{ token: string; user: User; organization: Organization }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async me() {
      return api.request<{ user: User; organization: Organization }>('/api/auth/me');
    },

    async getOrganizations() {
      return api.request<{ organizations: Array<{ id: string; name: string; slug: string; plan: string; user_count: number }> }>('/api/auth/organizations');
    },

    async switchOrg(organizationId: string, targetRole?: string) {
      return api.request<{ token: string; user: User; organization: Organization }>('/api/auth/switch-org', {
        method: 'POST',
        body: JSON.stringify({ organizationId, targetRole })
      });
    },

    async getUsers() {
      return api.request<{ users: User[] }>('/api/auth/users');
    },

    async inviteUser(data: { email: string; fullName: string; role: string; temporaryPassword?: string }) {
      return api.request<{ message: string; user: User }>('/api/auth/users/invite', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  },

  // Leads
  leads: {
    async list(params: { search?: string; stageId?: string; source?: string; assignedTo?: string; status?: string; page?: number; limit?: number }) {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set('search', params.search);
      if (params.stageId) searchParams.set('stageId', params.stageId);
      if (params.source) searchParams.set('source', params.source);
      if (params.assignedTo) searchParams.set('assignedTo', params.assignedTo);
      if (params.status) searchParams.set('status', params.status);
      if (params.page) searchParams.set('page', params.page.toString());
      if (params.limit) searchParams.set('limit', params.limit.toString());

      return api.request<{ leads: Lead[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(`/api/leads?${searchParams.toString()}`);
    },

    async checkDuplicate(email?: string, phone?: string, excludeId?: string) {
      const searchParams = new URLSearchParams();
      if (email) searchParams.set('email', email);
      if (phone) searchParams.set('phone', phone);
      if (excludeId) searchParams.set('excludeId', excludeId);

      return api.request<{ isDuplicate: boolean; duplicates: Lead[] }>(`/api/leads/check-duplicate?${searchParams.toString()}`);
    },

    async create(data: Partial<Lead> & { enquiryText?: string; customFields?: any }) {
      return api.request<{ message: string; lead: Lead }>('/api/leads', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async get(id: string) {
      return api.request<{ lead: Lead; tasks: Task[]; activities: Activity[]; handoffs: HumanHandoff[] }>(`/api/leads/${id}`);
    },

    async update(id: string, data: Partial<Lead> & { customFields?: any }) {
      return api.request<{ message: string; lead: Lead }>(`/api/leads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    },

    async qualifyAi(id: string, inquiryText?: string) {
      return api.request<{ message: string; qualification: any; handoffCreated: boolean }>(`/api/leads/${id}/ai-qualify`, {
        method: 'POST',
        body: JSON.stringify({ inquiryText })
      });
    },

    async addNote(id: string, note: string) {
      return api.request<{ message: string; activityId: string }>(`/api/leads/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note })
      });
    },

    async archive(id: string) {
      return api.request<{ message: string }>(`/api/leads/${id}`, {
        method: 'DELETE'
      });
    },

    async importBatch(leads: any[]) {
      return api.request<{ message: string; importedCount: number }>('/api/leads/import/batch', {
        method: 'POST',
        body: JSON.stringify({ leads })
      });
    }
  },

  // Pipeline
  pipeline: {
    async getStages() {
      return api.request<{ stages: PipelineStage[] }>('/api/pipeline/stages');
    },

    async createStage(data: { name: string; color?: string; isWon?: number; isLost?: number }) {
      return api.request<{ message: string; stage: PipelineStage }>('/api/pipeline/stages', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async reorderStages(stageIds: string[]) {
      return api.request<{ message: string }>('/api/pipeline/stages/reorder', {
        method: 'PUT',
        body: JSON.stringify({ stageIds })
      });
    },

    async updateStage(id: string, data: Partial<PipelineStage>) {
      return api.request<{ message: string }>(`/api/pipeline/stages/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    },

    async deleteStage(id: string) {
      return api.request<{ message: string }>(`/api/pipeline/stages/${id}`, {
        method: 'DELETE'
      });
    },

    async transitionLead(leadId: string, targetStageId: string, reason?: string) {
      return api.request<{ message: string; targetStageId: string }>(`/api/pipeline/leads/${leadId}/transition`, {
        method: 'POST',
        body: JSON.stringify({ targetStageId, reason })
      });
    }
  },

  // Tasks
  tasks: {
    async list(params: { leadId?: string; assignedTo?: string; status?: string; overdueOnly?: boolean } = {}) {
      const searchParams = new URLSearchParams();
      if (params.leadId) searchParams.set('leadId', params.leadId);
      if (params.assignedTo) searchParams.set('assignedTo', params.assignedTo);
      if (params.status) searchParams.set('status', params.status);
      if (params.overdueOnly) searchParams.set('overdueOnly', 'true');

      return api.request<{ tasks: Task[]; counts: { total: number; pending_count: number; overdue_count: number; completed_count: number } }>(`/api/tasks?${searchParams.toString()}`);
    },

    async create(data: { leadId?: string; title: string; description?: string; dueDate?: string; priority?: string; assignedUserId?: string }) {
      return api.request<{ message: string; taskId: string }>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async update(id: string, data: Partial<Task>) {
      return api.request<{ message: string }>(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    },

    async delete(id: string) {
      return api.request<{ message: string }>(`/api/tasks/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Handoffs
  handoffs: {
    async list(status: 'active' | 'resolved' = 'active') {
      return api.request<{ handoffs: HumanHandoff[]; activeCount: number }>(`/api/handoffs?status=${status}`);
    },

    async create(data: { leadId: string; reason: string; summary: string; nextAction?: string; priority?: string; assignedUserId?: string }) {
      return api.request<{ message: string; handoffId: string }>('/api/handoffs', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async claim(id: string) {
      return api.request<{ message: string }>(`/api/handoffs/${id}/claim`, {
        method: 'PATCH'
      });
    },

    async resolve(id: string, resolutionNotes: string) {
      return api.request<{ message: string }>(`/api/handoffs/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolutionNotes })
      });
    }
  },

  // Forms
  forms: {
    async list() {
      return api.request<{ forms: LeadForm[] }>('/api/forms');
    },

    async create(data: { title: string; slug?: string; fieldsConfig: any[]; defaultPipelineStageId: string; autoAssignUserId?: string; confirmationMessage?: string }) {
      return api.request<{ message: string; formId: string; slug: string }>('/api/forms', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  },

  // Public Form Submissions & Webhook Simulations
  public: {
    async getForm(slug: string) {
      return api.request<{ form: any }>(`/api/public/forms/${slug}`);
    },

    async submitForm(slug: string, data: any) {
      return api.request<{ success: boolean; message: string; leadId: string }>(`/api/public/forms/${slug}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async simulateWebhook(orgId: string, payload: any, idempotencyKey?: string) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idempotencyKey) {
        headers['X-Idempotency-Key'] = idempotencyKey;
      }
      return fetch(`/api/public/webhook/${orgId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      }).then(r => r.json());
    }
  },

  // Dashboard Stats
  dashboard: {
    async getStats() {
      return api.request<{
        metrics: {
          totalLeads: number;
          totalPipelineValue: number;
          wonValue: number;
          wonCount: number;
          lostCount: number;
          conversionRate: number;
          overdueTasks: number;
          pendingTasks: number;
          activeHandoffs: number;
        };
        stageBreakdown: PipelineStage[];
        sourceBreakdown: Array<{ source: string; count: number; total_value: number }>;
        recentActivities: Activity[];
        recentIntegrations: IntegrationLog[];
      }>('/api/dashboard/stats');
    }
  },

  // Organization Settings
  organization: {
    async current() {
      return api.request<{ organization: Organization }>('/api/organization/current');
    },

    async updateSettings(data: any) {
      return api.request<{ message: string; settings: any }>('/api/organization/settings', {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    },

    async updatePlan(plan: string) {
      return api.request<{ message: string; plan: string; planLimits: any }>('/api/organization/plan', {
        method: 'POST',
        body: JSON.stringify({ plan })
      });
    }
  },

  // System Test Suite
  systemTest: {
    async run() {
      return api.request<{
        summary: { total: number; passed: number; failed: number; allPassed: boolean; executedAt: string };
        results: Array<{ name: string; category: string; status: 'passed' | 'failed'; message: string; durationMs: number }>;
      }>('/api/system-test/run', {
        method: 'POST'
      });
    }
  }
};
