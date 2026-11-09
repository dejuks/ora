import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, StatCards, Card, Pill, Btn, Loading, ErrorNote, useTokens } from '../../ui';
import { get } from '../../api';
import { useLoad } from '../../hooks';
import { fmtDate } from '../../format';

export const PROGRESS_TONE = { Completed: 'green', Overdue: 'red', 'In Progress': 'blue', 'Awaiting response': 'orange', 'N/A': 'gray' };

export default function ReviewerDashboard() {
  const t = useTokens();
  const navigate = useNavigate();
  const { data: d, loading, error } = useLoad(() => get('/reviewer/dashboard'));
  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader eyebrow="WORKSPACE / DASHBOARD" title="Reviewer Dashboard" subtitle="Your invitations and peer reviews."
          actions={<Btn to="/reviewer/pending">Reviews waiting for you</Btn>} />
        <ErrorNote error={error} />
        {loading || !d ? <Loading /> : (
          <>
            <StatCards items={[
              { label: 'New invitations', value: d.pending_invitations, sub: 'Waiting for your answer', subColor: d.pending_invitations ? 'text-amber-600' : 'text-gray-400' },
              { label: 'In progress', value: d.in_progress, sub: `${d.overdue} overdue`, subColor: d.overdue ? 'text-red-500' : 'text-gray-400' },
              { label: 'Completed', value: d.completed, sub: 'Reviews submitted', subColor: 'text-green-600' },
              { label: 'Average turnaround', value: d.avg_days == null ? '—' : `${d.avg_days} days` },
            ]} />
            <Card title="Recent assignments">
              {d.recent.length === 0 && <p className={`text-[13px] ${t.textMuted}`}>You have no review assignments yet.</p>}
              {d.recent.map((a) => (
                <div key={a.id} className={`flex flex-wrap justify-between items-center gap-3 py-3 border-b last:border-0 ${t.borderCol}`}>
                  <div className="min-w-0">
                    <p className={`text-[13px] font-bold truncate ${t.textMain}`}>{a.title}</p>
                    <p className={`text-[11px] ${t.textMuted}`}>{a.manuscript_no} · invited {fmtDate(a.invited_at)} · due {fmtDate(a.due_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Pill tone={PROGRESS_TONE[a.progress]}>{a.progress}</Pill>
                    <button onClick={() => navigate(`/reviewer/assignment/${a.id}`)} className="text-[#7A1849] font-bold text-[12px] hover:underline">Open</button>
                  </div>
                </div>
              ))}
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
