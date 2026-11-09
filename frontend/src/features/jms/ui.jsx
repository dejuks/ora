import React from 'react';
import { Link } from 'react-router-dom';
import { Table } from 'antd';
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import { useTheme } from './context/ThemeContext';

/** Design tokens shared by every JMS page (same look as the ora-journal design). */
export function useTokens() {
  const { isDarkMode } = useTheme();
  return {
    isDarkMode,
    bgCard: isDarkMode ? 'bg-[#1E1E1E] border-[#2D2D2D]' : 'bg-white border-gray-100',
    textMain: isDarkMode ? 'text-gray-100' : 'text-gray-900',
    textMuted: isDarkMode ? 'text-gray-400' : 'text-gray-500',
    borderCol: isDarkMode ? 'border-[#2D2D2D]' : 'border-gray-100',
    inputBg: isDarkMode
      ? 'bg-[#1A1A1A] border-[#3D3D3D] text-white focus:ring-[#7A1849]'
      : 'bg-gray-50/50 border-gray-200 text-gray-900 focus:bg-white focus:ring-[#7A1849]',
  };
}

export const inputClass = (t) =>
  `w-full px-4 py-2.5 rounded-lg border outline-none transition-all focus:ring-2 text-[13px] ${t.inputBg}`;

export function PageHeader({ eyebrow, title, subtitle, actions, back }) {
  const t = useTokens();
  return (
    <div className="mb-8">
      {back && (
        <Link to={back.to} className="text-[12px] font-bold text-[#7A1849] hover:underline flex items-center gap-1.5 mb-5">
          <ArrowLeftOutlined /> {back.label}
        </Link>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          {eyebrow && <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#7A1849] mb-1.5">{eyebrow}</p>}
          <h1 className={`text-[26px] font-bold tracking-tight ${t.textMain}`}>{title}</h1>
          {subtitle && <p className={`text-[13px] font-medium mt-1 ${t.textMuted}`}>{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}

export function Btn({ children, onClick, to, kind = 'primary', disabled, type = 'button', className = '' }) {
  const t = useTokens();
  const base = 'px-5 py-2 rounded-lg text-[13px] font-bold transition-all disabled:opacity-50 inline-flex items-center gap-2 justify-center';
  const kinds = {
    primary: 'bg-[#7A1849] text-white hover:bg-[#5E1136] shadow-sm',
    ghost: t.isDarkMode ? 'border border-gray-700 text-gray-300 hover:bg-gray-800' : 'border border-gray-200 text-gray-700 bg-white hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  const cls = `${base} ${kinds[kind]} ${className}`;
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  return <button type={type} disabled={disabled} onClick={onClick} className={cls}>{children}</button>;
}

export function Card({ title, subtitle, right, children, className = '', pad = 'p-6' }) {
  const t = useTokens();
  return (
    <div className={`rounded-xl border shadow-sm ${pad} ${t.bgCard} ${className}`}>
      {(title || right) && (
        <div className="flex justify-between items-start mb-5">
          <div>
            {title && <h2 className={`text-[15px] font-bold tracking-tight ${t.textMain}`}>{title}</h2>}
            {subtitle && <p className={`text-[11px] font-medium mt-0.5 ${t.textMuted}`}>{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCards({ items, cols = 4 }) {
  const t = useTokens();
  const grid = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-2 xl:grid-cols-4' }[cols];
  return (
    <div className={`grid grid-cols-1 ${grid} gap-4 mb-6`}>
      {items.map((s) => (
        <div key={s.label} className={`p-5 rounded-xl border shadow-sm ${t.bgCard}`}>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
          <h3 className={`text-[24px] font-bold tracking-tight ${t.textMain}`}>{s.value}</h3>
          {s.sub && <p className={`text-[11px] font-bold mt-2 ${s.subColor || 'text-gray-400'}`}>{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}

const TONES = {
  blue: 'bg-[#EBF1FA] text-[#1A56DB]',
  orange: 'bg-[#FFF7ED] text-[#C2410C]',
  red: 'bg-[#FEF2F2] text-[#B91C1C]',
  green: 'bg-[#F0FDF4] text-[#15803D]',
  purple: 'bg-[#F3E8F2] text-[#7A1849]',
  gray: 'bg-[#F3F4F6] text-[#4B5563]',
  amber: 'bg-[#FEF3C7] text-[#92400E]',
};
export function Pill({ children, tone = 'gray' }) {
  return <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap ${TONES[tone]}`}>{children}</span>;
}

/** Manuscript status -> pill colour. */
export const STATUS_TONE = {
  DRAFT: 'gray', SUBMITTED: 'blue', UNDER_SCREENING: 'orange', DESK_REJECTED: 'red', UNDER_REVIEW: 'orange',
  REVISION_REQUIRED: 'amber', REVISED: 'blue', ACCEPTED: 'purple', REJECTED: 'red', IN_PRODUCTION: 'green',
  PUBLISHED: 'green', WITHDRAWN: 'gray',
};

export function Tabs({ tabs, value, onChange, counts = {} }) {
  const t = useTokens();
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const key = typeof tab === 'string' ? tab : tab.key;
        const label = typeof tab === 'string' ? tab : tab.label;
        const active = value === key;
        return (
          <button key={key} onClick={() => onChange(key)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all ${active ? 'bg-[#7A1849] text-white shadow-sm' : t.isDarkMode ? 'bg-[#1A1A1A] border border-[#3D3D3D] text-gray-300 hover:bg-[#2A2A2A]' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {label}
            {counts[key] > 0 && <span className={`px-1.5 py-0.5 rounded-md text-[10px] bg-white ${active ? 'text-[#7A1849]' : 'text-gray-500'}`}>{counts[key]}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search...' }) {
  const t = useTokens();
  return (
    <div className="relative w-full xl:w-64 shrink-0">
      <SearchOutlined className="absolute left-3 top-3 text-gray-400 text-[13px]" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full pl-9 pr-3 py-2 rounded-lg text-[12px] outline-none border ${t.isDarkMode ? 'bg-[#1A1A1A] border-[#3D3D3D] text-white' : 'bg-white border-gray-200'} focus:border-[#7A1849]`} />
    </div>
  );
}

/** Table card with toolbar, the burgundy header and loading / error / empty states. */
export function ListTable({ toolbar, columns, data, loading, error, empty = 'Nothing to show yet.', pageSize = 10, rowKey = 'id' }) {
  const t = useTokens();
  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden ${t.bgCard}`}>
      {toolbar && <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center p-5 gap-4 border-b border-gray-100 dark:border-gray-800">{toolbar}</div>}
      {error && <p className="px-5 py-3 text-[12px] text-red-600">{error}</p>}
      <Table
        rowKey={rowKey} loading={loading} columns={columns} dataSource={data || []}
        locale={{ emptyText: empty }} pagination={(data || []).length > pageSize ? { pageSize } : false}
        scroll={{ x: 'max-content' }} className={`ora-table ${t.isDarkMode ? 'dark-table' : ''}`}
      />
      <style dangerouslySetInnerHTML={{ __html: `
        .ora-table .ant-table-thead > tr > th { background-color: #7A1849 !important; color: white !important; font-weight: 600 !important; font-size: 10px !important; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: none; padding: 12px 16px; }
        .ora-table .ant-table-thead > tr > th::before { display: none !important; }
        .dark-table .ant-table { background: transparent; color: #E5E7EB; }
        .dark-table .ant-table-tbody > tr > td { color: #E5E7EB; border-bottom: 1px solid #2D2D2D; padding: 16px; }
        .ora-table .ant-table-tbody > tr > td { padding: 16px; border-bottom: 1px solid #F3F4F6; }
        .ora-table .ant-table-tbody > tr:hover > td { background-color: ${t.isDarkMode ? '#2A2A2A' : '#FAFAFA'} !important; }
        .ora-table .ant-pagination { padding: 16px 24px; }
      ` }} />
    </div>
  );
}

export const Cell = {
  Title: ({ children, sub }) => {
    const t = useTokens();
    return (
      <div className="py-0.5 max-w-[420px]">
        <p className={`text-[13px] font-bold leading-tight ${t.textMain}`}>{children}</p>
        {sub && <p className={`text-[11.5px] font-medium mt-1 ${t.textMuted}`}>{sub}</p>}
      </div>
    );
  },
  Muted: ({ children }) => {
    const t = useTokens();
    return <span className={`text-[12px] font-medium ${t.textMuted}`}>{children}</span>;
  },
  Mono: ({ children }) => {
    const t = useTokens();
    return <span className={`text-[12px] font-mono font-bold ${t.textMain}`}>{children}</span>;
  },
};

export function Field({ label, required, hint, children }) {
  const t = useTokens();
  return (
    <div>
      <label className={`block text-[12px] font-bold mb-1.5 ${t.textMain}`}>{label}{required && <span className="text-red-500"> *</span>}</label>
      {children}
      {hint && <p className={`text-[11px] mt-1 ${t.textMuted}`}>{hint}</p>}
    </div>
  );
}

export function TextInput(props) {
  const t = useTokens();
  return <input {...props} className={`${inputClass(t)} ${props.className || ''}`} />;
}
export function TextArea(props) {
  const t = useTokens();
  return <textarea {...props} className={`${inputClass(t)} resize-none ${props.className || ''}`} />;
}
export function SelectBox({ children, ...props }) {
  const t = useTokens();
  return <select {...props} className={`${inputClass(t)} ${props.className || ''}`}>{children}</select>;
}

export function ErrorNote({ error }) {
  if (!error) return null;
  return <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-[12px] text-red-700">{error}</div>;
}

export function Loading({ text = 'Loading...' }) {
  const t = useTokens();
  return <p className={`text-[13px] ${t.textMuted}`}>{text}</p>;
}
