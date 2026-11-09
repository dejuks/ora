import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, ListTable, Tabs, SearchBox, Pill, Cell, Btn } from '../../ui';
import { get } from '../../api';
import { useLoad, useDebounced } from '../../hooks';
import { fmtDate } from '../../format';

const GROUPS = {
  New: ['SUBMITTED', 'REVISED'],
  'Under Screening': ['UNDER_SCREENING'],
  'Desk Rejected': ['DESK_REJECTED'],
  'Sent to Review': ['UNDER_REVIEW'],
};
const TONE = { New: 'blue', 'Under Screening': 'orange', 'Desk Rejected': 'red', 'Sent to Review': 'green' };
const groupOf = (status) => Object.keys(GROUPS).find((g) => GROUPS[g].includes(status));

export default function Screening() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('All');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const { data: rows, loading, error } = useLoad(() => get('/editorial/manuscripts', { stage: 'screening', limit: 100, search: q || undefined }), [q]);
  const all = rows || [];
  const counts = { All: all.length };
  Object.keys(GROUPS).forEach((g) => { counts[g] = all.filter((m) => GROUPS[g].includes(m.status)).length; });
  const data = all.filter((m) => tab === 'All' || GROUPS[tab].includes(m.status));

  const columns = [
    { title: 'ID', dataIndex: 'manuscript_no', render: (v) => <Cell.Mono>{v}</Cell.Mono> },
    { title: 'TITLE', dataIndex: 'title', render: (v, m) => <Cell.Title sub={m.category}>{v}</Cell.Title> },
    { title: 'AUTHOR', dataIndex: 'author_names', render: (v) => <Cell.Muted>{v}</Cell.Muted> },
    { title: 'SUBMITTED', dataIndex: 'submitted_at', render: (v) => <Cell.Muted>{fmtDate(v)}</Cell.Muted> },
    { title: 'STATUS', dataIndex: 'status', render: (v, m) => <Pill tone={TONE[groupOf(v)]}>{groupOf(v)}{m.current_round > 1 ? ` · R${m.current_round}` : ''}</Pill> },
    { title: 'ACTION', align: 'right', render: (_, m) => (
      <button onClick={() => navigate(`/eic/screen/${m.id}`)} className="text-[#7A1849] font-bold text-[12px] hover:underline">
        {['SUBMITTED', 'REVISED', 'UNDER_SCREENING'].includes(m.status) ? 'Screen' : 'View'}
      </button>) },
  ];

  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader eyebrow="WORKSPACE / SCREENING" title="Manuscript Screening" subtitle="Check new submissions, then send them to peer review or desk reject." />
        <ListTable loading={loading} error={error} data={data} empty="No manuscripts to screen."
          toolbar={<><Tabs tabs={['All', ...Object.keys(GROUPS)]} value={tab} onChange={setTab} counts={counts} /><SearchBox value={search} onChange={setSearch} placeholder="Search title, ID or author..." /></>}
          columns={columns} />
      </div>
    </AdminLayout>
  );
}
