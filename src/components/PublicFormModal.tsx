import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import {
  FileText,
  X,
  Send,
  CheckCircle2,
  Building,
  Phone,
  Mail,
  DollarSign
} from 'lucide-react';

interface PublicFormModalProps {
  onClose: () => void;
  onLeadCaptured?: () => void;
}

export const PublicFormModal: React.FC<PublicFormModalProps> = ({ onClose, onLeadCaptured }) => {
  const { organization } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    estimatedBudget: 3500,
    enquiry: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.enquiry.trim()) return;
    setSubmitting(true);
    try {
      // Find the first form slug or use default
      const formsRes = await api.forms.list();
      const slug = formsRes.forms?.[0]?.slug || 'apex-quote';

      const res = await api.public.submitForm(slug, formData);
      setSubmittedMessage(res.message || 'Thank you! Your quote request has been received.');
      if (onLeadCaptured) onLeadCaptured();
    } catch (err: any) {
      alert('Submission error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0c1425] border border-[#29447e] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#29447e]/60 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#fca311] text-black font-bold">
              Customer-Facing Public Form
            </span>
            <h2 className="text-lg font-bold text-white mt-1">
              Request Service Quote & Consultation
            </h2>
            <p className="text-xs text-[#beccea]">
              Hosted for: <span className="text-white font-semibold">{organization?.name || 'Your Business'}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-[#beccea] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedMessage ? (
          <div className="p-6 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Inquiry Successfully Received!</h3>
            <p className="text-xs text-emerald-200 leading-relaxed">{submittedMessage}</p>
            <div className="text-[11px] text-[#beccea] bg-[#080d19] p-3 rounded-lg border border-[#29447e]/50 font-mono">
              Lead was created in your CRM with initial follow-up task and AI classification.
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-[#fca311] text-black font-bold text-xs rounded-xl shadow mt-2"
            >
              Return to CRM Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">First Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rachel"
                  value={formData.firstName}
                  onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                />
              </div>
              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Last Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adams"
                  value={formData.lastName}
                  onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="rachel@company.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                />
              </div>
              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+1 (555) 000-1122"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Company / Residence</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Plaza Unit 4"
                  value={formData.company}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                />
              </div>
              <div>
                <label className="block text-[#beccea] mb-1 font-semibold">Approx. Budget ($)</label>
                <input
                  type="number"
                  value={formData.estimatedBudget}
                  onChange={e => setFormData({ ...formData, estimatedBudget: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#beccea] mb-1 font-semibold">Project / Service Description *</label>
              <textarea
                rows={3}
                required
                placeholder="Describe what services you need, timing, or special requirements..."
                value={formData.enquiry}
                onChange={e => setFormData({ ...formData, enquiry: e.target.value })}
                className="w-full px-3 py-2 bg-[#080d19] border border-[#29447e] rounded-lg text-white focus:outline-none focus:border-[#fca311]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[#14213d] text-white"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-[#fca311] hover:bg-[#d68502] text-black font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting...' : 'Submit Inquiry'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
