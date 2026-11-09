import React from 'react';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, StatCards, Card, Loading, ErrorNote, useTokens } from '../../ui';
import { get } from '../../api';
import { useLoad } from '../../hooks';
import { statusLabel } from '../../format';

export default function EiCReports() {
  const t = useTokens();
  const { data: d, loading, error } = useLoad(() => get('/editorial/reports'));
  const bar = (n, max) => <div className="h-2 rounded bg-gray-100 w-full"><div className="h-2 rounded bg-[#7A1849]" style={{ width: `${(n / Math.max(1, max)) * 100}%` }}></div></div>;
  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader eyebrow="WORKSPACE / REPORTS" title="Editorial Reports" subtitle="Submissions, decisions and reviewer workload." />
        <ErrorNote error={error} />
        {loading || !d ? <Loading /> : (
          <>
            <StatCards cols={4} items={[
              { label: 'Decided', value: d.timing.decided },
              { label: 'Accepted', value: d.timing.accepted, subColor: 'text-green-600', sub: 'final decisions' },
              { label: 'Rejected', value: d.timing.rejected, subColor: 'text-red-500', sub: 'final decisions' },
              { label: 'Avg. days to decision', value: d.timing.avg_days_to_decision ?? '—' },
            ]} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Manuscripts by status">
                {d.by_status.length === 0 && <p className={`text-[13px] ${t.textMuted}`}>No data yet.</p>}
                <div className="space-y-3">{d.by_status.map((s) => (<div key={s.status}><div className={`flex justify-between text-[12px] mb-1 ${t.textMain}`}><span>{statusLabel(s.status)}</span><b>{s.n}</b></div>{bar(s.n, d.by_status[0].n)}</div>))}</div>
              </Card>
              <Card title="Submissions per month">
                {d.monthly.length === 0 && <p className={`text-[13px] ${t.textMuted}`}>No data yet.</p>}
                <div className="space-y-3">{d.monthly.map((s) => (<div key={s.month}><div className={`flex justify-between text-[12px] mb-1 ${t.textMain}`}><span>{s.month}</span><b>{s.submissions}</b></div>{bar(s.submissions, Math.max(...d.monthly.map((x) => x.submissions)))}</div>))}</div>
              </Card>
              <Card title="Reviewer workload" className="lg:col-span-2">
                {d.reviewers.length === 0 && <p className={`text-[13px] ${t.textMuted}`}>No review assignments yet.</p>}
                {d.reviewers.map((r) => (<div key={r.reviewer} className={`flex justify-between py-2 border-b last:border-0 text-[13px] ${t.borderCol} ${t.textMain}`}><span>{r.reviewer}</span><span className={t.textMuted}>{r.completed} completed · {r.active} active · {r.declined} declined</span></div>))}
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
