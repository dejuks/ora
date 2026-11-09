import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { message } from 'antd';
import AdminLayout from '../../layouts/JmsLayout';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../../../context/AuthContext';
import {
  UploadOutlined, FileTextOutlined, PlusOutlined, CloseCircleOutlined,
  InfoCircleOutlined, SafetyCertificateOutlined, DeleteOutlined,
} from '@ant-design/icons';
import jms, { get, post, put, del, errorMessage } from '../../api';
import { useLoad } from '../../hooks';
import { bytes } from '../../format';

const DECLARATIONS = [
  ['original_work', 'This manuscript represents original work and has not been published or submitted elsewhere.'],
  ['authors_approved', 'All authors have approved the submitted version and agree to its submission.'],
  ['ethics', 'The research complies with ethical guidelines for human/animal subjects (if applicable).'],
  ['no_conflict', 'There are no conflicts of interest to declare.'],
];

const emptyForm = {
  title: '', abstract: '', keywords: '', category_id: '', article_type_id: '', cover_letter: '',
  data_availability: 'ON_REQUEST', declarations: {}, authors: [],
};

export default function SubmitManuscript() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const { user } = useAuth();
  const [id, setId] = useState(routeId || null);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState([]);
  const [newAuthor, setNewAuthor] = useState(null);
  const mainInput = useRef(null);
  const suppInput = useRef(null);

  const { data: cats } = useLoad(() => get('/public/categories'));
  const { data: types } = useLoad(() => get('/public/article-types'));

  const bgCard = isDarkMode ? 'bg-[#1E1E1E] border-[#2D2D2D]' : 'bg-white border-gray-200';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDarkMode ? 'bg-[#1A1A1A] border-[#3D3D3D] text-white focus:ring-[#7A1849]' : 'bg-gray-50/50 border-gray-200 text-gray-900 focus:bg-white focus:ring-[#7A1849]';
  const labelStyle = `block text-[12px] font-bold mb-1.5 ${textMain}`;
  const sectionTitle = `text-[16px] font-bold mb-6 flex items-center gap-2 ${textMain}`;
  const numCircle = "w-6 h-6 rounded-full bg-[#FCF7F9] text-[#7A1849] flex items-center justify-center text-[11px] font-bold border border-[#7A1849]/10";
  const inputCls = `w-full px-4 py-3 rounded-xl border outline-none transition-all ring-offset-2 focus:ring-2 text-[14px] ${inputBg}`;

  // Load an existing draft
  useEffect(() => {
    if (!routeId) return;
    (async () => {
      try {
        const m = (await get(`/author/manuscripts/${routeId}`)).data;
        if (m.status !== 'DRAFT') { navigate(`/author/submissions/${routeId}`, { replace: true }); return; }
        setForm({
          title: m.title, abstract: m.abstract || '', keywords: (m.keywords || []).join(', '),
          category_id: m.category_id || '', article_type_id: m.article_type_id || '',
          cover_letter: m.cover_letter || '', data_availability: m.data_availability,
          declarations: m.declarations || {},
          authors: m.authors.filter((a) => !a.is_corresponding).map((a) => ({ full_name: a.full_name, email: a.email, affiliation: a.affiliation || '', orcid: a.orcid || '' })),
          corresponding: m.authors.find((a) => a.is_corresponding),
        });
        setFiles(m.files);
      } catch (e) { message.error(errorMessage(e)); }
    })();
  }, [routeId, navigate]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const words = form.abstract.trim() ? form.abstract.trim().split(/\s+/).length : 0;

  const payload = () => {
    const corr = form.corresponding || {};
    return {
      title: form.title, abstract: form.abstract, keywords: form.keywords,
      category_id: form.category_id || null, article_type_id: form.article_type_id || null,
      cover_letter: form.cover_letter || null, data_availability: form.data_availability,
      declarations: form.declarations,
      authors: [
        { full_name: `${user.firstName} ${user.lastName}`, email: user.email, is_corresponding: true,
          affiliation: form.affiliation ?? corr.affiliation ?? null, orcid: form.orcid || corr.orcid || null },
        ...form.authors.map((a) => ({ ...a, orcid: a.orcid || null, affiliation: a.affiliation || null })),
      ],
    };
  };

  // Save draft (creates it the first time). Returns the manuscript id.
  const saveDraft = async ({ quiet = false } = {}) => {
    setErrors([]);
    try {
      const res = id ? await put(`/author/manuscripts/${id}`, payload()) : await post('/author/manuscripts', payload());
      const newId = res.data.id;
      if (!id) { setId(newId); window.history.replaceState(null, '', `/author/submit/${newId}`); }
      if (!quiet) message.success('Draft saved.');
      return newId;
    } catch (e) {
      const list = e.response?.data?.errors?.map((x) => x.message) || [errorMessage(e)];
      setErrors(list);
      message.error(list[0]);
      return null;
    }
  };

  const upload = async (kind, fileList) => {
    if (!fileList.length) return;
    setBusy(true);
    const mid = id || (await saveDraft({ quiet: true }));
    if (!mid) { setBusy(false); return; }
    try {
      const fd = new FormData();
      fd.append('kind', kind);
      [...fileList].forEach((f) => fd.append('files', f));
      await jms.post(`/author/manuscripts/${mid}/files`, fd);
      const m = (await get(`/author/manuscripts/${mid}`)).data;
      setFiles(m.files);
      message.success('File uploaded.');
    } catch (e) { message.error(errorMessage(e)); } finally { setBusy(false); }
  };

  const removeFile = async (fileId) => {
    try {
      await del(`/author/manuscripts/${id}/files/${fileId}`);
      setFiles((f) => f.filter((x) => x.id !== fileId));
    } catch (e) { message.error(errorMessage(e)); }
  };

  const submit = async () => {
    setBusy(true);
    const mid = await saveDraft({ quiet: true });
    if (!mid) { setBusy(false); return; }
    try {
      const res = await post(`/author/manuscripts/${mid}/submit`);
      message.success(res.message);
      navigate('/author/submissions');
    } catch (e) {
      const list = e.response?.data?.errors?.map((x) => x.message) || [errorMessage(e)];
      setErrors(list);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally { setBusy(false); }
  };

  const addAuthor = () => {
    if (!newAuthor?.full_name || !newAuthor?.email) { message.error('Enter the co-author name and email.'); return; }
    set('authors', [...form.authors, newAuthor]);
    setNewAuthor(null);
  };

  const mainFile = files.find((f) => f.kind === 'MANUSCRIPT');
  const supp = files.filter((f) => f.kind === 'SUPPLEMENTARY');
  const corr = form.corresponding;

  return (
    <AdminLayout>
      <div className="max-w-[1300px] mx-auto animate-fade-in-up">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <p className={`text-[11px] font-bold tracking-widest uppercase mb-1.5 ${textMuted}`}>Workspace / New Submission</p>
            <h1 className={`text-2xl font-serif font-bold flex items-center gap-3 ${textMain}`}>
              Submit Manuscript
              <span className="text-[10px] bg-[#FCF7F9] text-[#7A1849] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider border border-[#7A1849]/20">Draft</span>
            </h1>
            <p className={`text-[13px] mt-1 ${textMuted}`}>Complete all required fields to submit your research.</p>
          </div>
          <div className="flex gap-3">
            <button disabled={busy} onClick={() => saveDraft()} className={`px-5 py-2.5 rounded-xl text-[13px] font-bold border transition-colors disabled:opacity-50 ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-[#2A2A2A]' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Save Draft</button>
            <button disabled={busy} onClick={submit} className="bg-[#7A1849] text-white px-6 py-2.5 rounded-xl text-[13px] font-bold hover:bg-[#5E1136] transition-all shadow-md disabled:opacity-60">Submit</button>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-[13px] text-red-700">
            <p className="font-bold mb-1">Please fix the following:</p>
            <ul className="list-disc ml-5">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6">
            <div className={`p-8 rounded-2xl border shadow-sm ${bgCard}`}>
              <h2 className={sectionTitle}><span className={numCircle}>1</span> Manuscript Details</h2>
              <div className="space-y-5">
                <div>
                  <label className={labelStyle}>Manuscript Title <span className="text-red-500">*</span></label>
                  <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Enter the full title of your paper" className={inputCls} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelStyle}>Category / Subject Area <span className="text-red-500">*</span></label>
                    <select value={form.category_id} onChange={(e) => set('category_id', e.target.value)} className={inputCls}>
                      <option value="">Select a category...</option>
                      {(cats || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Article Type <span className="text-red-500">*</span></label>
                    <select value={form.article_type_id} onChange={(e) => set('article_type_id', e.target.value)} className={inputCls}>
                      <option value="">Select an article type...</option>
                      {(types || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelStyle}>Abstract <span className="text-red-500">*</span></label>
                  <textarea rows="5" value={form.abstract} onChange={(e) => set('abstract', e.target.value)} placeholder="Paste your abstract here..." className={`${inputCls} resize-none`}></textarea>
                  <p className={`text-[11px] mt-1.5 ${words > 300 ? 'text-red-600 font-bold' : textMuted}`}>{words} / 300 words (minimum 20).</p>
                </div>
                <div>
                  <label className={labelStyle}>Keywords <span className="text-red-500">*</span></label>
                  <input type="text" value={form.keywords} onChange={(e) => set('keywords', e.target.value)} placeholder="e.g. Gadaa, governance, Oromia (comma separated)" className={inputCls} />
                </div>
              </div>
            </div>

            <div className={`p-8 rounded-2xl border shadow-sm ${bgCard}`}>
              <h2 className={sectionTitle}><span className={numCircle}>2</span> Authors & Contributors</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className={labelStyle}>Corresponding Author</label>
                  <input type="text" value={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} disabled className={`w-full px-4 py-3 rounded-xl border text-[14px] opacity-70 cursor-not-allowed ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-100'} border-gray-200`} />
                </div>
                <div>
                  <label className={labelStyle}>Email Address</label>
                  <input type="email" value={user?.email ?? ''} disabled className={`w-full px-4 py-3 rounded-xl border text-[14px] opacity-70 cursor-not-allowed ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-100'} border-gray-200`} />
                </div>
                <div>
                  <label className={labelStyle}>Institution / Affiliation</label>
                  <input type="text" value={form.affiliation ?? corr?.affiliation ?? ''} onChange={(e) => set('affiliation', e.target.value)} placeholder="e.g. Addis Ababa University" className={inputCls} />
                </div>
                <div>
                  <label className={labelStyle}>ORCID iD</label>
                  <input type="text" value={form.orcid ?? corr?.orcid ?? ''} onChange={(e) => set('orcid', e.target.value)} placeholder="0000-0002-1825-0097" className={inputCls} />
                </div>
              </div>

              {form.authors.map((a, i) => (
                <div key={i} className={`p-4 rounded-xl border mb-3 flex justify-between items-center ${isDarkMode ? 'bg-[#2A2A2A] border-[#3D3D3D]' : 'bg-gray-50 border-gray-200'}`}>
                  <div>
                    <p className={`text-[13px] font-bold ${textMain}`}>{a.full_name} (Co-Author)</p>
                    <p className={`text-[11px] ${textMuted}`}>{a.affiliation ? `${a.affiliation} • ` : ''}{a.email}{a.orcid ? ` • ORCID ${a.orcid}` : ''}</p>
                  </div>
                  <button onClick={() => set('authors', form.authors.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 transition-colors"><CloseCircleOutlined /></button>
                </div>
              ))}

              {newAuthor ? (
                <div className={`p-4 rounded-xl border space-y-3 ${isDarkMode ? 'bg-[#2A2A2A] border-[#3D3D3D]' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input placeholder="Full name *" value={newAuthor.full_name || ''} onChange={(e) => setNewAuthor({ ...newAuthor, full_name: e.target.value })} className={inputCls} />
                    <input placeholder="Email *" value={newAuthor.email || ''} onChange={(e) => setNewAuthor({ ...newAuthor, email: e.target.value })} className={inputCls} />
                    <input placeholder="Affiliation" value={newAuthor.affiliation || ''} onChange={(e) => setNewAuthor({ ...newAuthor, affiliation: e.target.value })} className={inputCls} />
                    <input placeholder="ORCID (optional)" value={newAuthor.orcid || ''} onChange={(e) => setNewAuthor({ ...newAuthor, orcid: e.target.value })} className={inputCls} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addAuthor} className="px-4 py-2 rounded-lg bg-[#7A1849] text-white text-[12px] font-bold">Add co-author</button>
                    <button onClick={() => setNewAuthor(null)} className="px-4 py-2 rounded-lg border text-[12px] font-bold text-gray-600">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setNewAuthor({})} className="text-[12px] font-bold text-[#7A1849] border border-[#7A1849]/30 px-4 py-2 rounded-lg hover:bg-[#FCF7F9] transition-colors flex items-center gap-2">
                  <PlusOutlined /> Add Co-author
                </button>
              )}
            </div>

            <div className={`p-8 rounded-2xl border shadow-sm ${bgCard}`}>
              <h2 className={sectionTitle}><span className={numCircle}>3</span> Manuscript Files</h2>
              <div className="space-y-6">
                <div>
                  <label className={labelStyle}>Manuscript File <span className="text-red-500">*</span></label>
                  <input ref={mainInput} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => { upload('MANUSCRIPT', Array.from(e.target.files)); e.target.value = ''; }} />
                  <div onClick={() => mainInput.current?.click()} className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${isDarkMode ? 'border-gray-700 hover:bg-[#2A2A2A]' : 'border-gray-300 hover:bg-[#FCF7F9]'}`}>
                    <UploadOutlined className="text-3xl text-[#7A1849] mb-3" />
                    <p className={`text-[13px] font-bold ${textMain}`}>{mainFile ? 'Replace manuscript file' : 'Upload manuscript file'}</p>
                    <p className={`text-[11px] ${textMuted}`}>PDF, DOCX accepted (Max 10MB). Remove author names from the file for double-blind review.</p>
                  </div>
                  {mainFile && (
                    <div className={`mt-3 p-3 rounded-lg border flex justify-between items-center ${isDarkMode ? 'bg-[#2A2A2A] border-[#3D3D3D]' : 'bg-white border-gray-200 shadow-sm'}`}>
                      <div className="flex items-center gap-3">
                        <FileTextOutlined className="text-[#7A1849] text-lg" />
                        <div>
                          <p className={`text-[13px] font-bold ${textMain}`}>{mainFile.original_name}</p>
                          <p className={`text-[11px] ${textMuted}`}>{bytes(mainFile.size_bytes)}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-green-600">Ready</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className={labelStyle}>Supplementary Files</label>
                  <input ref={suppInput} type="file" multiple className="hidden" onChange={(e) => { upload('SUPPLEMENTARY', Array.from(e.target.files)); e.target.value = ''; }} />
                  <div onClick={() => suppInput.current?.click()} className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${isDarkMode ? 'border-gray-700 hover:bg-[#2A2A2A]' : 'border-gray-300 hover:bg-[#FCF7F9]'}`}>
                    <UploadOutlined className="text-2xl text-gray-400 mb-2" />
                    <p className={`text-[12px] font-bold ${textMain}`}>Upload supplementary material</p>
                  </div>
                  {supp.map((f) => (
                    <div key={f.id} className={`mt-2 p-3 rounded-lg border flex justify-between items-center ${isDarkMode ? 'bg-[#2A2A2A] border-[#3D3D3D]' : 'bg-white border-gray-200'}`}>
                      <p className={`text-[12px] font-bold ${textMain}`}>{f.original_name} <span className={`font-normal ${textMuted}`}>({bytes(f.size_bytes)})</span></p>
                      <button onClick={() => removeFile(f.id)} className="text-gray-400 hover:text-red-500"><DeleteOutlined /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`p-8 rounded-2xl border shadow-sm ${bgCard}`}>
              <h2 className={sectionTitle}><span className={numCircle}>4</span> Cover Letter</h2>
              <label className={labelStyle}>Letter to the Editor (Optional)</label>
              <textarea rows="3" value={form.cover_letter || ''} onChange={(e) => set('cover_letter', e.target.value)} placeholder="Briefly explain the significance of your work..." className={`${inputCls} resize-none`}></textarea>
            </div>

            <div className={`p-8 rounded-2xl border shadow-sm ${bgCard}`}>
              <h2 className={sectionTitle}><span className={numCircle}>5</span> Declarations, Ethics, and Conflicts</h2>
              <div className="space-y-4">
                {DECLARATIONS.map(([key, text]) => (
                  <label key={key} className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" checked={form.declarations[key] === true} onChange={(e) => set('declarations', { ...form.declarations, [key]: e.target.checked })} className="mt-1 w-4 h-4 rounded border-gray-300 accent-[#7A1849] cursor-pointer" />
                    <span className={`text-[13px] leading-relaxed group-hover:text-[#7A1849] transition-colors ${textMain}`}>{text}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="lg:hidden flex justify-end pt-4">
              <button disabled={busy} onClick={submit} className="w-full bg-[#7A1849] text-white px-8 py-3 rounded-xl text-[14px] font-bold hover:bg-[#5E1136] transition-all shadow-md disabled:opacity-60">Submit Manuscript</button>
            </div>
          </div>

          <div className="w-full lg:w-[320px]">
            <div className={`p-6 rounded-2xl border shadow-sm sticky top-4 transition-colors ${bgCard}`}>
              <div className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                <h3 className={`text-[14px] font-bold mb-3 flex items-center gap-2 ${textMain}`}><InfoCircleOutlined className="text-[#7A1849]" /> Submission Guidelines</h3>
                <ul className={`text-[12px] space-y-2 ${textMuted}`}>
                  <li>• Ensure all authors meet the ICMJE criteria.</li>
                  <li>• Figures must be at least 300 DPI.</li>
                  <li>• Double-blind review is enforced.</li>
                  <li>• Max 10MB for the main document.</li>
                </ul>
              </div>
              <div className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                <h3 className={`text-[14px] font-bold mb-3 flex items-center gap-2 ${textMain}`}><SafetyCertificateOutlined className="text-[#7A1849]" /> Data Availability</h3>
                <p className={`text-[12px] leading-relaxed mb-3 ${textMuted}`}>ORA requires a data availability statement for all research articles.</p>
                <select value={form.data_availability} onChange={(e) => set('data_availability', e.target.value)} className={`w-full px-3 py-2 rounded-lg border outline-none text-[12px] ${inputBg}`}>
                  <option value="ON_REQUEST">Data available on request</option>
                  <option value="OPEN_ACCESS">Data is fully open access</option>
                  <option value="RESTRICTED">Data restricted for privacy</option>
                </select>
              </div>
              <div>
                <h3 className={`text-[14px] font-bold mb-4 ${textMain}`}>Ready to Submit?</h3>
                <p className={`text-[11px] font-medium mb-4 ${textMuted}`}>By submitting, you agree to the ORA Academic submission policies.</p>
                <button disabled={busy} onClick={submit} className="w-full bg-[#7A1849] text-white py-3 rounded-xl text-[13px] font-bold hover:bg-[#5E1136] transition-all shadow-md disabled:opacity-60">Confirm & Submit</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
