import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { message } from 'antd';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, Card, Btn, Field, TextArea, TextInput, Pill, Loading, ErrorNote, useTokens } from '../../ui';
import { ManuscriptSummary, Timeline } from '../../parts';
import { get, patch, errorMessage } from '../../api';
import jms from '../../api';
import { useLoad } from '../../hooks';
import { fmtDate, money } from '../../format';
import { FEE_TONE, PROD_LABEL, PROD_TONE } from './PendingProduction';

export default function ProductionDetail() {
  const t = useTokens();
  const { id } = useParams();
  const { data: m, loading, error, reload } = useLoad(() => get(`/production/manuscripts/${id}`), [id]);
  const [form, setForm] = useState({ message: '', response_due: '', internal_notes: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const sendProof = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      if (file) fd.append('file', file);
      const r = (await jms.post(`/production/manuscripts/${id}/proofs`, fd)).data;
      message.success(r.message); setForm({ message: '', response_due: '', internal_notes: '' }); setFile(null); reload();
    } catch (e) { message.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const feeAction = async (action) => {
    setBusy(true);
    try { const r = await patch(`/production/fees/${m.fee.id}`, { action }); message.success(r.message); reload(); }
    catch (e) { message.error(errorMessage(e)); } finally { setBusy(false); }
  };

  if (loading) return <AdminLayout><Loading /></AdminLayout>;
  if (error || !m) return <AdminLayout><ErrorNote error={error || 'Not found.'} /></AdminLayout>;
  const fee = m.fee;
  const canSend = !['SENT'].includes(m.proofs[0]?.status) && m.proofs[0]?.status !== 'ACCEPTED';
  const feeCleared = !fee || ['PAID', 'WAIVED', 'CANCELLED'].includes(fee.status);
  const ready = m.production_status === 'PROOF_ACCEPTED' && feeCleared;

  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader back={{ to: '/managing-editor/pending-production', label: 'Back to Production Queue' }} eyebrow="WORKSPACE / PRODUCTION" title="Production"
          actions={<Pill tone={PROD_TONE[m.production_status]}>{PROD_LABEL[m.production_status]}</Pill>} />
        <ManuscriptSummary m={m} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <Card title="Publication fee" className="lg:col-span-5">
            {!fee ? <p className={`text-[13px] ${t.textMuted}`}>No fee applies to this manuscript.</p> : (
              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between"><span className={t.textMuted}>Amount</span><b className={t.textMain}>{money(fee.amount, fee.currency)}</b></div>
                <div className="flex justify-between"><span className={t.textMuted}>Status</span><Pill tone={FEE_TONE[fee.status]}>{fee.status.replace('_', ' ').toLowerCase()}</Pill></div>
                {fee.payment_reference && <div className="flex justify-between"><span className={t.textMuted}>Transaction ref.</span><b className={t.textMain}>{fee.payment_reference}</b></div>}
                {fee.waiver_reason && <div><p className={t.textMuted}>Waiver request</p><p className={t.textMain}>{fee.waiver_reason}</p></div>}
                <div className="flex flex-wrap gap-2 pt-3">
                  {['VERIFYING', 'PENDING'].includes(fee.status) && <Btn disabled={busy} onClick={() => feeAction('CONFIRM_PAYMENT')}>Confirm payment</Btn>}
                  {fee.status === 'VERIFYING' && <Btn kind="ghost" disabled={busy} onClick={() => feeAction('REJECT_PAYMENT')}>Reject payment</Btn>}
                  {['WAIVER_REQUESTED', 'PENDING'].includes(fee.status) && <Btn kind="ghost" disabled={busy} onClick={() => feeAction('WAIVE')}>Waive fee</Btn>}
                  {fee.status === 'WAIVER_REQUESTED' && <Btn kind="danger" disabled={busy} onClick={() => feeAction('REJECT_WAIVER')}>Reject waiver</Btn>}
                </div>
              </div>
            )}
          </Card>
          <Card title="Proofs" className="lg:col-span-7">
            {m.proofs.length === 0 && <p className={`text-[13px] ${t.textMuted}`}>No proof has been sent yet.</p>}
            {m.proofs.map((p) => (
              <div key={p.id} className={`py-3 border-b last:border-0 ${t.borderCol}`}>
                <div className="flex justify-between items-center"><b className={`text-[13px] ${t.textMain}`}>Proof v{p.version}</b><Pill tone={p.status === 'ACCEPTED' ? 'green' : p.status === 'CORRECTIONS' ? 'amber' : 'orange'}>{p.status.toLowerCase()}</Pill></div>
                <p className={`text-[11px] ${t.textMuted}`}>Sent {fmtDate(p.sent_at)} · respond by {fmtDate(p.response_due)}</p>
                {p.author_comments && <p className={`text-[12px] mt-1 p-2 rounded bg-amber-50 text-amber-900`}>Author: {p.author_comments}</p>}
              </div>
            ))}
          </Card>
        </div>

        {canSend && (
          <Card title={m.proofs.length ? 'Send a corrected proof' : 'Send the first proof'} className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Field label="Message to the author" required><TextArea rows="3" value={form.message} onChange={set('message')} /></Field></div>
              <Field label="Response due" required><TextInput type="date" value={form.response_due} onChange={set('response_due')} /></Field>
              <Field label="Proof file (PDF)"><input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-[12px]" /></Field>
              <div className="md:col-span-2"><Field label="Internal notes (not shown to the author)"><TextArea rows="2" value={form.internal_notes} onChange={set('internal_notes')} /></Field></div>
            </div>
            <div className="mt-4"><Btn disabled={busy || form.message.trim().length < 5 || !form.response_due} onClick={sendProof}>Send proof to author</Btn></div>
          </Card>
        )}

        <div className="flex items-center gap-3 mb-6">
          <Btn to={`/managing-editor/publish/${id}`} disabled={!ready}>Continue to publication</Btn>
          {!ready && <span className={`text-[12px] ${t.textMuted}`}>Requires an approved proof{fee ? ' and a paid or waived fee' : ''}.</span>}
        </div>
        <Card title="History"><Timeline events={m.timeline} /></Card>
      </div>
    </AdminLayout>
  );
}
