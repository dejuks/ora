import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, ListTable, Tabs, SearchBox, Pill, Cell } from '../../ui';
import { get } from '../../api';
import { useLoad } from '../../hooks';
import { fmtDate } from '../../format';
import { PROGRESS_TONE } from './Dashboard';

const TABS = [['ALL', 'All'], ['INVITED', 'Invitations'], ['ACCEPTED', 'In Progress'], ['COMPLETED', 'Completed'], ['DECLINED', 'Declined']];

export default function MyAssignments({ onlyPending = false }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(onlyPending ? 'ACCEPTED' : 'ALL');
  const [search, setSearch] = useState('');
  const { data, loading, error } = useLoad(() => get('/reviewer/assignments', { status: tab }), [tab]);
  const rows = (data || []).filter((a) => `${a.title} ${a.manuscript_no}`.toLowerCase().includes(search.toLowerCase()));
  const columns = [
    { title: 'ID', dataIndex: 'manuscript_no', render: (v) => <Cell.Mono>{v}</Cell.Mono> },
    { title: 'TITLE', dataIndex: 'title', render: (v, a) => <Cell.Title sub={`${a.journal_title} · ${a.category || ''}`}>{v}</Cell.Title> },
    { title: 'INVITED', dataIndex: 'invited_at', render: (v) => <Cell.Muted>{fmtDate(v)}</Cell.Muted> },
    { title: 'DUE', dataIndex: 'due_date', render: (v) => <Cell.Muted>{fmtDate(v)}</Cell.Muted> },
    { title: 'STATUS', dataIndex: 'progress', render: (v, a) => <Pill tone={a.invitation_status === 'DECLINED' ? 'red' : PROGRESS_TONE[v]}>{a.invitation_status === 'DECLINED' ? 'Declined' : v}</Pill> },
    { title: 'ACTION', align: 'right', render: (_, a) => <button onClick={() => navigate(`/reviewer/assignment/${a.id}`)} className="text-[#7A1849] font-bold text-[12px] hover:underline">{a.invitation_status === 'INVITED' ? 'Respond' : a.invitation_status === 'ACCEPTED' ? 'Review' : 'View'}</button> },
  ];
  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader eyebrow={onlyPending ? 'WORKSPACE / PENDING REVIEW' : 'WORKSPACE / ASSIGNMENTS'} title={onlyPending ? 'Pending Reviews' : 'My Assignments'} subtitle="Double-blind: author identities are hidden from you." />
        <ListTable loading={loading} error={error} data={rows} empty="No assignments here."
          toolbar={<>{onlyPending ? <h2 className="text-[15px] font-bold">Accepted, not yet submitted</h2> : <Tabs tabs={TABS.map(([key, label]) => ({ key, label }))} value={tab} onChange={setTab} />}<SearchBox value={search} onChange={setSearch} placeholder="Search title or ID..." /></>}
          columns={columns} />
      </div>
    </AdminLayout>
  );
}
