import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { message } from 'antd';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, Card, Btn, Field, TextArea, TextInput, SelectBox, Loading, ErrorNote } from '../../ui';
import { get, post, put, errorMessage } from '../../api';
import { useLoad } from '../../hooks';

export default function IssueForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const { data, loading, error } = useLoad(() => (editing ? get(`/production/issues/${id}`) : Promise.resolve({ data: null })), [id]);
  const [f, setF] = useState({ volume: '', issue_number: '', title: '', description: '', publication_date: '', status: 'DRAFT' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setF({ volume: data.volume, issue_number: data.issue_number, title: data.title || '', description: data.description || '', publication_date: (data.publication_date || '').slice(0, 10), status: data.status }); }, [data]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setBusy(true);
    try {
      const body = { ...f, volume: Number(f.volume), issue_number: Number(f.issue_number) };
      const r = editing ? await put(`/production/issues/${id}`, body) : await post('/production/issues', body);
      message.success(r.message); navigate('/managing-editor/issues');
    } catch (e) { message.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <AdminLayout>
      <div className="max-w-[800px] mx-auto animate-fade-in-up">
        <PageHeader back={{ to: '/managing-editor/issues', label: 'Back to Issues' }} eyebrow="WORKSPACE / ISSUES" title={editing ? 'Edit Issue' : 'Add Issue'} />
        <ErrorNote error={error} />
        {loading ? <Loading /> : (
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Volume" required><TextInput type="number" min="1" value={f.volume} onChange={set('volume')} /></Field>
              <Field label="Issue number" required><TextInput type="number" min="1" value={f.issue_number} onChange={set('issue_number')} /></Field>
              <div className="md:col-span-2"><Field label="Title (optional)"><TextInput value={f.title} onChange={set('title')} placeholder="Special issue title" /></Field></div>
              <Field label="Publication date"><TextInput type="date" value={f.publication_date} onChange={set('publication_date')} /></Field>
              <Field label="Status"><SelectBox value={f.status} onChange={set('status')}><option value="DRAFT">Draft</option><option value="SCHEDULED">Scheduled</option><option value="PUBLISHED">Published</option></SelectBox></Field>
              <div className="md:col-span-2"><Field label="Description"><TextArea rows="4" value={f.description} onChange={set('description')} /></Field></div>
            </div>
            <div className="mt-6 flex gap-3"><Btn disabled={busy || !f.volume || !f.issue_number} onClick={save}>{editing ? 'Save changes' : 'Create issue'}</Btn><Btn kind="ghost" to="/managing-editor/issues">Cancel</Btn></div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
