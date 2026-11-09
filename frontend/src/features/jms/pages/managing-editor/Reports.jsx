import React from 'react';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, StatCards, Card, Loading, ErrorNote, useTokens } from '../../ui';
import { get } from '../../api';
import { useLoad } from '../../hooks';
import { money } from '../../format';

export default function MEReports() {
  const t = useTokens();
  const { data: d, loading, error } = useLoad(() => get('/production/reports'));
  const bar = (n, max) => <div className="h-2 rounded bg-gray-100 w-full"><div className="h-2 rounded bg-[#7A1849]" style={{ width: `${(n / Math.max(1, max)) * 100}%` }}></div></div>;
  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader eyebrow="WORKSPACE / REPORTS" title="Production Reports" subtitle="Publishing output and fee collection." />
        <ErrorNote error={error} />
        {loading || !d ? <Loading /> : (
          <>
            <StatCards cols={3} items={[
              { label: 'Avg. days accept → publish', value: d.avg_days_accept_to_publish ?? '—' },
              { label: 'Articles (last 12 months)', value: d.published_by_month.reduce((s, x) => s + x.articles, 0) },
              { label: 'Fees collected', value: money((d.fees.find((f) => f.status === 'PAID') || {}).total || 0) },
            ]} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Published per month">
                {d.published_by_month.length === 0 && <p className={`text-[13px] ${t.textMuted}`}>No data yet.</p>}
                <div className="space-y-3">{d.published_by_month.map((x) => (<div key={x.month}><div className={`flex justify-between text-[12px] mb-1 ${t.textMain}`}><span>{x.month}</span><b>{x.articles}</b></div>{bar(x.articles, Math.max(...d.published_by_month.map((y) => y.articles)))}</div>))}</div>
              </Card>
              <Card title="Articles per issue">
                {d.articles_per_issue.length === 0 && <p className={`text-[13px] ${t.textMuted}`}>No issues yet.</p>}
                <div className="space-y-3">{d.articles_per_issue.map((x) => (<div key={x.issue}><div className={`flex justify-between text-[12px] mb-1 ${t.textMain}`}><span>{x.issue}</span><b>{x.articles}</b></div>{bar(x.articles, Math.max(...d.articles_per_issue.map((y) => y.articles)))}</div>))}</div>
              </Card>
              <Card title="Fees by status" className="lg:col-span-2">
                {d.fees.length === 0 && <p className={`text-[13px] ${t.textMuted}`}>No fees yet.</p>}
                {d.fees.map((f) => (<div key={f.status} className={`flex justify-between py-2 border-b last:border-0 text-[13px] ${t.borderCol} ${t.textMain}`}><span>{f.status.replace('_', ' ').toLowerCase()}</span><span className={t.textMuted}>{f.n} · {money(f.total)}</span></div>))}
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
