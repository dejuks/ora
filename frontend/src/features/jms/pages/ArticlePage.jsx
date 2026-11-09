import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicShell, { Note } from '../components/PublicShell';
import { get } from '../api';
import jms from '../api';
import { useLoad } from '../hooks';
import { fmtDate } from '../format';

const STYLES = [['apa', 'APA'], ['mla', 'MLA'], ['chicago', 'Chicago'], ['harvard', 'Harvard']];

export default function ArticlePage() {
  const { id } = useParams();
  const { data: a, loading, error } = useLoad(() => get(`/public/articles/${id}`), [id]);
  const [style, setStyle] = useState('apa');
  const { data: cite } = useLoad(() => get(`/public/articles/${id}/cite`, { style }), [id, style]);

  const download = async (path, name) => {
    const res = await jms.get(path, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const el = document.createElement('a'); el.href = url; el.download = name; document.body.appendChild(el); el.click(); el.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (loading) return <PublicShell title="Loading..."><Note>Loading article…</Note></PublicShell>;
  if (error || !a) return <PublicShell title="Article"><Note>{error || 'Article not found.'}</Note></PublicShell>;
  const authors = (a.authors || []).map((x) => x.name).join(', ');
  return (
    <PublicShell eyebrow={`${a.journal_title} · Vol. ${a.volume}, Issue ${a.issue_number}`} title={a.title} subtitle={`${authors} · Published ${fmtDate(a.published_at)}`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <article className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <h2 className="text-[18px] font-serif font-bold mb-3">Abstract</h2>
          <p className="text-[14px] leading-[1.9] text-gray-700">{a.abstract}</p>
          {a.keywords?.length > 0 && <p className="text-[13px] text-gray-500 mt-5"><strong>Keywords:</strong> {a.keywords.join(', ')}</p>}
          {a.correction_note && <p className="mt-5 p-3 bg-amber-50 text-amber-900 text-[13px] rounded-lg"><strong>Correction:</strong> {a.correction_note}</p>}
        </article>
        <aside className="lg:col-span-4 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-3 text-[13px]">
            <p><span className="text-gray-400">DOI</span><br /><span className="font-mono font-bold break-all">{a.doi}</span></p>
            <p><span className="text-gray-400">License</span><br />{a.license}</p>
            {a.pages && <p><span className="text-gray-400">Pages</span><br />{a.pages}</p>}
            <button onClick={() => download(`/public/articles/${id}/pdf`, `${a.manuscript_no || 'article'}.pdf`)} className="w-full bg-[#7A1849] text-white py-2.5 rounded-lg font-bold hover:bg-[#5E1136]">Download PDF</button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-[14px] font-bold mb-3">How to cite</h3>
            <div className="flex gap-2 mb-3 flex-wrap">{STYLES.map(([k, l]) => <button key={k} onClick={() => setStyle(k)} className={`px-3 py-1 rounded-md text-[11px] font-bold ${style === k ? 'bg-[#7A1849] text-white' : 'bg-gray-100 text-gray-600'}`}>{l}</button>)}</div>
            <p className="text-[12px] text-gray-700 leading-relaxed break-words">{cite?.citation || '…'}</p>
            <div className="flex gap-4 mt-4 text-[12px] font-bold text-[#7A1849]">
              <button onClick={() => download(`/public/articles/${id}/cite?style=ris&download=1`, 'citation.ris')} className="hover:underline">RIS</button>
              <button onClick={() => download(`/public/articles/${id}/cite?style=bibtex&download=1`, 'citation.bib')} className="hover:underline">BibTeX</button>
            </div>
          </div>
          <Link to={`/issues/${a.issue_id}`} className="block text-[13px] font-bold text-[#7A1849] hover:underline">&larr; Back to the issue</Link>
        </aside>
      </div>
    </PublicShell>
  );
}
