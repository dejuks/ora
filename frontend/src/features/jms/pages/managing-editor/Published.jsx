import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, ListTable, SearchBox, Pill, Cell } from '../../ui';
import { get } from '../../api';
import { useLoad, useDebounced } from '../../hooks';
import { fmtDate } from '../../format';

export default function Published() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const { data, loading, error } = useLoad(() => get('/production/published', { search: q || undefined }), [q]);
  const columns = [
    { title: 'DOI', dataIndex: 'doi', render: (v) => <Cell.Mono>{v}</Cell.Mono> },
    { title: 'TITLE', dataIndex: 'title', render: (v, a) => <Cell.Title sub={a.author_names}>{v}</Cell.Title> },
    { title: 'ISSUE', render: (_, a) => <Cell.Muted>Vol. {a.volume}, No. {a.issue_number}</Cell.Muted> },
    { title: 'PUBLISHED', dataIndex: 'published_at', render: (v) => <Cell.Muted>{fmtDate(v)}</Cell.Muted> },
    { title: 'STATUS', dataIndex: 'status', render: (v) => <Pill tone={v === 'CORRECTION' ? 'amber' : v === 'INDEXED' ? 'purple' : 'green'}>{v.toLowerCase()}</Pill> },
    { title: 'ACTION', align: 'right', render: (_, a) => <button onClick={() => navigate(`/managing-editor/published/${a.id}`)} className="text-[#7A1849] font-bold text-[12px] hover:underline">View</button> },
  ];
  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader eyebrow="WORKSPACE / PUBLISHED" title="Published Manuscripts" subtitle="Every article that has been published." />
        <ListTable loading={loading} error={error} data={data} empty="Nothing has been published yet." columns={columns}
          toolbar={<><h2 className="text-[15px] font-bold">Archive</h2><SearchBox value={search} onChange={setSearch} placeholder="Search title, DOI or ID..." /></>} />
      </div>
    </AdminLayout>
  );
}
