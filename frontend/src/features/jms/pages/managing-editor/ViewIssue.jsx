import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, Card, Btn, Pill, Loading, ErrorNote, useTokens } from '../../ui';
import { get } from '../../api';
import { useLoad } from '../../hooks';
import { fmtDate } from '../../format';
import { ISSUE_TONE } from './Issues';

export default function ViewIssue() {
  const t = useTokens();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: i, loading, error } = useLoad(() => get(`/production/issues/${id}`), [id]);
  if (loading) return <AdminLayout><Loading /></AdminLayout>;
  if (error || !i) return <AdminLayout><ErrorNote error={error || 'Not found.'} /></AdminLayout>;
  return (
    <AdminLayout>
      <div className="max-w-[1100px] mx-auto animate-fade-in-up">
        <PageHeader back={{ to: '/managing-editor/issues', label: 'Back to Issues' }} eyebrow={i.journal_title} title={`Volume ${i.volume}, Issue ${i.issue_number}${i.title ? ` — ${i.title}` : ''}`}
          subtitle={`Publication date ${fmtDate(i.publication_date)}`} actions={<><Pill tone={ISSUE_TONE[i.status]}>{i.status.toLowerCase()}</Pill><Btn kind="ghost" to={`/managing-editor/issues/edit/${id}`}>Edit</Btn></>} />
        {i.description && <Card className="mb-6"><p className={`text-[13px] ${t.textMain}`}>{i.description}</p></Card>}
        <Card title={`Articles (${i.articles.length})`}>
          {i.articles.length === 0 && <p className={`text-[13px] ${t.textMuted}`}>No articles in this issue yet.</p>}
          {i.articles.map((a) => (
            <div key={a.id} className={`py-3 border-b last:border-0 cursor-pointer ${t.borderCol}`} onClick={() => navigate(`/managing-editor/published/${a.id}`)}>
              <p className={`text-[13px] font-bold ${t.textMain}`}>{a.title}</p>
              <p className={`text-[11px] ${t.textMuted}`}>{a.author_names} · {a.pages ? `pp. ${a.pages} · ` : ''}{a.doi}</p>
            </div>
          ))}
        </Card>
      </div>
    </AdminLayout>
  );
}
