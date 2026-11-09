import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { message } from 'antd';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, Card, Btn, Field, TextInput, SelectBox, Loading, ErrorNote, useTokens } from '../../ui';
import { ManuscriptSummary } from '../../parts';
import { get, post, errorMessage } from '../../api';
import { useLoad } from '../../hooks';

export default function PublishPage() {
  const t = useTokens();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: m, loading, error } = useLoad(() => get(`/production/manuscripts/${id}`), [id]);
  const { data: issues } = useLoad(() => get('/production/issues'), []);
  const [f, setF] = useState({ issue_id: '', article_number: '', pages: '', license: 'CC BY 4.0' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const publish = async () => {
    setBusy(true);
    try { const r = await post(`/production/manuscripts/${id}/publish`, f); message.success(r.message); navigate('/managing-editor/published'); }
    catch (e) { message.error(errorMessage(e)); } finally { setBusy(false); }
  };
  if (loading) return <AdminLayout><Loading /></AdminLayout>;
  if (error || !m) return <AdminLayout><ErrorNote error={error || 'Not found.'} /></AdminLayout>;
  const options = (issues || []).filter((i) => i.journal_id === m.journal_id && i.status !== 'PUBLISHED' || i.journal_id === m.journal_id);
  return (
    <AdminLayout>
      <div className="max-w-[1100px] mx-auto animate-fade-in-up">
        <PageHeader back={{ to: `/managing-editor/production/${id}`, label: 'Back to Production' }} eyebrow="WORKSPACE / PUBLISH" title="Publish Article" subtitle="A DOI is created automatically when you publish." />
        <ManuscriptSummary m={m} />
        <Card title="Publication details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Field label="Issue" required hint={options.length ? undefined : 'Create an issue first (Issues → Add).'}>
              <SelectBox value={f.issue_id} onChange={set('issue_id')}><option value="">Select an issue…</option>{options.map((i) => <option key={i.id} value={i.id}>Vol. {i.volume}, Issue {i.issue_number}{i.title ? ` — ${i.title}` : ''} ({i.status.toLowerCase()})</option>)}</SelectBox></Field></div>
            <Field label="Article number"><TextInput value={f.article_number} onChange={set('article_number')} placeholder="e.g. 1" /></Field>
            <Field label="Pages"><TextInput value={f.pages} onChange={set('pages')} placeholder="e.g. 1-18" /></Field>
            <Field label="License"><SelectBox value={f.license} onChange={set('license')}>{['CC BY 4.0', 'CC BY-NC 4.0', 'CC BY-SA 4.0', 'All rights reserved'].map((l) => <option key={l}>{l}</option>)}</SelectBox></Field>
          </div>
          <div className="mt-6 flex gap-3"><Btn disabled={busy || !f.issue_id} onClick={publish}>Publish now</Btn><Btn kind="ghost" to={`/managing-editor/production/${id}`}>Cancel</Btn></div>
          <p className={`text-[11px] mt-3 ${t.textMuted}`}>Publishing makes the article public and cannot be undone — use “Correction” on the published article instead.</p>
        </Card>
      </div>
    </AdminLayout>
  );
}
