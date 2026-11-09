import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { message } from 'antd';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, Card, Btn, Field, TextArea, TextInput, Pill, Loading, ErrorNote, useTokens } from '../../ui';
import { ManuscriptSummary } from '../../parts';
import { del, get, post, errorMessage } from '../../api';
import { useLoad } from '../../hooks';
import { fmtDate } from '../../format';

const TONE = { INVITED: 'orange', ACCEPTED: 'blue', COMPLETED: 'green', DECLINED: 'red', CANCELLED: 'gray' };

export default function AssignReviewerDetail() {
  const t = useTokens();
  const { id } = useParams();
  const { data: m, loading, error, reload } = useLoad(() => get(`/editorial/manuscripts/${id}`), [id]);
  const { data: reviewers, reload: reloadReviewers } = useLoad(() => get('/editorial/reviewers', { manuscript_id: id }), [id]);
  const [filter, setFilter] = useState('');
  const [picked, setPicked] = useState([]);
  const [days, setDays] = useState(21);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    try { const r = await fn(); message.success(r.message); reload(); reloadReviewers(); return true; }
    catch (e) { message.error(errorMessage(e)); return false; } finally { setBusy(false); }
  };
  const invite = async () => { if (await run(() => post(`/editorial/manuscripts/${id}/reviewers`, { reviewer_ids: picked, due_days: Number(days), message: note || undefined }))) setPicked([]); };

  if (loading) return <AdminLayout><Loading /></AdminLayout>;
  if (error || !m) return <AdminLayout><ErrorNote error={error || 'Not found.'} /></AdminLayout>;
  const round = m.reviews.filter((r) => r.round === m.current_round);
  const taken = new Set(round.filter((r) => r.status !== 'CANCELLED').map((r) => r.reviewer_id));
  const list = (reviewers || []).filter((r) => !taken.has(r.id) && `${r.name} ${r.expertise}`.toLowerCase().includes(filter.toLowerCase()));
  const canInvite = m.status === 'UNDER_REVIEW';
  const toggle = (rid) => setPicked((p) => (p.includes(rid) ? p.filter((x) => x !== rid) : [...p, rid]));

  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader back={{ to: '/eic/assign-reviewers', label: 'Back to Peer Review Queue' }} eyebrow="WORKSPACE / REVIEWERS / ASSIGN" title="Assign Reviewers" subtitle="Double-blind: reviewers never see the author names." />
        <ManuscriptSummary m={m} />

        <Card title={`Reviewers for round ${m.current_round}`} className="mb-6">
          {round.length === 0 && <p className={`text-[13px] ${t.textMuted}`}>No reviewers invited yet.</p>}
          {round.map((r) => (
            <div key={r.id} className={`flex flex-wrap justify-between items-center gap-3 py-3 border-b last:border-0 ${t.borderCol}`}>
              <div>
                <p className={`text-[13px] font-bold ${t.textMain}`}>{r.reviewer_name}</p>
                <p className={`text-[11px] ${t.textMuted}`}>Invited {fmtDate(r.invited_at)} · due {fmtDate(r.due_date)}{r.decline_reason ? ` · "${r.decline_reason}"` : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <Pill tone={TONE[r.status]}>{r.status.toLowerCase()}</Pill>
                {['INVITED', 'ACCEPTED'].includes(r.status) && <button onClick={() => run(() => del(`/editorial/assignments/${r.id}`))} className="text-[12px] font-bold text-red-600 hover:underline">Remove</button>}
              </div>
            </div>
          ))}
        </Card>

        {canInvite && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card title="Available reviewers" className="lg:col-span-8" right={<div className="w-64"><TextInput placeholder="Filter by name or expertise..." value={filter} onChange={(e) => setFilter(e.target.value)} /></div>}>
              {list.length === 0 && <p className={`text-[13px] ${t.textMuted}`}>No reviewers found. Give people the “Reviewer” role in the JMS module (Users → Roles).</p>}
              {list.map((r) => (
                <label key={r.id} className={`flex items-center gap-4 p-3 rounded-lg border mb-2 cursor-pointer ${picked.includes(r.id) ? 'border-[#7A1849] bg-[#FCF7F9]' : t.isDarkMode ? 'border-[#3D3D3D]' : 'border-gray-200'}`}>
                  <input type="checkbox" checked={picked.includes(r.id)} onChange={() => toggle(r.id)} className="accent-[#7A1849] w-4 h-4" />
                  <div className="flex-1">
                    <p className={`text-[13px] font-bold ${picked.includes(r.id) ? 'text-[#7A1849]' : t.textMain}`}>{r.name}</p>
                    <p className={`text-[11px] ${t.textMuted}`}>{r.expertise || 'No expertise listed'}{r.affiliation ? ` · ${r.affiliation}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <Pill tone={r.status === 'Available' ? 'green' : r.status === 'Busy' ? 'orange' : 'gray'}>{r.status}</Pill>
                    <p className={`text-[10px] mt-1 ${t.textMuted}`}>{r.active} active · avg {r.avg_days ?? '—'} days</p>
                  </div>
                </label>
              ))}
            </Card>
            <Card title="Invitation" className="lg:col-span-4">
              <div className="space-y-4">
                <Field label="Review deadline (days)"><TextInput type="number" min="3" max="90" value={days} onChange={(e) => setDays(e.target.value)} /></Field>
                <Field label="Notes to reviewers"><TextArea rows="4" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Specific focus areas, methodology notes..." /></Field>
                <Btn disabled={busy || !picked.length} onClick={invite} className="w-full">Invite {picked.length || ''} reviewer{picked.length === 1 ? '' : 's'}</Btn>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
