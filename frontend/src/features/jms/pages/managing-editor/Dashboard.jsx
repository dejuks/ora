import React from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, StatCards, Card, Btn, Loading, ErrorNote, useTokens } from '../../ui';
import { get } from '../../api';
import { useLoad } from '../../hooks';
import { money } from '../../format';

export default function MEDashboard() {
  const t = useTokens();
  const { data: d, loading, error } = useLoad(() => get('/production/dashboard'));
  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader eyebrow="WORKSPACE / DASHBOARD" title="Journal Manager Dashboard" subtitle="Production, publication fees and issues."
          actions={<Btn to="/managing-editor/pending-production">Open production queue</Btn>} />
        <ErrorNote error={error} />
        {loading || !d ? <Loading /> : (
          <>
            <StatCards items={[
              { label: 'Awaiting first proof', value: d.awaiting_proof, sub: 'Accepted manuscripts', subColor: 'text-blue-600' },
              { label: 'In production', value: d.in_production, sub: `${d.comments_received} with author corrections`, subColor: d.comments_received ? 'text-amber-600' : 'text-gray-400' },
              { label: 'Ready to publish', value: d.ready_to_publish, sub: 'Proof approved, fee cleared', subColor: 'text-green-600' },
              { label: 'Published articles', value: d.published, sub: `${d.issues.published} issues published`, subColor: 'text-gray-500' },
            ]} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Publication fees">
                <p className={`text-[13px] ${t.textMain}`}><strong>{d.open_fees}</strong> fee(s) need attention · <Link className="text-[#7A1849] font-bold hover:underline" to="/managing-editor/pending-production">open queue</Link></p>
                <p className={`text-[13px] mt-2 ${t.textMuted}`}>Collected so far: <strong className={t.textMain}>{money(d.collected)}</strong></p>
              </Card>
              <Card title="Issues">
                <p className={`text-[13px] ${t.textMain}`}><strong>{d.issues.upcoming}</strong> draft / scheduled · <strong>{d.issues.published}</strong> published</p>
                <div className="mt-3"><Btn to="/managing-editor/issues/add" kind="ghost">Create a new issue</Btn></div>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
