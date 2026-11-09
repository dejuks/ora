import React, { useState } from 'react';
import { message, Popconfirm } from 'antd';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, ListTable, Pill, Cell, Btn, Card, Field, TextArea, TextInput, SelectBox } from '../../ui';
import { get, post, put, del, errorMessage } from '../../api';
import { useLoad } from '../../hooks';

const EMPTY = { name: '', description: '', status: 'ACTIVE' };

export default function ArticleTypes() {
  const { data, loading, error, reload } = useLoad(() => get('/admin/article-types'));
  const [editing, setEditing] = useState(null);
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const open = (c) => { setEditing(c ? c.id : 'new'); setF(c ? { name: c.name, description: c.description || '', status: c.status } : EMPTY); };
  const save = async () => {
    setBusy(true);
    try {
      const body = { name: f.name, description: f.description || null, status: f.status };
      const r = editing === 'new' ? await post('/admin/article-types', body) : await put(`/admin/article-types/${editing}`, body);
      message.success(r.message); setEditing(null); reload();
    } catch (e) { message.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const remove = async (id) => { try { const r = await del(`/admin/article-types/${id}`); message.success(r.message); reload(); } catch (e) { message.error(errorMessage(e)); } };
  const columns = [
    { title: 'ARTICLE TYPE', render: (_, c) => <Cell.Title sub={c.description}>{c.name}</Cell.Title> },
    { title: 'MANUSCRIPTS', dataIndex: 'manuscript_count', align: 'center', render: (v) => <Cell.Mono>{v}</Cell.Mono> },
    { title: 'STATUS', dataIndex: 'status', render: (v) => <Pill tone={v === 'ACTIVE' ? 'green' : 'gray'}>{v.toLowerCase()}</Pill> },
    { title: 'ACTIONS', align: 'right', render: (_, c) => (
      <div className="flex gap-4 justify-end text-[12px] font-bold">
        <button className="text-[#7A1849] hover:underline" onClick={() => open(c)}>Edit</button>
        <Popconfirm title="Delete this article type?" onConfirm={() => remove(c.id)}><button className="text-red-600 hover:underline">Delete</button></Popconfirm>
      </div>) },
  ];
  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader eyebrow="WORKSPACE / ARTICLE TYPES" title="Article Types" subtitle="What authors can submit: research article, review, case study…" actions={<Btn onClick={() => open(null)}>+ Add article type</Btn>} />
        {editing && (
          <Card title={editing === 'new' ? 'Add article type' : 'Edit article type'} className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Name" required><TextInput value={f.name} onChange={set('name')} /></Field>
              <Field label="Status"><SelectBox value={f.status} onChange={set('status')}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></SelectBox></Field>
              <div className="md:col-span-2"><Field label="Description"><TextArea rows="3" value={f.description} onChange={set('description')} /></Field></div>
            </div>
            <div className="mt-5 flex gap-3"><Btn disabled={busy || f.name.trim().length < 2} onClick={save}>Save</Btn><Btn kind="ghost" onClick={() => setEditing(null)}>Cancel</Btn></div>
          </Card>
        )}
        <ListTable loading={loading} error={error} data={data} empty="No article types yet." columns={columns} />
      </div>
    </AdminLayout>
  );
}
