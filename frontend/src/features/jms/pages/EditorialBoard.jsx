import React from 'react';
import PublicShell, { Note } from '../components/PublicShell';
import { get } from '../api';
import { useLoad } from '../hooks';

export default function EditorialBoard() {
  const { data: journals } = useLoad(() => get('/public/journals'));
  const slug = journals?.[0]?.slug;
  const { data: j, loading, error } = useLoad(() => (slug ? get(`/public/journals/${slug}`) : Promise.resolve({ data: null })), [slug]);
  const staff = j?.staff || [];
  return (
    <PublicShell eyebrow="Leadership" title="Editorial Board" subtitle="The researchers and scholars guiding the academic direction of ORA.">
      {loading ? <Note>Loading…</Note> : error ? <Note>{error}</Note> : !staff.length ? <Note>The editorial board will be listed here soon.</Note> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {staff.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm p-6 text-center">
              {s.photo_url ? <img src={s.photo_url} alt={s.full_name} className="w-28 h-28 rounded-full object-cover mx-auto mb-4" /> : <div className="w-28 h-28 rounded-full bg-[#FCF7F9] text-[#7A1C39] text-3xl font-bold flex items-center justify-center mx-auto mb-4">{s.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</div>}
              <h3 className="text-xl font-serif font-bold text-gray-900 mb-1">{s.full_name}</h3>
              <p className="text-[12px] font-bold text-[#7A1C39] uppercase tracking-wider mb-2">{s.position}</p>
              {s.affiliation && <p className="text-[13px] text-gray-500">{s.affiliation}</p>}
            </div>
          ))}
        </div>
      )}
    </PublicShell>
  );
}
