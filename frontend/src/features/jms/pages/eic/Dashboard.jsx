import React from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, StatCards, Card, Pill, STATUS_TONE, Btn, Loading, ErrorNote, useTokens } from '../../ui';
import { get } from '../../api';
import { useLoad } from '../../hooks';
import { fmtDate, statusLabel } from '../../format';

export default function EiCDashboard() {
  const t = useTokens();
  const { data: d, loading, error } = useLoad(() => get('/editorial/dashboard'));
  const s = d || { by_status: {}, recent: [] };
  const pipeline = [
    ['Submitted', (s.by_status.SUBMITTED || 0) + (s.by_status.REVISED || 0)],
    ['Under screening', s.by_status.UNDER_SCREENING || 0],
    ['Under review', s.by_status.UNDER_REVIEW || 0],
    ['Revision required', s.by_status.REVISION_REQUIRED || 0],
    ['Accepted / in production', (s.by_status.ACCEPTED || 0) + (s.by_status.IN_PRODUCTION || 0)],
    ['Published', s.by_status.PUBLISHED || 0],
  ];
  const max = Math.max(1, ...pipeline.map((p) => p[1]));

  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader eyebrow="WORKSPACE / DASHBOARD" title="Editorial Dashboard" subtitle="Track every manuscript in the review pipeline."
          actions={<Btn to="/eic/screening">Open screening queue</Btn>} />
        <ErrorNote error={error} />
        {loading ? <Loading /> : (
          <>
            <StatCards items={[
              { label: 'Awaiting screening', value: s.awaiting_screening, sub: 'New + under screening', subColor: 'text-blue-600' },
              { label: 'Under review', value: s.under_review, sub: `${s.needs_reviewers} need reviewers`, subColor: s.needs_reviewers ? 'text-red-500' : 'text-gray-400' },
              { label: 'Ready for decision', value: s.ready_for_decision, sub: 'All reviews are in', subColor: 'text-amber-600' },
              { label: 'Published', value: s.published, sub: `${s.rejected} rejected`, subColor: 'text-green-600' },
            ]} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card title="Latest activity" subtitle="Most recently updated manuscripts" className="lg:col-span-2">
                {s.recent.length === 0 && <p className={`text-[13px] ${t.textMuted}`}>No manuscripts have been submitted yet.</p>}
                <div className="space-y-3">
                  {s.recent.map((m) => (
                    <div key={m.id} className={`p-3.5 rounded-xl border flex justify-between items-center gap-3 ${t.isDarkMode ? 'bg-[#2A2A2A] border-[#3D3D3D]' : 'bg-gray-50 border-gray-100'}`}>
                      <div className="min-w-0">
                        <p className={`text-[13px] font-bold truncate ${t.textMain}`}>{m.title}</p>
                        <p className={`text-[11px] ${t.textMuted}`}>{m.manuscript_no} · {m.author_names} · {fmtDate(m.updated_at)}</p>
                      </div>
                      <Pill tone={STATUS_TONE[m.status]}>{statusLabel(m.status)}</Pill>
                    </div>
                  ))}
                </div>
              </Card>
              <div className="space-y-6">
                <Card title="Requires attention">
                  <div className="space-y-3 text-[13px]">
                    <p className={t.textMain}><strong>{s.awaiting_screening}</strong> to screen · <Link className="text-[#7A1849] font-bold hover:underline" to="/eic/screening">open</Link></p>
                    <p className={t.textMain}><strong>{s.needs_reviewers}</strong> need reviewers · <Link className="text-[#7A1849] font-bold hover:underline" to="/eic/assign-reviewers">assign</Link></p>
                    <p className={t.textMain}><strong>{s.ready_for_decision}</strong> ready for decision · <Link className="text-[#7A1849] font-bold hover:underline" to="/eic/final-decisions">decide</Link></p>
                  </div>
                </Card>
                <Card title="Editorial pipeline">
                  <div className="space-y-3">
                    {pipeline.map(([label, n]) => (
                      <div key={label}>
                        <div className={`flex justify-between text-[11px] mb-1 ${t.textMuted}`}><span>{label}</span><span className="font-bold">{n}</span></div>
                        <div className="h-2 rounded bg-gray-100"><div className="h-2 rounded bg-[#7A1849]" style={{ width: `${(n / max) * 100}%` }}></div></div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
