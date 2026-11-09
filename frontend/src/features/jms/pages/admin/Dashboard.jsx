import React from 'react';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, StatCards, Card, Btn, Loading, ErrorNote, useTokens } from '../../ui';
import { get } from '../../api';
import { useLoad } from '../../hooks';

export default function AdminDashboard() {
  const t = useTokens();
  const { data: d, loading, error } = useLoad(() => get('/admin/dashboard'));
  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader eyebrow="WORKSPACE / DASHBOARD" title="Journal Administration" subtitle="Journal setup, taxonomy and reader messages." />
        <ErrorNote error={error} />
        {loading || !d ? <Loading /> : (
          <>
            <StatCards items={[
              { label: 'Manuscripts', value: d.manuscripts, sub: 'Submitted (excl. drafts)', subColor: 'text-blue-600' },
              { label: 'Published articles', value: d.published, subColor: 'text-green-600', sub: `${d.journals} active journal(s)` },
              { label: 'Categories / types', value: `${d.categories} / ${d.article_types}` },
              { label: 'Unread messages', value: d.unread_messages, sub: 'From the contact form', subColor: d.unread_messages ? 'text-red-500' : 'text-gray-400' },
            ]} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[['Categories', 'Subject categories authors choose from.', '/admin/categories'], ['Article types', 'Original research, review, case study…', '/admin/subjects'], ['Journal setting', 'Title, ISSN, review model, APC and editorial board.', '/admin/settings']].map(([title, text, to]) => (
                <Card key={title} title={title}><p className={`text-[13px] mb-4 ${t.textMuted}`}>{text}</p><Btn to={to} kind="ghost">Open</Btn></Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
