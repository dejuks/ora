import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, ListTable, Tabs, SearchBox, Pill, Cell } from '../../ui';
import { get } from '../../api';
import { useLoad, useDebounced } from '../../hooks';
import { fmtDate } from '../../format';

export const PROD_LABEL = { AWAITING_PROOF: 'Awaiting proof', PROOF_SENT: 'Proof sent', COMMENT_RECEIVED: 'Corrections received', PROOF_ACCEPTED: 'Proof approved' };
export const PROD_TONE = { AWAITING_PROOF: 'blue', PROOF_SENT: 'orange', COMMENT_RECEIVED: 'amber', PROOF_ACCEPTED: 'green' };
export const FEE_TONE = { PENDING: 'orange', VERIFYING: 'blue', WAIVER_REQUESTED: 'amber', PAID: 'green', WAIVED: 'green', CANCELLED: 'gray' };

export default function PendingProduction() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const { data, loading, error } = useLoad(() => get('/production/manuscripts', { production_status: tab, search: q || undefined }), [tab, q]);
  const { data: all } = useLoad(() => get('/production/manuscripts'), []);
  const counts = {};
  (all || []).forEach((m) => { counts[m.production_status] = (counts[m.production_status] || 0) + 1; });
  counts.ALL = (all || []).length;

  const columns = [
    { title: 'ID', dataIndex: 'manuscript_no', render: (v) => <Cell.Mono>{v}</Cell.Mono> },
    { title: 'TITLE', dataIndex: 'title', render: (v, m) => <Cell.Title sub={m.author_names}>{v}</Cell.Title> },
    { title: 'ACCEPTED', dataIndex: 'decision_at', render: (v) => <Cell.Muted>{fmtDate(v)}</Cell.Muted> },
    { title: 'PRODUCTION', dataIndex: 'production_status', render: (v, m) => <Pill tone={PROD_TONE[v]}>{PROD_LABEL[v]}{m.proof_version ? ` · v${m.proof_version}` : ''}</Pill> },
    { title: 'FEE', dataIndex: 'fee_status', render: (v) => v ? <Pill tone={FEE_TONE[v]}>{v.replace('_', ' ').toLowerCase()}</Pill> : <Cell.Muted>none</Cell.Muted> },
    { title: 'ACTION', align: 'right', render: (_, m) => {
      const ready = m.production_status === 'PROOF_ACCEPTED' && (!m.fee_status || ['PAID', 'WAIVED', 'CANCELLED'].includes(m.fee_status));
      return <button onClick={() => navigate(ready ? `/managing-editor/publish/${m.id}` : `/managing-editor/production/${m.id}`)} className="text-[#7A1849] font-bold text-[12px] hover:underline">{ready ? 'Publish' : 'Manage'}</button>;
    } },
  ];
  const tabs = [{ key: 'ALL', label: 'All' }, ...Object.entries(PROD_LABEL).map(([key, label]) => ({ key, label }))];
  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader eyebrow="WORKSPACE / PRODUCTION" title="Pending Production" subtitle="Accepted manuscripts on their way to publication." />
        <ListTable loading={loading} error={error} data={data} empty="Nothing is in production." columns={columns}
          toolbar={<><Tabs tabs={tabs} value={tab} onChange={setTab} counts={counts} /><SearchBox value={search} onChange={setSearch} placeholder="Search title or ID..." /></>} />
      </div>
    </AdminLayout>
  );
}
