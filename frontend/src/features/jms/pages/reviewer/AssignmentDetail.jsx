import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { message } from 'antd';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, Card, Btn, Field, TextArea, TextInput, SelectBox, Pill, Loading, ErrorNote, useTokens } from '../../ui';
import { FileList } from '../../parts';
import { get, post, errorMessage } from '../../api';
import { useLoad } from '../../hooks';
import { fmtDate, REC_LABEL } from '../../format';

const CHECKS = [
  ['originality', 'The work is original and makes a clear contribution'],
  ['methods', 'The methods are sound and described well enough to repeat'],
  ['conclusions', 'The conclusions follow from the evidence'],
  ['references', 'The references are adequate and accurate'],
  ['ethics', 'There are no ethical concerns'],
];

export default function AssignmentDetail() {
  const t = useTokens();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: a, loading, error, reload } = useLoad(() => get(`/reviewer/assignments/${id}`), [id]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ recommendation: 'MINOR_REVISION', score: 7, comments_to_author: '', confidential_comments: '' });
  const [checklist, setChecklist] = useState({});
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const run = async (fn, done) => {
    setBusy(true);
    try { const r = await fn(); message.success(r.message); done ? done() : reload(); }
    catch (e) { message.error(errorMessage(e)); } finally { setBusy(false); }
  };

  if (loading) return <AdminLayout><Loading /></AdminLayout>;
  if (error || !a) return <AdminLayout><ErrorNote error={error || 'Not found.'} /></AdminLayout>;
  const st = a.invitation_status;

  return (
    <AdminLayout>
      <div className="max-w-[1100px] mx-auto animate-fade-in-up">
        <PageHeader back={{ to: '/reviewer/assignments', label: 'Back to My Assignments' }} eyebrow={`REVIEW ${a.manuscript_no}`} title={a.title}
          subtitle={`${a.journal_title} · ${a.article_type || ''} · due ${fmtDate(a.due_date)}`} actions={<Pill tone={st === 'COMPLETED' ? 'green' : st === 'DECLINED' ? 'red' : 'orange'}>{st.toLowerCase()}</Pill>} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <Card title="Abstract" className="lg:col-span-8">
            <p className={`text-[13px] leading-[1.8] ${t.textMain}`}>{a.abstract}</p>
            <p className={`text-[12px] mt-4 ${t.textMuted}`}><strong>Keywords:</strong> {(a.keywords || []).join(', ')}</p>
            {a.data_availability && <p className={`text-[12px] mt-2 ${t.textMuted}`}><strong>Data availability:</strong> {a.data_availability}</p>}
          </Card>
          <Card title="Manuscript files" className="lg:col-span-4">
            {st === 'INVITED' ? <p className={`text-[12px] ${t.textMuted}`}>Files are shown after you accept the invitation.</p> : <FileList files={a.files} />}
          </Card>
        </div>

        {st === 'INVITED' && (
          <Card title="Your answer" subtitle="Accept only if you have no conflict of interest and can finish by the due date.">
            <Field label="Reason (required when declining)"><TextArea rows="3" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            <div className="flex gap-3 mt-4">
              <Btn disabled={busy} onClick={() => run(() => post(`/reviewer/assignments/${id}/respond`, { accept: true }))}>Accept invitation</Btn>
              <Btn kind="danger" disabled={busy || reason.trim().length < 3} onClick={() => run(() => post(`/reviewer/assignments/${id}/respond`, { accept: false, reason }), () => navigate('/reviewer/assignments'))}>Decline</Btn>
            </div>
          </Card>
        )}

        {st === 'ACCEPTED' && (
          <Card title="Submit your review" subtitle="Your comments to the author are shared with them anonymously.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <Field label="Recommendation" required>
                <SelectBox value={f.recommendation} onChange={set('recommendation')}>
                  {Object.entries(REC_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </SelectBox>
              </Field>
              <Field label="Overall score (1–10)" required><TextInput type="number" min="1" max="10" value={f.score} onChange={set('score')} /></Field>
            </div>
            <div className="space-y-2 mb-5">
              {CHECKS.map(([k, label]) => (
                <label key={k} className={`flex items-center gap-2 text-[13px] ${t.textMain}`}>
                  <input type="checkbox" className="accent-[#7A1849] w-4 h-4" checked={!!checklist[k]} onChange={(e) => setChecklist({ ...checklist, [k]: e.target.checked })} /> {label}
                </label>
              ))}
            </div>
            <div className="space-y-4 mb-6">
              <Field label="Comments to the author" required hint="At least 20 characters."><TextArea rows="8" value={f.comments_to_author} onChange={set('comments_to_author')} /></Field>
              <Field label="Confidential comments to the editor"><TextArea rows="4" value={f.confidential_comments} onChange={set('confidential_comments')} /></Field>
            </div>
            <Btn disabled={busy || f.comments_to_author.trim().length < 20} onClick={() => run(() => post(`/reviewer/assignments/${id}/review`, { ...f, score: Number(f.score), checklist }))}>Submit review</Btn>
          </Card>
        )}

        {st === 'COMPLETED' && a.review && (
          <Card title="Your submitted review" subtitle={`${REC_LABEL[a.recommendation]} · score ${a.score}/10 · ${fmtDate(a.submitted_at)}`}>
            <p className={`text-[12px] font-bold ${t.textMuted}`}>Comments to the author</p>
            <p className={`text-[13px] whitespace-pre-wrap mb-4 ${t.textMain}`}>{a.review.comments_to_author}</p>
            {a.review.confidential_comments && (<><p className={`text-[12px] font-bold ${t.textMuted}`}>Confidential comments</p><p className={`text-[13px] whitespace-pre-wrap ${t.textMain}`}>{a.review.confidential_comments}</p></>)}
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
