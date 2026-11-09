import React, { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { message } from 'antd';
import AdminLayout from '../../layouts/JmsLayout';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeftOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import jms, { get, downloadFile, errorMessage } from '../../api';
import { useLoad } from '../../hooks';
import { REC_LABEL, bytes, fmtDate, money, statusLabel } from '../../format';

export default function ManuscriptDetail() {
  const { isDarkMode } = useTheme();
  const { id } = useParams();
  const { data: m, loading, error, reload } = useLoad(() => get(`/author/manuscripts/${id}`), [id]);
  const [response, setResponse] = useState('');
  const [busy, setBusy] = useState(false);
  const revInput = useRef(null);
  const [revFiles, setRevFiles] = useState([]);

  const bgCard = isDarkMode ? 'bg-[#1E1E1E] border-[#2D2D2D]' : 'bg-white border-gray-200';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const borderCol = isDarkMode ? 'border-[#2D2D2D]' : 'border-gray-100';

  const submitRevision = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('response_to_reviewers', response);
      revFiles.forEach((f) => fd.append('files', f));
      await jms.post(`/author/manuscripts/${id}/revise`, fd);
      message.success('Revision submitted.');
      setResponse(''); setRevFiles([]);
      reload();
    } catch (e) { message.error(errorMessage(e)); } finally { setBusy(false); }
  };

  if (loading) return <AdminLayout><p className={textMuted}>Loading...</p></AdminLayout>;
  if (error || !m) return <AdminLayout><p className="text-red-600">{error || 'Not found.'}</p></AdminLayout>;
  const dl = (f) => downloadFile(f.id, f.original_name).catch((e) => message.error(errorMessage(e)));

  return (
    <AdminLayout>
      <div className="max-w-[1200px] mx-auto animate-fade-in-up">
        <Link to="/author/submissions" className="text-[12px] font-bold text-[#7A1849] hover:underline flex items-center gap-1.5 mb-6"><ArrowLeftOutlined /> Back to My Submissions</Link>

        <div className={`p-6 md:p-8 rounded-xl border shadow-sm mb-6 ${bgCard}`}>
          <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
            <p className="text-[11px] font-bold tracking-widest uppercase text-[#7A1849]">{m.manuscript_no} · {m.journal_title}</p>
            <span className="bg-[#FCF7F9] text-[#7A1849] text-[11px] font-bold px-3 py-1 rounded-md">{statusLabel(m.status)}{m.current_round > 1 ? ` · Round ${m.current_round}` : ''}</span>
          </div>
          <h1 className={`text-[22px] font-bold tracking-tight mb-2 ${textMain}`}>{m.title}</h1>
          <p className={`text-[13px] ${textMuted}`}>{m.author_names}</p>
          <p className={`text-[12px] mt-1 ${textMuted}`}>{m.category} · {m.article_type} · Submitted {fmtDate(m.submitted_at)}</p>
          {m.article && <p className="text-[13px] mt-3 font-bold text-green-700">Published · DOI {m.article.doi}</p>}
        </div>

        {m.status === 'REVISION_REQUIRED' && (
          <div className="p-6 rounded-xl border-2 border-amber-300 bg-amber-50 mb-6">
            <h2 className="text-[15px] font-bold text-amber-900 mb-1">A revision is required</h2>
            <p className="text-[12px] text-amber-800 mb-4">Upload the revised manuscript and explain how you addressed each reviewer comment.</p>
            <input ref={revInput} type="file" accept=".pdf,.doc,.docx" multiple className="hidden" onChange={(e) => setRevFiles([...e.target.files])} />
            <button onClick={() => revInput.current?.click()} className="px-4 py-2 rounded-lg border border-amber-400 bg-white text-[12px] font-bold text-amber-900 flex items-center gap-2 mb-3"><UploadOutlined /> {revFiles.length ? `${revFiles.length} file(s) selected: ${revFiles.map((f) => f.name).join(', ')}` : 'Choose revised manuscript (first file) and optional response letter'}</button>
            <textarea rows="4" value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Response to reviewers..." className="w-full p-3 rounded-lg border border-amber-300 text-[13px] mb-3 bg-white text-gray-900" />
            <button disabled={busy || !revFiles.length || response.trim().length < 10} onClick={submitRevision} className="bg-[#7A1849] text-white px-5 py-2.5 rounded-lg text-[13px] font-bold disabled:opacity-50">Submit Revision</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className={`p-6 rounded-xl border shadow-sm ${bgCard}`}>
              <h2 className={`text-[15px] font-bold mb-3 ${textMain}`}>Abstract</h2>
              <p className={`text-[13px] leading-relaxed ${textMain}`}>{m.abstract}</p>
              <p className={`text-[12px] mt-3 ${textMuted}`}><strong>Keywords:</strong> {(m.keywords || []).join(', ')}</p>
            </div>

            {m.decisions.length > 0 && (
              <div className={`p-6 rounded-xl border shadow-sm ${bgCard}`}>
                <h2 className={`text-[15px] font-bold mb-4 ${textMain}`}>Editorial Decisions</h2>
                {m.decisions.map((d) => (
                  <div key={d.round} className={`mb-4 pb-4 border-b last:border-0 ${borderCol}`}>
                    <p className={`text-[12px] font-bold ${textMain}`}>Round {d.round}: <span className="text-[#7A1849]">{REC_LABEL[d.decision]}</span> <span className={`font-normal ${textMuted}`}>· {fmtDate(d.created_at)}</span></p>
                    <p className={`text-[13px] whitespace-pre-wrap mt-1 ${textMain}`}>{d.letter}</p>
                    {m.reviews.filter((r) => r.round === d.round).map((r, i) => (
                      <div key={i} className={`mt-3 p-3 rounded-lg ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-50'}`}>
                        <p className={`text-[11px] font-bold ${textMuted}`}>{r.reviewer} · {REC_LABEL[r.recommendation]}</p>
                        <p className={`text-[12px] whitespace-pre-wrap mt-1 ${textMain}`}>{r.comments_to_author}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className={`p-6 rounded-xl border shadow-sm ${bgCard}`}>
              <h2 className={`text-[15px] font-bold mb-4 ${textMain}`}>Progress</h2>
              <div className={`relative border-l-2 ml-2 space-y-4 ${borderCol}`}>
                {m.timeline.map((e) => (
                  <div key={e.id} className="ml-5 relative">
                    <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-[#7A1849] border-2 border-white"></span>
                    <p className={`text-[12px] font-bold ${textMain}`}>{e.event_type.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())}</p>
                    {e.note && <p className={`text-[12px] ${textMuted}`}>{e.note}</p>}
                    <p className={`text-[10px] ${textMuted}`}>{fmtDate(e.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className={`p-6 rounded-xl border shadow-sm ${bgCard}`}>
              <h2 className={`text-[15px] font-bold mb-3 ${textMain}`}>Files</h2>
              {m.files.map((f) => (
                <button key={f.id} onClick={() => dl(f)} className={`w-full text-left flex items-center justify-between py-2 border-b last:border-0 text-[12px] hover:text-[#7A1849] ${borderCol} ${textMain}`}>
                  <span className="truncate pr-2">{f.original_name}<span className={`block text-[10px] ${textMuted}`}>{f.kind.replace('_', ' ').toLowerCase()} · round {f.round} · {bytes(f.size_bytes)}</span></span>
                  <DownloadOutlined />
                </button>
              ))}
            </div>
            <div className={`p-6 rounded-xl border shadow-sm ${bgCard}`}>
              <h2 className={`text-[15px] font-bold mb-3 ${textMain}`}>Authors</h2>
              {m.authors.map((a) => (
                <div key={a.id} className="mb-2">
                  <p className={`text-[12px] font-bold ${textMain}`}>{a.full_name}{a.is_corresponding ? ' (corresponding)' : ''}</p>
                  <p className={`text-[11px] ${textMuted}`}>{a.affiliation || a.email}</p>
                </div>
              ))}
            </div>
            {m.fee && (
              <div className={`p-6 rounded-xl border shadow-sm ${bgCard}`}>
                <h2 className={`text-[15px] font-bold mb-2 ${textMain}`}>Publication Fee</h2>
                <p className={`text-[13px] ${textMain}`}>{money(m.fee.amount, m.fee.currency)} · {m.fee.status.replace('_', ' ').toLowerCase()}</p>
                <Link to="/author/fees" className="text-[12px] font-bold text-[#7A1849] hover:underline">Open fees →</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
