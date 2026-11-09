import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicShell, { Note } from '../components/PublicShell';
import ArticleList from './ArticleList';
import { get } from '../api';
import { useLoad, useDebounced } from '../hooks';
import { fmtDate } from '../format';

export default function JournalsPage() {
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const { data: journals, loading, error } = useLoad(() => get('/public/journals'));
  const { data: issues } = useLoad(() => get('/public/issues'));
  const { data: results } = useLoad(() => (dq ? get('/public/articles', { search: dq }) : Promise.resolve({ data: null })), [dq]);
  return (
    <PublicShell eyebrow="Journals" title="Journals & Issues" subtitle="Browse our journals, their issues and articles.">
      <div className="mb-10">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles by title, abstract or DOI…" className="w-full px-5 py-3 rounded-xl border border-gray-200 bg-white text-[14px] outline-none focus:border-[#7A1C39]" />
      </div>
      {dq ? (<><h2 className="text-[20px] font-serif font-bold mb-5">Search results</h2><ArticleList articles={results} empty="No articles match your search." /></>) : loading ? <Note>Loading…</Note> : error ? <Note>{error}</Note> : (
        (journals || []).map((j) => (
          <div key={j.id} className="mb-12">
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm mb-6">
              <h2 className="text-[24px] font-serif font-bold text-gray-900">{j.title}</h2>
              <p className="text-[12px] text-gray-500 mt-1">{j.publisher}{j.issn ? ` · ISSN ${j.issn}` : ''}{j.e_issn ? ` · e-ISSN ${j.e_issn}` : ''} · {j.article_count} article(s)</p>
              {j.description && <p className="text-[14px] text-gray-600 mt-4 leading-relaxed">{j.description}</p>}
              <div className="mt-5 flex gap-4 text-[13px] font-bold text-[#7A1C39]"><Link to="/author-guide" className="hover:underline">Author guide</Link><Link to="/editorial" className="hover:underline">Editorial board</Link></div>
            </div>
            <h3 className="text-[16px] font-bold text-gray-900 mb-3">Issues</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(issues || []).map((i) => (
                <Link key={i.id} to={`/issues/${i.id}`} className="bg-white rounded-xl border border-gray-100 p-5 hover:border-[#7A1C39]/30 hover:shadow-md transition-all">
                  <p className="text-[14px] font-bold text-gray-900">Volume {i.volume}, Issue {i.issue_number}</p>
                  <p className="text-[12px] text-gray-500">{fmtDate(i.publication_date)} · {i.article_count} article(s)</p>
                </Link>
              ))}
              {!issues?.length && <Note>No issues have been published yet.</Note>}
            </div>
          </div>
        ))
      )}
    </PublicShell>
  );
}
