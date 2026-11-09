import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, ListTable, Tabs, Pill, Cell } from '../../ui';
import { get } from '../../api';
import { useLoad } from '../../hooks';
import { fmtDate } from '../../format';

export default function Messages() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('ALL');
  const { data, loading, error } = useLoad(() => get('/admin/messages', { status: tab }), [tab]);
  const columns = [
    { title: 'FROM', render: (_, m) => <Cell.Title sub={m.email}>{m.name}</Cell.Title> },
    { title: 'SUBJECT', dataIndex: 'subject', render: (v, m) => <Cell.Title sub={m.preview}>{v}</Cell.Title> },
    { title: 'RECEIVED', dataIndex: 'created_at', render: (v) => <Cell.Muted>{fmtDate(v)}</Cell.Muted> },
    { title: 'STATUS', dataIndex: 'status', render: (v) => <Pill tone={v === 'UNREAD' ? 'red' : v === 'READ' ? 'blue' : 'gray'}>{v.toLowerCase()}</Pill> },
    { title: 'ACTION', align: 'right', render: (_, m) => <button onClick={() => navigate(`/admin/messages/${m.id}`)} className="text-[#7A1849] font-bold text-[12px] hover:underline">Open</button> },
  ];
  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader eyebrow="WORKSPACE / MESSAGES" title="Messages" subtitle="Messages sent through the public contact form." />
        <ListTable loading={loading} error={error} data={data} empty="No messages." columns={columns}
          toolbar={<Tabs tabs={[['ALL', 'All'], ['UNREAD', 'Unread'], ['READ', 'Read'], ['ARCHIVED', 'Archived']].map(([key, label]) => ({ key, label }))} value={tab} onChange={setTab} />} />
      </div>
    </AdminLayout>
  );
}
