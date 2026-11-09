import React, { useState } from 'react';
import { message, Popconfirm } from 'antd';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, ListTable, Pill, Cell, Btn, Card, Field, TextArea, TextInput } from '../../ui';
import { get, post, put, del, errorMessage } from '../../api';
import { useLoad } from '../../hooks';
import { fmtDate } from '../../format';

const EMPTY = { title: '', body: '', is_published: true, published_at: '' };

export default function Announcements() {
  const { data, loading, error, reload } = useLoad(() => get('/admin/announcements'));
  const [editing, setEditing] = useState(null);
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const open = (a) => { setEditing(a ? a.id : 'new'); setF(a ? { title: a.title, body: a.body, is_published: a.is_published, published_at: String(a.published_at).slice(0, 10) } : EMPTY); };
  const save = async () => {
    setBusy(true);
    try {
      const body = { title: f.title, body: f.body, is_published: f.is_published, published_at: f.published_at || undefined };
      const r = editing === 'new' ? await post('/admin/announcements', body) : await put(`/admin/announcements/${editing}`, body);
      message.success(r.message); setEditing(null); reload();
    } catch (e) { message.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const remove = async (id) => { try { const r = await del(`/admin/announcements/${id}`); message.success(r.message); reload(); } catch (e) { message.error(errorMessage(e)); } };
  const columns = [
    { title: 'ANNOUNCEMENT', render: (_, a) => <Cell.Title sub={String(a.body).slice(0, 110)}>{a.title}</Cell.Title> },
    { title: 'DATE', dataIndex: 'published_at', render: (v) => <Cell.Muted>{fmtDate(v)}</Cell.Muted> },
    { title: 'STATUS', dataIndex: 'is_published', render: (v) => <Pill tone={v ? 'green' : 'gray'}>{v ? 'published' : 'hidden'}</Pill> },
    { title: 'ACTIONS', align: 'right', render: (_, a) => (
      <div className="flex gap-4 justify-end text-[12px] font-bold">
        <button className="text-[#7A1849] hover:underline" onClick={() => open(a)}>Edit</button>
        <Popconfirm title="Delete this announcement?" onConfirm={() => remove(a.id)}><button className="text-red-600 hover:underline">Delete</button></Popconfirm>
      </div>) },
  ];
  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader eyebrow="WORKSPACE / ANNOUNCEMENTS" title="Announcements" subtitle="News and calls for papers shown on the public journal home page." actions={<Btn onClick={() => open(null)}>+ New announcement</Btn>} />
        {editing && (
          <Card title={editing === 'new' ? 'New announcement' : 'Edit announcement'} className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Field label="Title" required><TextInput value={f.title} onChange={set('title')} /></Field></div>
              <Field label="Date"><TextInput type="date" value={f.published_at} onChange={set('published_at')} /></Field>
              <Field label="Visible on public site"><label className="flex items-center gap-2 text-[13px] mt-2"><input type="checkbox" checked={f.is_published} onChange={(e) => setF({ ...f, is_published: e.target.checked })} /> Published</label></Field>
              <div className="md:col-span-2"><Field label="Text" required><TextArea rows="6" value={f.body} onChange={set('body')} /></Field></div>
            </div>
            <div className="mt-5 flex gap-3"><Btn disabled={busy || f.title.trim().length < 3 || f.body.trim().length < 3} onClick={save}>Save</Btn><Btn kind="ghost" onClick={() => setEditing(null)}>Cancel</Btn></div>
          </Card>
        )}
        <ListTable loading={loading} error={error} data={data} empty="No announcements yet." columns={columns} />
      </div>
    </AdminLayout>
  );
}
