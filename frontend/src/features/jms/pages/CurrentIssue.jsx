import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { FilePdfOutlined } from '@ant-design/icons';
import PublicShell, { Note } from '../components/PublicShell';
import jms, { get } from '../api';
import { useLoad } from '../hooks';
import { fmtDate } from '../format';

async function openPdf(id) {
  const res = await jms.get(`/public/articles/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Right-hand column: submission call-to-action + information links. */
function IssueSidebar() {
  const link = 'block text-[12px] text-[#7A1C39] hover:underline py-1';
  return (
    <aside className="lg:w-[220px] shrink-0">
      <Link to="/author/submit" className="inline-block border border-gray-400 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[11px] font-semibold px-3 py-1.5 rounded-sm">Make a Submission</Link>
      <h3 className="text-[13px] font-bold text-gray-700 mt-8 mb-2">Information</h3>
      <Link to="/issues/current" className={link}>For Readers</Link>
      <Link to="/author-guide" className={link}>For Authors</Link>
      <Link to="/contact" className={link}>For Librarians</Link>
    </aside>
  );
}

/** Journal-style issue page: Vol/No/Year, published date, articles with pages and PDF button. */
function IssueBody({ issue }) {
  const year = issue.publication_date ? new Date(issue.publication_date).getFullYear() : '';
  return (
    <div className="bg-white border border-gray-200">
      <div className="px-6 pt-6 pb-8">
        <h2 className="text-[15px] font-bold text-gray-900 mb-5">Current Issue</h2>
        <p className="text-[13px] font-bold text-gray-900">
          Vol. {issue.volume} No. {issue.issue_number} {year && `(${year})`}{issue.title ? ` — ${issue.title}` : ''}
        </p>
        <p className="text-[12px] text-gray-900 mt-5"><strong>Published:</strong> {fmtDate(issue.publication_date)}</p>
        {issue.description && <p className="text-[12px] text-gray-600 mt-4 max-w-2xl">{issue.description}</p>}
      </div>

      <div className="relative border-t border-gray-200 px-6 pt-8 pb-4">
        <span className="absolute -top-2.5 left-6 bg-white pr-2 text-[11px] text-gray-500">Articles</span>
        {!issue.articles?.length ? <Note>This issue has no articles yet.</Note> : (
          <ul>
            {issue.articles.map((a) => (
              <li key={a.id} className="mb-7">
                <Link to={`/articles/${a.id}`} className="text-[12px] font-bold text-[#7A1C39] hover:underline leading-snug">{a.title}</Link>
                <div className="flex justify-between gap-4 mt-3">
                  <p className="text-[11px] text-gray-800">{(a.authors || []).map((x) => x.name).join(', ')}</p>
                  {a.pages && <span className="text-[11px] text-gray-500 shrink-0">{a.pages}</span>}
                </div>
                <button
                  onClick={() => openPdf(a.id).catch(() => {})}
                  className="mt-3 inline-flex items-center gap-1.5 border border-[#7A1C39] text-[#7A1C39] hover:bg-[#7A1C39] hover:text-white text-[11px] px-2.5 py-0.5 rounded-sm transition-colors"
                >
                  <FilePdfOutlined /> pdf
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** /issues/current and /issues/:id */
export default function IssuePage() {
  const { id: issueId } = useParams();
  const { data: i, loading, error } = useLoad(() => get(issueId ? `/public/issues/${issueId}` : '/public/issues/current'), [issueId]);
  if (loading) return <PublicShell title="Loading..."><Note>Loading issue…</Note></PublicShell>;
  if (error) return <PublicShell title="Issue"><Note>{error}</Note></PublicShell>;
  if (!i) return <PublicShell eyebrow="Current issue" title="No issue published yet" subtitle="The first issue will appear here once articles are published."><Note>Please check back soon.</Note></PublicShell>;
  return (
    <PublicShell eyebrow={i.journal_title} title={`Volume ${i.volume}, Issue ${i.issue_number}`} subtitle={`${fmtDate(i.publication_date)}${i.issn ? ' · ISSN ' + i.issn : ''}`}>
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 min-w-0 w-full"><IssueBody issue={i} /></div>
        <IssueSidebar />
      </div>
      <div className="mt-8"><Link to="/issues" className="text-[13px] font-bold text-[#7A1C39] hover:underline">&larr; All issues</Link></div>
    </PublicShell>
  );
}
