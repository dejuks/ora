import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { message } from 'antd';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, Card, Btn, Field, TextArea, TextInput, SelectBox, Pill, Loading, ErrorNote, useTokens } from '../../ui';
import { get, patch, errorMessage } from '../../api';
import { useLoad } from '../../hooks';
import { fmtDate } from '../../format';

export default function ViewPublished() {
  const t = useTokens();
  const { id } = useParams();
  const { data: a, loading, error, reload } = useLoad(() => get(`/production/published/${id}`), [id]);
  const [f, setF] = useState({ status: 'PUBLISHED', correction_note: '', pages: '', article_number: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (a) setF({ status: a.status, correction_note: a.correction_note || '', pages: a.pages || '', article_number: a.article_number || '' }); }, [a]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setBusy(true);
    try { const r = await patch(`/production/published/${id}`, f); message.success(r.message); reload(); }
    catch (e) { message.error(errorMessage(e)); } finally { setBusy(false); }
  };
  if (loading) return <AdminLayout><Loading /></AdminLayout>;
  if (error || !a) return <AdminLayout><ErrorNote error={error || 'Not found.'} /></AdminLayout>;
  return (
    <AdminLayout>
      <div className="max-w-[1100px] mx-auto animate-fade-in-up">
        <PageHeader back={{ to: '/managing-editor/published', label: 'Back to Published Manuscripts' }} eyebrow={a.manuscript_no} title={a.title}
          subtitle={`${a.author_names} · Vol. ${a.volume}, No. ${a.issue_number} · ${fmtDate(a.published_at)}`} actions={<Pill tone="green">{a.status.toLowerCase()}</Pill>} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card title="Article" className="lg:col-span-7">
            <p className={`text-[12px] mb-3 ${t.textMuted}`}>DOI <b className={t.textMain}>{a.doi}</b> · {a.license}</p>
            <p className={`text-[13px] leading-[1.8] ${t.textMain}`}>{a.abstract}</p>
            <p className={`text-[12px] mt-3 ${t.textMuted}`}><b>Keywords:</b> {(a.keywords || []).join(', ')}</p>
          </Card>
          <Card title="Update metadata" className="lg:col-span-5">
            <div className="space-y-4">
              <Field label="Status"><SelectBox value={f.status} onChange={set('status')}><option value="PUBLISHED">Published</option><option value="INDEXED">Indexed</option><option value="CORRECTION">Correction issued</option></SelectBox></Field>
              <Field label="Article number"><TextInput value={f.article_number} onChange={set('article_number')} /></Field>
              <Field label="Pages"><TextInput value={f.pages} onChange={set('pages')} /></Field>
              <Field label="Correction note (shown publicly)"><TextArea rows="3" value={f.correction_note} onChange={set('correction_note')} /></Field>
              <Btn disabled={busy} onClick={save}>Save changes</Btn>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
