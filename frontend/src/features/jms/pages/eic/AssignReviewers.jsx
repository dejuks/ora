import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, ListTable, SearchBox, Pill, Cell } from '../../ui';
import { get } from '../../api';
import { useLoad, useDebounced } from '../../hooks';
import { fmtDate } from '../../format';

export default function AssignReviewers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const { data, loading, error } = useLoad(() => get('/editorial/manuscripts', { stage: 'review', limit: 100, search: q || undefined }), [q]);
  const columns = [
    { title: 'ID', dataIndex: 'manuscript_no', render: (v) => <Cell.Mono>{v}</Cell.Mono> },
    { title: 'TITLE', dataIndex: 'title', render: (v, m) => <Cell.Title sub={m.category}>{v}</Cell.Title> },
    { title: 'HANDLING EDITOR', dataIndex: 'associate_editor', render: (v) => <Cell.Muted>{v || '—'}</Cell.Muted> },
    { title: 'REVIEWERS', render: (_, m) => <Cell.Muted>{m.completed} of {m.assigned} done</Cell.Muted> },
    { title: 'STATE', render: (_, m) => m.assigned === 0 ? <Pill tone="red">Needs reviewers</Pill> : m.outstanding > 0 ? <Pill tone="orange">Review in progress</Pill> : <Pill tone="green">Ready for decision</Pill> },
    { title: 'SUBMITTED', dataIndex: 'submitted_at', render: (v) => <Cell.Muted>{fmtDate(v)}</Cell.Muted> },
    { title: 'ACTION', align: 'right', render: (_, m) => <button onClick={() => navigate(`/eic/assign/${m.id}`)} className="text-[#7A1849] font-bold text-[12px] hover:underline">{m.assigned === 0 ? 'Assign' : 'Manage'}</button> },
  ];
  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader eyebrow="WORKSPACE / REVIEWERS" title="Assign Reviewers" subtitle="Manuscripts that passed screening and are in double-blind peer review." />
        <ListTable loading={loading} error={error} data={data} empty="No manuscripts are in peer review." columns={columns}
          toolbar={<><h2 className="text-[15px] font-bold">Peer review queue</h2><SearchBox value={search} onChange={setSearch} placeholder="Search title or ID..." /></>} />
      </div>
    </AdminLayout>
  );
}
