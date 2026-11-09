import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { message } from 'antd';
import AdminLayout from '../../layouts/JmsLayout';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeftOutlined, DownloadOutlined, CheckCircleFilled } from '@ant-design/icons';
import { get, post, downloadFile, errorMessage } from '../../api';
import { useLoad } from '../../hooks';
import { fmtDate } from '../../format';

export default function ViewProof() {
  const { isDarkMode } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: p, loading, error } = useLoad(() => get(`/author/proofs/${id}`), [id]);
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState(false);

  const bgCard = isDarkMode ? 'bg-[#1E1E1E] border-[#2D2D2D]' : 'bg-white border-gray-200';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const borderCol = isDarkMode ? 'border-[#2D2D2D]' : 'border-gray-100';

  const respond = async (action) => {
    setBusy(true);
    try {
      const res = await post(`/author/proofs/${id}/respond`, { action, comments });
      message.success(res.message);
      navigate('/author/pending-proof');
    } catch (e) { message.error(errorMessage(e)); } finally { setBusy(false); }
  };

  if (loading) return <AdminLayout><p className={textMuted}>Loading proof...</p></AdminLayout>;
  if (error || !p) return <AdminLayout><p className="text-red-600">{error || 'Proof not found.'}</p></AdminLayout>;
  const answered = p.status !== 'SENT';

  return (
    <AdminLayout>
      <div className="max-w-[1300px] mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <Link to="/author/pending-proof" className="text-[12px] font-bold text-[#7A1849] hover:underline flex items-center gap-2 mb-4">
              <ArrowLeftOutlined /> Back to Pending Proofs
            </Link>
            <p className={`text-[11px] font-bold tracking-widest uppercase mb-1.5 ${textMuted}`}>Workspace / Proofs / View Proof</p>
            <h1 className={`text-3xl font-serif font-bold ${textMain}`}>View Proof</h1>
            <p className={`text-[14px] mt-1.5 ${textMuted}`}>Review your typeset article and respond to the editorial team.</p>
          </div>
          {p.file_id && (
            <button onClick={() => downloadFile(p.file_id, 'proof.pdf').catch((e) => message.error(errorMessage(e)))} className={`px-5 py-2.5 rounded-xl text-[13px] font-bold border flex items-center gap-2 ${isDarkMode ? 'border-gray-700 text-gray-300' : 'border-gray-300 text-gray-700 bg-white'}`}>
              <DownloadOutlined /> Download Proof (PDF)
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className={`p-4 rounded-xl border shadow-sm mb-6 flex justify-between items-center ${bgCard}`}>
              <div>
                <h2 className={`text-[16px] font-bold ${textMain}`}>{p.title}</h2>
                <p className={`text-[12px] ${textMuted}`}>{p.journal_title} • {p.manuscript_no}</p>
              </div>
              <div className="flex gap-6 text-right">
                <div><p className={`text-[10px] uppercase font-bold ${textMuted}`}>Version</p><p className={`text-[13px] font-bold ${textMain}`}>v{p.version}</p></div>
                <div><p className={`text-[10px] uppercase font-bold ${textMuted}`}>Deadline</p><p className="text-[13px] font-bold text-red-500">{fmtDate(p.response_due)}</p></div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-xl overflow-hidden p-12 border border-gray-200">
              <div className="text-center mb-10">
                <p className="text-[12px] font-bold text-[#7A1849] tracking-widest uppercase">{p.journal_title}</p>
                <h1 className="text-3xl font-serif font-bold text-gray-900 mt-4 mb-2">{p.title}</h1>
                <p className="text-sm text-gray-500">{(p.authors || []).map((a) => a.full_name).join(', ')}</p>
              </div>
              <div className="space-y-4 text-gray-800 text-sm leading-relaxed">
                <h3 className="font-bold text-lg mb-2">Abstract</h3>
                <p>{p.abstract}</p>
                {p.keywords?.length > 0 && <p className="text-gray-500"><strong>Keywords:</strong> {p.keywords.join(', ')}</p>}
                {!p.file_id && <p className="text-gray-400 italic">No PDF was attached to this proof. Please read the editor's message on the right.</p>}
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[350px] space-y-6">
            <div className={`p-6 rounded-xl border shadow-sm ${bgCard}`}>
              <h3 className={`text-[15px] font-bold mb-4 border-b pb-3 ${borderCol} ${textMain}`}>Message from the Editorial Office</h3>
              <p className={`text-[13px] whitespace-pre-wrap ${textMain}`}>{p.message}</p>
            </div>

            <div className={`p-6 rounded-xl border shadow-sm ${bgCard}`}>
              <h3 className={`text-[15px] font-bold mb-4 border-b pb-3 ${borderCol} ${textMain}`}>Your Response</h3>
              {answered ? (
                <div>
                  <p className={`text-[13px] font-bold mb-1 ${p.status === 'ACCEPTED' ? 'text-green-600' : 'text-amber-600'}`}>
                    {p.status === 'ACCEPTED' ? 'You approved this proof.' : 'You requested corrections.'}
                  </p>
                  {p.author_comments && <p className={`text-[12px] ${textMuted}`}>{p.author_comments}</p>}
                </div>
              ) : (
                <>
                  <textarea rows="4" value={comments} onChange={(e) => setComments(e.target.value)} placeholder="List any corrections here..." className={`w-full p-3 rounded-lg border text-[13px] resize-none mb-4 ${isDarkMode ? 'bg-[#1A1A1A] border-[#3D3D3D] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}></textarea>
                  <div className="flex gap-3">
                    <button disabled={busy || comments.trim().length < 5} onClick={() => respond('CORRECTIONS')} className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold border disabled:opacity-40 ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50 bg-white'}`}>Request Changes</button>
                    <button disabled={busy} onClick={() => respond('ACCEPT')} className="flex-1 py-2.5 rounded-lg text-[13px] font-bold text-white bg-[#7A1849] hover:bg-[#5E1136] shadow-md flex items-center justify-center gap-2 disabled:opacity-60">
                      <CheckCircleFilled /> Approve
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
