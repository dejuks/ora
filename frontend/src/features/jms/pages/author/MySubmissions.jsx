import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../layouts/JmsLayout';
import { useTheme } from '../../context/ThemeContext';
import { Table, Input, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { get, downloadFile, errorMessage } from '../../api';
import { useLoad } from '../../hooks';
import { fmtDate, statusLabel, bytes } from '../../format';

const GROUPS = {
  Draft: ['DRAFT'],
  Submitted: ['SUBMITTED'],
  'Under Review': ['UNDER_SCREENING', 'UNDER_REVIEW', 'REVISED', 'REVISION_REQUIRED'],
  Accepted: ['ACCEPTED', 'IN_PRODUCTION', 'PUBLISHED'],
  Rejected: ['REJECTED', 'DESK_REJECTED', 'WITHDRAWN'],
};

export default function MySubmissions() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const bgCard = isDarkMode ? 'bg-[#1E1E1E] border-[#2D2D2D]' : 'bg-white border-gray-100';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  const { data: rows, loading, error } = useLoad(() => get('/author/manuscripts', { limit: 100 }));
  const data = (rows || []).map((m) => ({
    key: m.id, id: m.id, rawStatus: m.status, number: m.manuscript_no,
    title: m.title, journal: m.journal_title, category: m.category, articleType: m.article_type, round: m.current_round,
    authors: m.authors || [], files: m.files || [], abstract: m.abstract, keywords: m.keywords || [], cover: m.cover_letter, dataAvail: m.data_availability,
    date: fmtDate(m.submitted_at || m.created_at), status: statusLabel(m.status),
  }));

  // Calculate dynamic counts for the tabs
  const counts = { All: data.length };
  Object.keys(GROUPS).forEach((g) => { counts[g] = data.filter((d) => GROUPS[g].includes(d.rawStatus)).length; });

  const tabs = ['All', 'Draft', 'Submitted', 'Under Review', 'Accepted', 'Rejected'];

  const filteredData = data.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'All' || GROUPS[statusFilter].includes(item.rawStatus);
    return matchesSearch && matchesStatus;
  });

  // Custom Status Badge colors matching the screenshot
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Accepted': return 'bg-[#F3E8F2] text-[#7A1849]';
      case 'Rejected': return 'bg-[#FDE8E8] text-[#D93025]';
      case 'Under Review': case 'Under Screening': case 'Revised': return 'bg-[#FDF2E9] text-[#B36B00]';
      case 'Revision Required': return 'bg-[#FEF3C7] text-[#92400E]';
      case 'In Production': case 'Published': return 'bg-[#F0FDF4] text-[#15803D]';
      case 'Desk Rejected': return 'bg-[#FDE8E8] text-[#D93025]';
      case 'Submitted': return 'bg-[#EBF1FA] text-[#1A56DB]';
      case 'Draft': return 'bg-[#F3F4F6] text-[#4B5563]';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const columns = [
    { 
      title: 'PAPER TITLE', 
      dataIndex: 'title', 
      key: 'title', 
      render: (text, r) => (
        <div>
          <span className={`text-[13px] font-bold ${textMain} tracking-tight`}>{text}</span>
          {r.number && <p className={`text-[11px] font-mono mt-0.5 ${textMuted}`}>{r.number}</p>}
        </div>
      )
    },
    { 
      title: 'JOURNAL / TYPE', 
      key: 'journal', 
      render: (_, r) => (
        <div>
          <span className={`text-[12px] font-medium ${textMain}`}>{r.journal}</span>
          <p className={`text-[11px] ${textMuted}`}>{[r.category, r.articleType].filter(Boolean).join(' · ') || '—'}</p>
        </div>
      ) 
    },
    { 
      title: 'AUTHORS', 
      key: 'authors', 
      render: (_, r) => <span className={`text-[12px] ${textMuted}`}>{r.authors.map((a) => a.full_name).join(', ') || '—'}</span> 
    },
    { 
      title: 'DOCUMENTS', 
      key: 'files', 
      align: 'center', 
      render: (_, r) => <span className={`text-[12px] font-bold ${r.files.length ? 'text-[#7A1849]' : 'text-gray-300'}`}>{r.files.length}</span> 
    },
    { 
      title: 'ROUND', 
      dataIndex: 'round', 
      key: 'round', 
      align: 'center', 
      render: v => <span className={`text-[12px] ${textMuted}`}>{v}</span> 
    },
    { 
      title: 'SUBMISSION DATE', 
      dataIndex: 'date', 
      key: 'date', 
      render: text => <span className={`text-[12px] font-medium ${textMuted}`}>{text}</span> 
    },
    { 
      title: 'STATUS', 
      dataIndex: 'status', 
      key: 'status', 
      render: status => (
        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${getStatusStyle(status)}`}>
          {status}
        </span>
      )
    },
    { 
      title: 'ACTIONS', 
      key: 'actions', 
      align: 'right', 
      render: (_, r) => (
        <button 
          onClick={() => navigate(r.rawStatus === 'DRAFT' ? `/author/submit/${r.id}` : `/author/manuscript/${r.id}`)} 
          className="text-[#7A1849] font-bold text-[12px] hover:underline"
        >
          {r.rawStatus === 'DRAFT' ? 'Continue' : 'View Details'}
        </button>
      ) 
    }
  ];

  return (
    <AdminLayout>
      <div className="max-w-[1300px] mx-auto animate-fade-in-up">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#7A1849] mb-1.5">WORKSPACE / SUBMISSIONS</p>
            {/* Removed font-serif to match the image */}
            <h1 className={`text-[26px] font-bold tracking-tight ${textMain}`}>My Submissions</h1>
            <p className={`text-[13px] font-medium mt-1 ${textMuted}`}>Manage and monitor progress of all your journal submissions.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/author/submit')} 
              className="bg-[#7A1849] text-white px-5 py-2 rounded-lg text-[13px] font-bold hover:bg-[#5E1136] transition-all shadow-sm"
            >
              New Submission
            </button>
          </div>
        </div>

        {/* Main Table Container */}
        <div className={`rounded-xl border shadow-sm overflow-hidden ${bgCard}`}>
          
          {/* Toolbar: Tabs & Search */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center p-5 gap-4 border-b border-gray-100 dark:border-gray-800">
            
            {/* Tab Filters */}
            <div className="flex flex-wrap gap-2">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                    statusFilter === tab
                      ? 'bg-[#7A1849] text-white shadow-sm'
                      : `bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 ${isDarkMode ? '!bg-[#1A1A1A] !border-[#3D3D3D] !text-gray-300 hover:!bg-[#2A2A2A]' : ''}`
                  }`}
                >
                  {tab}
                  {counts[tab] > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] bg-white ${
                      statusFilter === tab ? 'text-[#7A1849]' : 'text-gray-500'
                    }`}>
                      {counts[tab]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative w-full xl:w-64 shrink-0">
              <Input 
                placeholder="Search paper title..." 
                prefix={<SearchOutlined className="text-gray-400 text-[13px]" />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className={`w-full rounded-lg py-1.5 text-[12px] ${isDarkMode ? 'bg-[#1A1A1A] border-[#3D3D3D] text-white' : 'bg-white border-gray-200'}`}
              />
            </div>
          </div>

          {error && <p className="px-5 py-3 text-[12px] text-red-600">{error}</p>}
          <Table 
            loading={loading}
            locale={{ emptyText: 'No manuscripts yet. Click "New Submission" to start.' }}
            columns={columns} 
            dataSource={filteredData} 
            pagination={{ pageSize: 10 }} 
            expandable={{
              expandedRowRender: (r) => (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-2 px-2">
                  <div className="lg:col-span-2 space-y-3">
                    <div><p className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Abstract</p><p className={`text-[12px] leading-relaxed ${textMain}`}>{r.abstract || '—'}</p></div>
                    <p className={`text-[12px] ${textMain}`}><strong>Keywords:</strong> {r.keywords.join(', ') || '—'}</p>
                    {r.dataAvail && <p className={`text-[12px] ${textMain}`}><strong>Data availability:</strong> {r.dataAvail}</p>}
                    {r.cover && <div><p className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Cover letter</p><p className={`text-[12px] whitespace-pre-wrap ${textMain}`}>{r.cover}</p></div>}
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${textMuted}`}>Authors</p>
                      {r.authors.map((a, i) => (
                        <p key={i} className={`text-[12px] ${textMain}`}>{a.full_name}{a.is_corresponding ? ' (corresponding)' : ''} <span className={textMuted}>· {a.email || 'no email'}{a.affiliation ? ` · ${a.affiliation}` : ''}{a.orcid ? ` · ORCID ${a.orcid}` : ''}</span></p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${textMuted}`}>Documents</p>
                    {r.files.length === 0 && <p className={`text-[12px] ${textMuted}`}>No documents uploaded.</p>}
                    {r.files.map((f) => (
                      <button key={f.id} onClick={() => downloadFile(f.id, f.original_name).catch((e) => message.error(errorMessage(e)))}
                        className="block w-full text-left text-[12px] py-1.5 border-b border-gray-100 text-[#7A1849] hover:underline">
                        {f.original_name}
                        <span className={`block text-[10px] ${textMuted}`}>{String(f.kind).replace('_', ' ').toLowerCase()} · round {f.round} · {bytes(f.size_bytes)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ),
            }}
            className={`ora-table ${isDarkMode ? 'dark-table' : ''}`} 
          />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        /* Exact Table Header Styling */
        .ora-table .ant-table-thead > tr > th { 
          background-color: #7A1849 !important; 
          color: white !important; 
          font-weight: 600 !important; 
          font-size: 10px !important; 
          text-transform: uppercase; 
          letter-spacing: 0.05em;
          border-bottom: none; 
          padding: 12px 16px; 
        }
        
        /* Table Body Styling */
        .dark-table .ant-table { background: transparent; color: #E5E7EB; }
        .dark-table .ant-table-tbody > tr > td { color: #E5E7EB; border-bottom: 1px solid #2D2D2D; padding: 16px; }
        .ora-table .ant-table-tbody > tr > td { padding: 16px; border-bottom: 1px solid #F3F4F6; }
        .ora-table .ant-table-tbody > tr:hover > td { background-color: ${isDarkMode ? '#2A2A2A' : '#FAFAFA'} !important; }
        
        /* Pagination Styling */
        .ora-table .ant-pagination { padding: 16px 24px; }
        .dark-table .ant-pagination-item { background-color: #1E1E1E; border-color: #3D3D3D; }
        .dark-table .ant-pagination-item a { color: #E5E7EB; }
      `}} />
    </AdminLayout>
  );
}