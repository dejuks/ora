import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { message as toast } from 'antd';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, Card, Btn, Loading, ErrorNote, useTokens } from '../../ui';
import { get, patch, del, errorMessage } from '../../api';
import { useLoad } from '../../hooks';
import { fmtDate } from '../../format';

export default function MessageDetail() {
  const t = useTokens();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: m, loading, error, reload } = useLoad(() => get(`/admin/messages/${id}`), [id]);
  const run = async (fn, done) => { try { const r = await fn(); toast.success(r.message); done ? done() : reload(); } catch (e) { toast.error(errorMessage(e)); } };
  if (loading) return <AdminLayout><Loading /></AdminLayout>;
  if (error || !m) return <AdminLayout><ErrorNote error={error || 'Not found.'} /></AdminLayout>;
  return (
    <AdminLayout>
      <div className="max-w-[900px] mx-auto animate-fade-in-up">
        <PageHeader back={{ to: '/admin/messages', label: 'Back to Messages' }} eyebrow="WORKSPACE / MESSAGES" title={m.subject} subtitle={`${m.name} <${m.email}> · ${fmtDate(m.created_at)}`} />
        <Card><p className={`text-[14px] leading-[1.8] whitespace-pre-wrap ${t.textMain}`}>{m.body}</p></Card>
        <div className="flex gap-3 mt-6">
          <a href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + m.subject)}`} className="px-5 py-2 rounded-lg text-[13px] font-bold bg-[#7A1849] text-white hover:bg-[#5E1136]">Reply by email</a>
          <Btn kind="ghost" onClick={() => run(() => patch(`/admin/messages/${id}`, { status: m.status === 'ARCHIVED' ? 'READ' : 'ARCHIVED' }))}>{m.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}</Btn>
          <Btn kind="danger" onClick={() => run(() => del(`/admin/messages/${id}`), () => navigate('/admin/messages'))}>Delete</Btn>
        </div>
      </div>
    </AdminLayout>
  );
}
