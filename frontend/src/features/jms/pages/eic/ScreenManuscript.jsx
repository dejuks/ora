import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { message } from 'antd';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, Card, Btn, Field, TextArea, TextInput, Loading, ErrorNote, useTokens } from '../../ui';
import { ManuscriptSummary, Timeline } from '../../parts';
import { get, post, errorMessage } from '../../api';
import { useLoad } from '../../hooks';

export default function ScreenManuscript() {
  const t = useTokens();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: m, loading, error, reload } = useLoad(() => get(`/editorial/manuscripts/${id}`), [id]);
  const [reason, setReason] = useState('');
  const [checks, setChecks] = useState({ scope_ok: true, format_ok: true, ethics_ok: true });
  const [similarity, setSimilarity] = useState('');
  const [busy, setBusy] = useState(false);

  const act = async (fn, okText) => {
    setBusy(true);
    try { const r = await fn(); message.success(okText || r.message); return true; }
    catch (e) { message.error(errorMessage(e)); return false; } finally { setBusy(false); }
  };

  const claim = async () => { if (await act(() => post(`/editorial/manuscripts/${id}/claim`, {}))) reload(); };
  const screen = async (outcome) => {
    const body = { outcome, notes: reason, ...checks, similarity_pct: similarity === '' ? undefined : Number(similarity) };
    if (await act(() => post(`/editorial/manuscripts/${id}/screen`, body))) navigate(outcome === 'SEND_TO_REVIEW' ? `/eic/assign/${id}` : '/eic/screening');
  };

  if (loading) return <AdminLayout><Loading /></AdminLayout>;
  if (error || !m) return <AdminLayout><ErrorNote error={error || 'Not found.'} /></AdminLayout>;
  const canScreen = ['SUBMITTED', 'REVISED', 'UNDER_SCREENING'].includes(m.status);

  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader back={{ to: '/eic/screening', label: 'Back to Screening Queue' }} eyebrow="WORKSPACE / SCREENING / MANUSCRIPT DETAILS" title="Screen Manuscript" subtitle="Review manuscript details and make a screening decision." />
        <ManuscriptSummary m={m} />

        {canScreen ? (
          <Card title="Screening Decision" subtitle="Send this submission to formal peer review, or desk reject it." className="mb-6" pad="p-6 md:p-8">
            {m.status !== 'UNDER_SCREENING' && (
              <div className="mb-5"><Btn onClick={claim} disabled={busy} kind="ghost">Take this manuscript for screening</Btn></div>
            )}
            <div className="flex flex-wrap gap-6 mb-5">
              {[['scope_ok', 'Within journal scope'], ['format_ok', 'Format and files are complete'], ['ethics_ok', 'Ethics statements are in order']].map(([k, label]) => (
                <label key={k} className={`flex items-center gap-2 text-[13px] cursor-pointer ${t.textMain}`}>
                  <input type="checkbox" checked={checks[k]} onChange={(e) => setChecks({ ...checks, [k]: e.target.checked })} className="accent-[#7A1849] w-4 h-4" /> {label}
                </label>
              ))}
            </div>
            <div className="max-w-xs mb-5"><Field label="Similarity / plagiarism score (%)"><TextInput type="number" min="0" max="100" step="0.1" value={similarity} onChange={(e) => setSimilarity(e.target.value)} placeholder="e.g. 8.5" /></Field></div>
            <div className="mb-6">
              <Field label="Reason" required hint="Required for desk reject and return. Optional when sending to review."><TextArea rows="5" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter the reason for your screening decision..." /></Field>
            </div>
            <div className="flex flex-wrap gap-3">
              <Btn disabled={busy} onClick={() => screen('SEND_TO_REVIEW')}>Proceed to Review</Btn>
              <Btn disabled={busy || reason.trim().length < 5} kind="ghost" onClick={() => screen('RETURN_TO_AUTHOR')}>Return to Author</Btn>
              <Btn disabled={busy || reason.trim().length < 5} kind="danger" onClick={() => screen('DESK_REJECT')}>Desk Reject</Btn>
            </div>
          </Card>
        ) : (
          <Card title="Screening is complete" className="mb-6"><p className={`text-[13px] ${t.textMuted}`}>This manuscript is {m.status.replace('_', ' ').toLowerCase()}.</p></Card>
        )}
        <Card title="History"><Timeline events={m.timeline} /></Card>
      </div>
    </AdminLayout>
  );
}
