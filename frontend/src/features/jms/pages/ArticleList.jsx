import React from 'react';
import { Link } from 'react-router-dom';
import { fmtDate } from '../format';
import { Note } from '../components/PublicShell';

/** Shared list of published articles (landing page, issue pages, search). */
export default function ArticleList({ articles, empty = 'No articles have been published yet.' }) {
  if (!articles?.length) return <Note>{empty}</Note>;
  return (
    <div className="space-y-4">
      {articles.map((a) => (
        <Link key={a.id} to={`/articles/${a.id}`} className="group block bg-white p-5 rounded-xl border border-gray-200 hover:border-[#7A1C39]/30 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider">
            <span className="text-[#7A1C39]">{a.article_type || 'Article'}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span className="text-gray-500 normal-case font-medium">{fmtDate(a.published_at)}</span>
          </div>
          <h3 className="text-[16px] font-bold text-gray-900 mb-1 group-hover:text-[#7A1C39] leading-snug">{a.title}</h3>
          <p className="text-[12px] text-gray-500">{(a.authors || []).map((x) => x.name).join(', ')}{a.pages ? ` · pp. ${a.pages}` : ''}</p>
          <p className="text-[11px] text-gray-400 mt-1 font-mono">{a.doi}</p>
        </Link>
      ))}
    </div>
  );
}
