import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PublicShell, { Note } from '../components/PublicShell';
import ArticleList from './ArticleList';
import { get } from '../api';
import { useLoad } from '../hooks';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [text, setText] = useState(q);
  const { data, loading, error } = useLoad(() => get('/public/articles', { search: q || undefined, limit: 50 }), [q]);
  return (
    <PublicShell eyebrow="Find research" title="Search Articles">
      <form onSubmit={(e) => { e.preventDefault(); setParams(text ? { q: text } : {}); }} className="flex max-w-xl mx-auto mb-8">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Title, author or keyword" className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2.5 text-[14px] outline-none focus:border-[#7A1C39]" />
        <button className="bg-[#7A1C39] hover:bg-[#531324] text-white text-[13px] font-bold px-6 rounded-r-lg">Search</button>
      </form>
      {loading ? <Note>Searching…</Note> : error ? <Note>{error}</Note> : <ArticleList articles={data} empty="No articles match your search." />}
    </PublicShell>
  );
}
