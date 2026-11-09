import React from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Popconfirm } from 'antd';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, ListTable, Pill, Cell, Btn } from '../../ui';
import { get, del, errorMessage } from '../../api';
import { useLoad } from '../../hooks';
import { fmtDate } from '../../format';

export const ISSUE_TONE = { DRAFT: 'gray', SCHEDULED: 'orange', PUBLISHED: 'green' };

export default function Issues() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useLoad(() => get('/production/issues'));
  const remove = async (id) => { try { const r = await del(`/production/issues/${id}`); message.success(r.message); reload(); } catch (e) { message.error(errorMessage(e)); } };
  const columns = [
    { title: 'ISSUE', render: (_, i) => <Cell.Title sub={i.journal_title}>Volume {i.volume}, Issue {i.issue_number}{i.title ? ` — ${i.title}` : ''}</Cell.Title> },
    { title: 'DATE', dataIndex: 'publication_date', render: (v) => <Cell.Muted>{fmtDate(v)}</Cell.Muted> },
    { title: 'ARTICLES', dataIndex: 'article_count', align: 'center', render: (v) => <Cell.Mono>{v}</Cell.Mono> },
    { title: 'STATUS', dataIndex: 'status', render: (v) => <Pill tone={ISSUE_TONE[v]}>{v.toLowerCase()}</Pill> },
    { title: 'ACTIONS', align: 'right', render: (_, i) => (
      <div className="flex gap-4 justify-end text-[12px] font-bold">
        <button className="text-[#7A1849] hover:underline" onClick={() => navigate(`/managing-editor/issues/view/${i.id}`)}>View</button>
        <button className="text-gray-600 hover:underline" onClick={() => navigate(`/managing-editor/issues/edit/${i.id}`)}>Edit</button>
        <Popconfirm title="Delete this issue?" onConfirm={() => remove(i.id)}><button className="text-red-600 hover:underline">Delete</button></Popconfirm>
      </div>) },
  ];
  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader eyebrow="WORKSPACE / ISSUES" title="Issues" subtitle="Volumes and issues that articles are published into." actions={<Btn to="/managing-editor/issues/add">+ Add issue</Btn>} />
        <ListTable loading={loading} error={error} data={data} empty="No issues yet. Add one to start publishing." columns={columns} />
      </div>
    </AdminLayout>
  );
}
