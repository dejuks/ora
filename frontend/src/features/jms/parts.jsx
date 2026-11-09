import React from 'react';
import { message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { Card, Pill, STATUS_TONE, useTokens } from './ui';
import { downloadFile, errorMessage } from './api';
import { bytes, fmtDate, statusLabel } from './format';

export function FileList({ files }) {
  const t = useTokens();
  if (!files?.length) return <p className={`text-[12px] ${t.textMuted}`}>No files.</p>;
  return files.map((f) => (
    <button key={f.id} onClick={() => downloadFile(f.id, f.original_name).catch((e) => message.error(errorMessage(e)))}
      className={`w-full text-left flex items-center justify-between py-2 border-b last:border-0 text-[12px] hover:text-[#7A1849] ${t.borderCol} ${t.textMain}`}>
      <span className="truncate pr-2">{f.original_name}
        <span className={`block text-[10px] ${t.textMuted}`}>{f.kind.replace('_', ' ').toLowerCase()} · round {f.round} · {bytes(f.size_bytes)}</span>
      </span>
      <DownloadOutlined />
    </button>
  ));
}

/** Header + metadata + abstract + files of a manuscript (editor view). */
export function ManuscriptSummary({ m, showAuthors = true }) {
  const t = useTokens();
  return (
    <>
      <Card className="mb-6" pad="p-6 md:p-8">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
          <p className="text-[11px] font-bold tracking-widest uppercase text-[#7A1849]">{m.manuscript_no} · {m.journal_title}</p>
          <Pill tone={STATUS_TONE[m.status]}>{statusLabel(m.status)}{m.current_round > 1 ? ` · Round ${m.current_round}` : ''}</Pill>
        </div>
        <h1 className={`text-[22px] font-bold tracking-tight mb-2 ${t.textMain}`}>{m.title}</h1>
        {showAuthors && <p className={`text-[13px] ${t.textMuted}`}>{(m.authors || []).map((a) => `${a.full_name}${a.affiliation ? ` (${a.affiliation})` : ''}`).join('; ')}</p>}
        <p className={`text-[12px] mt-1 ${t.textMuted}`}>{m.category} · {m.article_type} · Submitted {fmtDate(m.submitted_at)}</p>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <Card title="Abstract" className="lg:col-span-8">
          <p className={`text-[13px] leading-[1.8] ${t.textMain}`}>{m.abstract}</p>
          <p className={`text-[12px] mt-4 ${t.textMuted}`}><strong>Keywords:</strong> {(m.keywords || []).join(', ')}</p>
          {m.cover_letter && showAuthors && (
            <div className={`mt-4 pt-4 border-t ${t.borderCol}`}>
              <p className={`text-[11px] font-bold mb-1 ${t.textMuted}`}>Cover letter</p>
              <p className={`text-[12px] whitespace-pre-wrap ${t.textMain}`}>{m.cover_letter}</p>
            </div>
          )}
        </Card>
        <Card title="Files" className="lg:col-span-4"><FileList files={m.files} /></Card>
      </div>
    </>
  );
}

export function Timeline({ events }) {
  const t = useTokens();
  return (
    <div className={`relative border-l-2 ml-2 space-y-4 ${t.borderCol}`}>
      {events.map((e) => (
        <div key={e.id} className="ml-5 relative">
          <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-[#7A1849] border-2 border-white"></span>
          <p className={`text-[12px] font-bold ${t.textMain}`}>{e.event_type.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())}{e.actor ? ` · ${e.actor}` : ''}</p>
          {e.note && <p className={`text-[12px] ${t.textMuted}`}>{e.note}</p>}
          <p className={`text-[10px] ${t.textMuted}`}>{fmtDate(e.created_at)}</p>
        </div>
      ))}
    </div>
  );
}
