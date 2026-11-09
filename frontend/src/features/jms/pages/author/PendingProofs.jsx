import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../layouts/JmsLayout';
import { useTheme } from '../../context/ThemeContext';
import { Table, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { get } from '../../api';
import { useLoad } from '../../hooks';
import { fmtDate } from '../../format';

export default function PendingProofs() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');

  const bgCard = isDarkMode ? 'bg-[#1E1E1E] border-[#2D2D2D]' : 'bg-white border-gray-100';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  const { data: rows, loading, error } = useLoad(() => get('/author/proofs', { status: 'SENT' }));
  const data = (rows || []).map((p) => ({
    key: p.id, title: p.title, journal: p.journal_title,
    version: `v${p.version}`, deadline: p.response_due ? fmtDate(p.response_due) : '—', due: p.response_due,
  }));

  const filteredData = data.filter(item => 
    item.title.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderDeadline = (date, record) => {
    const days = record.due ? Math.ceil((new Date(record.due + 'T00:00:00') - new Date()) / 86400000) : null;
    let style = 'bg-gray-50 text-gray-600 border border-gray-100';
    if (days !== null && days <= 7) style = 'bg-[#FFF7ED] text-[#C2410C]';
    else if (days !== null) style = 'bg-[#EFF6FF] text-[#2563EB]';
    return (
      <span className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold tracking-wide ${style}`}>
        {date}{days !== null && days < 0 ? ' (overdue)' : ''}
      </span>
    );
  };

  const columns = [
    { 
      title: 'MANUSCRIPT TITLE', 
      dataIndex: 'title', 
      key: 'title', 
      render: (text, record) => (
        <div className="py-1">
          {/* Exact font weight and color match */}
          <p className={`text-[13px] font-bold ${textMain} leading-tight`}>{text}</p>
          <p className={`text-[11.5px] font-medium mt-1 ${textMuted}`}>{record.journal}</p>
        </div>
      )
    },
    { 
      title: 'VERSION', 
      dataIndex: 'version', 
      key: 'version', 
      render: text => <span className={`text-[12px] font-medium ${textMuted}`}>{text}</span> 
    },
    { 
      title: 'DEADLINE', 
      dataIndex: 'deadline', 
      key: 'deadline', 
      render: (text, record) => renderDeadline(text, record) 
    },
    { 
      title: 'ACTION', 
      key: 'actions', 
      align: 'right', 
      render: (_, record) => (
        <button 
          onClick={() => navigate(`/author/proof/${record.key}`)} 
          className="bg-[#7A1849] text-white font-bold text-[11px] rounded-md px-5 py-1.5 hover:bg-[#5E1136] transition-colors shadow-sm"
        >
          View
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
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#7A1849] mb-1.5">WORKSPACE / PROOFS</p>
            {/* Removed font-serif to match the image */}
            <h1 className={`text-[26px] font-bold tracking-tight ${textMain}`}>Pending Proofs</h1>
            <p className={`text-[13px] font-medium mt-1 ${textMuted}`}>Review and approve your pre-publication papers here.</p>
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

        {/* Table Container */}
        <div className={`rounded-xl border shadow-sm overflow-hidden ${bgCard}`}>
          
          {/* Header & Search Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-5 border-b border-gray-100 dark:border-gray-800">
             <h2 className={`text-[15px] font-bold tracking-tight ${textMain}`}>Pending Proof Queue</h2>
             
             <div className="flex items-center gap-3 w-full md:w-auto">
                <Input 
                  placeholder="Search title..." 
                  prefix={<SearchOutlined className="text-gray-400 text-[13px]" />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className={`w-full md:w-64 rounded-lg py-1.5 text-[12px] ${isDarkMode ? 'bg-[#1A1A1A] border-[#3D3D3D] text-white' : 'bg-white border-gray-200'}`}
                />
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md whitespace-nowrap ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                  {filteredData.length} Manuscripts
                </span>
             </div>
          </div>

          {error && <p className="px-5 py-3 text-[12px] text-red-600">{error}</p>}
          <Table 
            loading={loading}
            locale={{ emptyText: 'No proofs are waiting for you.' }}
            columns={columns} 
            dataSource={filteredData} 
            pagination={false} 
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
      `}} />
    </AdminLayout>
  );
}