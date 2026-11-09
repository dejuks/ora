import React from 'react';
import { Link } from 'react-router-dom';
import PublicShell, { Note } from '../components/PublicShell';
import { get } from '../api';
import { useLoad } from '../hooks';
import { fmtDate } from '../format';

export default function Issues() {
  const { data, loading, error } = useLoad(() => get('/public/issues'));
  return (
    <PublicShell eyebrow="Archive" title="All Issues" subtitle="Every published volume and issue.">
      {loading ? <Note>Loading…</Note> : error ? <Note>{error}</Note> : !data?.length ? <Note>No issues have been published yet.</Note> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((i) => (
            <Link key={i.id} to={`/issues/${i.id}`} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all">
              <p className="text-[11px] font-bold text-[#7A1C39] uppercase tracking-wider">{fmtDate(i.publication_date)}</p>
              <h3 className="text-[18px] font-serif font-bold text-gray-900 mt-1">Volume {i.volume}, Issue {i.issue_number}</h3>
              {i.title && <p className="text-[13px] text-gray-600 mt-1">{i.title}</p>}
              <p className="text-[12px] text-gray-400 mt-3">{i.article_count} article(s)</p>
            </Link>
          ))}
        </div>
      )}
    </PublicShell>
  );
}
