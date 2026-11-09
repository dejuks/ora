import React from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicShell, { Note } from '../components/PublicShell';
import { get } from '../api';
import { useLoad } from '../hooks';
import { fmtDate } from '../format';

export default function Announcements() {
  const { id } = useParams();
  const { data, loading, error } = useLoad(() => get(id ? `/public/announcements/${id}` : '/public/announcements'), [id]);
  if (loading) return <PublicShell title="Announcements"><Note>Loading…</Note></PublicShell>;
  if (error) return <PublicShell title="Announcements"><Note>{error}</Note></PublicShell>;
  if (id) return (
    <PublicShell eyebrow="Announcement" title={data.title} subtitle={fmtDate(data.published_at)}>
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-[14px] leading-7 text-gray-700 whitespace-pre-line">{data.body}</div>
      <div className="mt-8"><Link to="/announcements" className="text-[13px] font-bold text-[#7A1C39] hover:underline">&larr; All announcements</Link></div>
    </PublicShell>
  );
  return (
    <PublicShell eyebrow="News" title="Announcements" subtitle="Calls for papers and journal news.">
      {!data?.length ? <Note>No announcements yet.</Note> : (
        <div className="space-y-4">
          {data.map((a) => (
            <Link key={a.id} to={`/announcements/${a.id}`} className="group block bg-white p-5 rounded-xl border border-gray-200 hover:border-[#7A1C39]/30 hover:shadow-md transition-all">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A1C39] mb-1">{fmtDate(a.published_at)}</p>
              <h3 className="text-[16px] font-bold text-gray-900 group-hover:text-[#7A1C39]">{a.title}</h3>
              <p className="text-[13px] text-gray-500 mt-1">{String(a.body).slice(0, 200)}{a.body.length > 200 ? '…' : ''}</p>
            </Link>
          ))}
        </div>
      )}
    </PublicShell>
  );
}
