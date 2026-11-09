import React, { useEffect, useState } from 'react';
import { message } from 'antd';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, Card, Btn, Field, TextArea, TextInput, SelectBox, ListTable, Cell, Loading, ErrorNote, useTokens } from '../../ui';
import { get, post, put, del, errorMessage } from '../../api';
import { useLoad } from '../../hooks';

export default function JournalSettings() {
  const t = useTokens();
  const { data: journals, loading, error, reload } = useLoad(() => get('/admin/journals'));
  const [jid, setJid] = useState(null);
  const j = (journals || []).find((x) => x.id === jid) || (journals || [])[0];
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (j) { setJid(j.id); setF({ title: j.title, description: j.description || '', aims_scope: j.aims_scope || '', issn: j.issn || '', e_issn: j.e_issn || '', publisher: j.publisher, language: j.language, review_model: j.review_model, apc_amount: j.apc_amount, apc_currency: j.apc_currency, is_active: j.is_active }); } }, [j?.id, journals]); // eslint-disable-line
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setBusy(true);
    try { const r = await put(`/admin/journals/${j.id}`, { ...f, apc_amount: Number(f.apc_amount) }); message.success(r.message); reload(); }
    catch (e) { message.error(errorMessage(e)); } finally { setBusy(false); }
  };

  const { data: staff, reload: reloadStaff } = useLoad(() => (j ? get(`/admin/journals/${j.id}/staff`) : Promise.resolve({ data: [] })), [j?.id]);
  const [s, setS] = useState({ full_name: '', position: 'Editorial Board Member', affiliation: '', display_order: 0 });
  const addStaff = async () => {
    try { const r = await post(`/admin/journals/${j.id}/staff`, { ...s, display_order: Number(s.display_order) || 0 }); message.success(r.message); setS({ ...s, full_name: '', affiliation: '' }); reloadStaff(); }
    catch (e) { message.error(errorMessage(e)); }
  };
  const removeStaff = async (id) => { try { const r = await del(`/admin/staff/${id}`); message.success(r.message); reloadStaff(); } catch (e) { message.error(errorMessage(e)); } };

  if (loading) return <AdminLayout><Loading /></AdminLayout>;
  return (
    <AdminLayout>
      <div className="max-w-[1100px] mx-auto animate-fade-in-up">
        <PageHeader eyebrow="WORKSPACE / JOURNAL SETTING" title="Journal Setting" subtitle="Identity, review model, publication fee and editorial board." />
        <ErrorNote error={error} />
        {!j || !f ? <Card><p className={`text-[13px] ${t.textMuted}`}>No journal found. Run the database migration to create the default journal.</p></Card> : (
          <>
            {journals.length > 1 && <div className="mb-4 max-w-sm"><SelectBox value={j.id} onChange={(e) => setJid(e.target.value)}>{journals.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</SelectBox></div>}
            <Card title={`${j.title} (${j.code})`} className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><Field label="Title" required><TextInput value={f.title} onChange={set('title')} /></Field></div>
                <Field label="ISSN"><TextInput value={f.issn} onChange={set('issn')} placeholder="1234-5678" /></Field>
                <Field label="e-ISSN"><TextInput value={f.e_issn} onChange={set('e_issn')} placeholder="1234-5678" /></Field>
                <Field label="Publisher"><TextInput value={f.publisher} onChange={set('publisher')} /></Field>
                <Field label="Language"><TextInput value={f.language} onChange={set('language')} /></Field>
                <Field label="Review model"><SelectBox value={f.review_model} onChange={set('review_model')}><option value="DOUBLE_BLIND">Double blind</option><option value="SINGLE_BLIND">Single blind</option><option value="OPEN">Open</option></SelectBox></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Publication fee (APC)"><TextInput type="number" min="0" value={f.apc_amount} onChange={set('apc_amount')} /></Field>
                  <Field label="Currency"><TextInput maxLength={3} value={f.apc_currency} onChange={set('apc_currency')} /></Field>
                </div>
                <div className="md:col-span-2"><Field label="Description"><TextArea rows="3" value={f.description} onChange={set('description')} /></Field></div>
                <div className="md:col-span-2"><Field label="Aims and scope"><TextArea rows="5" value={f.aims_scope} onChange={set('aims_scope')} /></Field></div>
                <label className={`flex items-center gap-2 text-[13px] ${t.textMain}`}><input type="checkbox" className="accent-[#7A1849] w-4 h-4" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> Journal is active (accepting submissions)</label>
              </div>
              <div className="mt-5"><Btn disabled={busy} onClick={save}>Save journal</Btn></div>
            </Card>

            <Card title="Editorial board" subtitle="Shown on the public Editorial Board page.">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-5 items-end">
                <div className="md:col-span-2"><Field label="Full name"><TextInput value={s.full_name} onChange={(e) => setS({ ...s, full_name: e.target.value })} /></Field></div>
                <Field label="Position"><SelectBox value={s.position} onChange={(e) => setS({ ...s, position: e.target.value })}>{['Editor-in-Chief', 'Associate Editor', 'Managing Editor', 'Editorial Board Member', 'Advisory Board Member'].map((p) => <option key={p} value={p}>{p}</option>)}</SelectBox></Field>
                <Field label="Affiliation"><TextInput value={s.affiliation} onChange={(e) => setS({ ...s, affiliation: e.target.value })} /></Field>
                <Btn disabled={s.full_name.trim().length < 2} onClick={addStaff}>Add</Btn>
              </div>
              <ListTable data={staff} empty="No board members yet." pageSize={20}
                columns={[
                  { title: 'NAME', render: (_, x) => <Cell.Title sub={x.affiliation}>{x.full_name}</Cell.Title> },
                  { title: 'POSITION', dataIndex: 'position', render: (v) => <Cell.Muted>{v}</Cell.Muted> },
                  { title: '', align: 'right', render: (_, x) => <button className="text-red-600 text-[12px] font-bold hover:underline" onClick={() => removeStaff(x.id)}>Remove</button> },
                ]} />
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
