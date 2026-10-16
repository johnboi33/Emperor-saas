import React, { useState } from 'react';
import { api } from '../services/api.js';
import {
  ShieldCheck,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Lock,
  Layers
} from 'lucide-react';

export const SystemTestView: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [testSuite, setTestSuite] = useState<{
    summary: { total: number; passed: number; failed: number; allPassed: boolean; executedAt: string };
    results: Array<{ name: string; category: string; status: 'passed' | 'failed'; message: string; durationMs: number }>;
  } | null>(null);

  const handleRunTests = async () => {
    setRunning(true);
    try {
      const res = await api.systemTest.run();
      setTestSuite(res);
    } catch (err: any) {
      alert('Test runner error: ' + err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#14213d] p-6 rounded-2xl border border-[#29447e] shadow-xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span>Automated Security & QA Test Suite</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#beccea] mt-1">
            Live end-to-end verification of cross-tenant isolation, RBAC matrix, webhook idempotency, and AI escalation guardrails.
          </p>
        </div>

        <button
          onClick={handleRunTests}
          disabled={running}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
        >
          {running ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Executing Invariant Checks...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-black" />
              <span>Run Verification Suite</span>
            </>
          )}
        </button>
      </div>

      {/* Overview Banner */}
      {!testSuite && !running && (
        <div className="bg-[#080d19] p-8 rounded-2xl border border-[#29447e]/60 text-center space-y-3">
          <Layers className="w-10 h-10 text-[#fca311] mx-auto" />
          <h2 className="text-base font-bold text-white">System Ready for Live Auditing</h2>
          <p className="text-xs text-[#beccea] max-w-lg mx-auto leading-relaxed">
            Click "Run Verification Suite" above to launch automated assertion tests directly against your live database, verifying tenant boundaries, permission barriers, and exception management.
          </p>
        </div>
      )}

      {/* Results Box */}
      {testSuite && (
        <div className="space-y-4">
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#080d19] p-4 rounded-xl border border-[#29447e]/60">
              <span className="text-[11px] font-semibold text-[#beccea] uppercase">Overall Verdict</span>
              <div className="flex items-center gap-2 mt-1">
                {testSuite.summary.allPassed ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-lg font-black text-emerald-400">100% PASSED</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-400" />
                    <span className="text-lg font-black text-rose-400">FAILURES DETECTED</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-[#080d19] p-4 rounded-xl border border-[#29447e]/60">
              <span className="text-[11px] font-semibold text-[#beccea] uppercase">Assertions Tested</span>
              <div className="text-lg font-black text-white mt-1">
                {testSuite.summary.passed} Passed / {testSuite.summary.total} Total
              </div>
            </div>

            <div className="bg-[#080d19] p-4 rounded-xl border border-[#29447e]/60">
              <span className="text-[11px] font-semibold text-[#beccea] uppercase">Executed Timestamp</span>
              <div className="text-xs font-mono text-[#beccea] mt-2">
                {new Date(testSuite.summary.executedAt).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Test Detail Items */}
          <div className="space-y-3">
            {testSuite.results.map((r, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border transition-all ${
                  r.status === 'passed'
                    ? 'bg-[#080d19] border-emerald-500/40'
                    : 'bg-rose-950/40 border-rose-500/60'
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-start gap-3">
                    {r.status === 'passed' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{r.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#14213d] text-[#beccea]">
                          {r.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#e5e5e5] leading-relaxed">
                        {r.message}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-[#beccea] shrink-0">
                    {r.durationMs}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
