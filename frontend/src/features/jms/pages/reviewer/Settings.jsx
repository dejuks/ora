import React, { useEffect, useState } from 'react';
import { message } from 'antd';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, Card, Btn, Field, TextArea, TextInput, Loading, ErrorNote, useTokens } from '../../ui';
import { get, put, errorMessage } from '../../api';
import { useLoad } from '../../hooks';

export default function ReviewerSettings() {
  const t = useTokens();
  const { data, loading, error } = useLoad(() => get('/reviewer/profile'));
  const [f, setF] = useState({ expertise: '', affiliation: '', orcid: '', is_available: true });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setF({ expertise: data.expertise || '', affiliation: data.affiliation || '', orcid: data.orcid || '', is_available: data.is_available }); }, [data]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setBusy(true);
    try { const r = await put('/reviewer/profile', f); message.success(r.message); } catch (e) { message.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <AdminLayout>
      <div className="max-w-[800px] mx-auto animate-fade-in-up">
        <PageHeader eyebrow="WORKSPACE / SETTINGS" title="Reviewer Profile" subtitle="Editors use this to invite you to the right manuscripts." />
        <ErrorNote error={error} />
        {loading ? <Loading /> : (
          <Card>
            <div className="space-y-5">
              <Field label="Areas of expertise" hint="Comma separated, e.g. Oromo history, linguistics, sociology"><TextArea rows="3" value={f.expertise} onChange={set('expertise')} /></Field>
              <Field label="Affiliation"><TextInput value={f.affiliation} onChange={set('affiliation')} /></Field>
              <Field label="ORCID iD" hint="Format 0000-0000-0000-0000"><TextInput value={f.orcid} onChange={set('orcid')} placeholder="0000-0002-1825-0097" /></Field>
              <label className={`flex items-center gap-2 text-[13px] ${t.textMain}`}><input type="checkbox" className="accent-[#7A1849] w-4 h-4" checked={f.is_available} onChange={(e) => setF({ ...f, is_available: e.target.checked })} /> I am available to review new manuscripts</label>
              <Btn onClick={save} disabled={busy}>Save profile</Btn>
            </div>
          </Card>
        )}
        <p className={`text-[12px] mt-4 ${t.textMuted}`}>Name, email and password are managed under <a href="/account" className="text-[#7A1849] font-bold">My account</a>.</p>
      </div>
    </AdminLayout>
  );
}
