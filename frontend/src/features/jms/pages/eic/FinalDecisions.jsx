import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../layouts/JmsLayout';
import { PageHeader, ListTable, SearchBox, Cell } from '../../ui';
import { get } from '../../api';
import { useLoad, useDebounced } from '../../hooks';

export default function FinalDecisions() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const { data, loading, error } = useLoad(() => get('/editorial/manuscripts', { stage: 'decision', limit: 100, search: q || undefined }), [q]);
  const num = (v, color) => <span className={`text-[13px] font-bold ${v ? color : 'text-gray-300'}`}>{v}</span>;
  const columns = [
    { title: 'ID', dataIndex: 'manuscript_no', render: (v) => <Cell.Mono>{v}</Cell.Mono> },
    { title: 'TITLE', dataIndex: 'title', render: (v, m) => <Cell.Title sub={m.author_names}>{v}</Cell.Title> },
    { title: 'ACCEPT', dataIndex: 'rec_accept', align: 'center', render: (v) => num(v, 'text-green-600') },
    { title: 'MINOR', dataIndex: 'rec_minor', align: 'center', render: (v) => num(v, 'text-blue-600') },
    { title: 'MAJOR', dataIndex: 'rec_major', align: 'center', render: (v) => num(v, 'text-amber-600') },
    { title: 'REJECT', dataIndex: 'rec_reject', align: 'center', render: (v) => num(v, 'text-red-600') },
    { title: 'ACTION', align: 'right', render: (_, m) => <button onClick={() => navigate(`/eic/decide/${m.id}`)} className="bg-[#7A1849] text-white font-bold text-[11px] rounded-md px-5 py-1.5 hover:bg-[#5E1136]">Review & Decide</button> },
  ];
  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in-up">
        <PageHeader eyebrow="WORKSPACE / DECISIONS" title="Final Decisions" subtitle="Manuscripts whose peer reviews are all in. The Editor-in-Chief makes the binding decision." />
        <ListTable loading={loading} error={error} data={data} empty="No manuscripts are waiting for a decision." columns={columns}
          toolbar={<><h2 className="text-[15px] font-bold">Ready for decision</h2><SearchBox value={search} onChange={setSearch} placeholder="Search title or ID..." /></>} />
      </div>
    </AdminLayout>
  );
}
