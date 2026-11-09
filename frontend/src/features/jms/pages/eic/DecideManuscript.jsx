import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { message } from 'antd';
import AdminLayout from '../../layouts/JmsLayout';
import { useAuth } from '../../../../context/AuthContext';
import { PageHeader, Card, Btn, Field, TextArea, SelectBox, Pill, Loading, ErrorNote, useTokens } from '../../ui';
import { ManuscriptSummary } from '../../parts';
import { get, post, errorMessage } from '../../api';
import { useLoad } from '../../hooks';
import { hasJmsRole } from '../../roles';
import { REC_LABEL } from '../../format';

const REC_TONE = { ACCEPT: 'green', MINOR_REVISION: 'blue', MAJOR_REVISION: 'amber', REJECT: 'red' };

export default function DecideManuscript() {
  const t = useTokens();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: m, loading, error } = useLoad(() => get(`/editorial/manuscripts/${id}`), [id]);
  const [decision, setDecision] = useState('ACCEPT');
  const [letter, setLetter] = useState('');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const isEic = hasJmsRole(user, 'EIC');

  const submit = async (url, body) => {
    setBusy(true);
    try { const r = await post(`/editorial/manuscripts/${id}/${url}`, body); message.success(r.message); navigate('/eic/final-decisions'); }
    catch (e) { message.error(errorMessage(e)); } finally { setBusy(false); }
  };

  if (loading) return <AdminLayout><Loading /></AdminLayout>;
  if (error || !m) return <AdminLayout><ErrorNote error={error || 'Not found.'} /></AdminLayout>;
  const reviews = m.reviews.filter((r) => r.round === m.current_round && r.status === 'COMPLETED');
  const rec = m.recommendations.find((r) => r.round === m.current_round);
  const open = m.status === 'UNDER_REVIEW';

  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader back={{ to: '/eic/final-decisions', label: 'Back to Final Decisions List' }} eyebrow={`DECISION FORM ${m.manuscript_no}`} title="Editorial Decision" />
        <ManuscriptSummary m={m} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card title="Peer Reviews Received" className="lg:col-span-8">
            {reviews.length === 0 && <p className={`text-[13px] ${t.textMuted}`}>No completed reviews yet.</p>}
            <div className="space-y-4">
              {reviews.map((r, i) => (
                <div key={r.id} className={`p-5 rounded-lg border ${t.isDarkMode ? 'bg-[#1A1A1A] border-[#2D2D2D]' : 'bg-[#FAFAFA] border-gray-100'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3"><h3 className={`text-[13px] font-bold ${t.textMain}`}>Reviewer {i + 1} <span className={`font-normal ${t.textMuted}`}>({r.reviewer_name})</span></h3><span className={`text-[12px] ${t.textMuted}`}>Score: {r.score}/10</span></div>
                    <Pill tone={REC_TONE[r.recommendation]}>{REC_LABEL[r.recommendation]}</Pill>
                  </div>
                  <p className={`text-[12px] font-bold ${t.textMuted}`}>Comments to author</p>
                  <p className={`text-[13px] whitespace-pre-wrap mb-3 ${t.textMain}`}>{r.comments_to_author}</p>
                  {r.confidential_comments && (<><p className={`text-[12px] font-bold ${t.textMuted}`}>Confidential to editor</p><p className={`text-[13px] whitespace-pre-wrap ${t.textMain}`}>{r.confidential_comments}</p></>)}
                </div>
              ))}
            </div>
            {rec && (
              <div className={`mt-5 p-4 rounded-lg border ${t.isDarkMode ? 'border-[#3D3D3D]' : 'border-[#7A1849]/20 bg-[#FCF7F9]'}`}>
                <p className="text-[11px] font-bold text-[#7A1849] uppercase tracking-wider mb-1">Associate editor's recommendation: {REC_LABEL[rec.recommendation]}</p>
                <p className={`text-[13px] whitespace-pre-wrap ${t.textMain}`}>{rec.summary}</p>
              </div>
            )}
          </Card>

          <Card title={isEic ? 'Your Decision' : 'Your Recommendation'} className="lg:col-span-4 h-fit">
            {!open ? <p className={`text-[13px] ${t.textMuted}`}>This manuscript is no longer under review.</p> : isEic ? (
              <div className="space-y-4">
                <Field label="Final EIC Decision">
                  <SelectBox value={decision} onChange={(e) => setDecision(e.target.value)}>
                    <option value="ACCEPT">Accept Paper</option><option value="MINOR_REVISION">Minor Revision</option>
                    <option value="MAJOR_REVISION">Major Revision</option><option value="REJECT">Reject Paper</option>
                  </SelectBox>
                </Field>
                <Field label="Decision letter to the author" required><TextArea rows="6" value={letter} onChange={(e) => setLetter(e.target.value)} placeholder="Editorial instructions, list of revisions, overall remarks..." /></Field>
                <Btn disabled={busy || letter.trim().length < 10} onClick={() => submit('decision', { decision, letter })} className="w-full">Submit Final Decision</Btn>
              </div>
            ) : (
              <div className="space-y-4">
                <Field label="Recommendation to the EIC">
                  <SelectBox value={decision} onChange={(e) => setDecision(e.target.value)}>
                    <option value="ACCEPT">Accept</option><option value="MINOR_REVISION">Minor Revision</option>
                    <option value="MAJOR_REVISION">Major Revision</option><option value="REJECT">Reject</option>
                  </SelectBox>
                </Field>
                <Field label="Summary of the reviews" required><TextArea rows="6" value={summary} onChange={(e) => setSummary(e.target.value)} /></Field>
                <Btn disabled={busy || summary.trim().length < 10} onClick={() => submit('recommendation', { recommendation: decision, summary })} className="w-full">Send Recommendation</Btn>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
