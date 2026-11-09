import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { get } from '../api';
import { useLoad } from '../hooks';
import { fmtDate } from '../format';
import ArticleList from './ArticleList';
import { 
  SearchOutlined, GlobalOutlined, SafetyCertificateOutlined, TeamOutlined,
  ReadOutlined
} from '@ant-design/icons';

export default function LandingPage() {
  const { data: latest } = useLoad(() => get('/public/articles', { limit: 6 }));
  const { data: issuesList } = useLoad(() => get('/public/issues'));
  const { data: journalsList } = useLoad(() => get('/public/journals'));
  const { data: announcements } = useLoad(() => get('/public/announcements', { limit: 3 }));
  const [q, setQ] = React.useState('');
  const articleTotal = (journalsList || []).reduce((n, j) => n + Number(j.article_count || 0), 0);
  return (
    <div className="min-h-screen bg-[#FAF9F6] font-sans flex flex-col">
      <Header />

      <main className="flex-grow">
        
        {/* ================= MODERN HERO SECTION ================= */}
        <section className="relative bg-[#2D0A14] overflow-hidden py-20 lg:py-28 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-[#7A1C39] rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#E8C5D6] rounded-full mix-blend-screen filter blur-[100px] opacity-20"></div>
          </div>

          <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[#E8C5D6] text-[10px] font-bold tracking-widest uppercase mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8C5D6] animate-pulse"></span>
                ORA Academic Publishing Platform
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white leading-[1.15] mb-6">
                Welcome to the <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E8C5D6] to-[#D4AF37]">
                  Journal of Oromo Research
                </span>
              </h1>
              
              <p className="text-[15px] md:text-[16px] text-gray-300 max-w-xl mx-auto lg:mx-0 leading-relaxed mb-8">
                Researchers and policy-makers need access to contextually-relevant, quality research publications from the Oromo community. We are the publishing platform for rigorous, peer-reviewed Oromo scholarship.
              </p>
              
              {/* Search Bar */}
              <form onSubmit={(e) => { e.preventDefault(); window.location.assign(`/search?q=${encodeURIComponent(q)}`); }} className="bg-white/10 backdrop-blur-md p-1.5 rounded-xl border border-white/20 flex items-center max-w-xl mx-auto lg:mx-0 shadow-2xl hover:border-[#E8C5D6]/50 transition-colors duration-300">
                <SearchOutlined className="text-[#E8C5D6] text-lg ml-4 mr-3" />
                <input 
                  type="text" 
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search journals, articles, authors, or keywords..." 
                  className="flex-1 py-2.5 outline-none text-[14px] text-white bg-transparent placeholder-gray-400"
                />
                <button type="submit" className="bg-[#7A1C39] text-white px-6 py-2.5 rounded-lg text-[13px] font-bold hover:bg-[#531324] transition-colors shadow-sm">
                  Search
                </button>
              </form>
            </div>

            <div className="flex-1 relative hidden lg:flex justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#E8C5D6] to-[#D4AF37] rounded-3xl transform rotate-6 blur-xl opacity-20"></div>
              <img 
                src="/jor.png" 
                alt="JOR Cover" 
                className="relative w-[300px] h-[420px] object-cover rounded-2xl shadow-2xl border border-white/10 transform hover:rotate-2 hover:scale-105 transition-all duration-500" 
              />
            </div>
          </div>
        </section>

        {/* ================= IMPACT STATISTICS ================= */}
        <section className="bg-white border-b border-gray-200 py-12 relative z-20 -mt-8 mx-4 sm:mx-6 lg:mx-auto max-w-4xl rounded-2xl shadow-xl">
          <div className="px-6 lg:px-8">
            <div className="grid grid-cols-3 gap-6 text-center divide-x divide-gray-100">
              {[[(journalsList || []).length, 'Journals'], [(issuesList || []).length, 'Issues'], [articleTotal, 'Articles']].map(([n, label]) => (
                <div key={label} className="group cursor-default">
                  <p className="text-3xl md:text-4xl font-bold text-[#7A1C39]">{n}</p>
                  <p className="text-[12px] font-bold text-gray-500 mt-1 uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= PROMOTING ACCESS (Features) ================= */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">
              Promoting access to Oromo Research
            </h2>
            <p className="text-[15px] text-gray-600 leading-relaxed">
              For over a decade, ORA has been increasing global access to research published in Oromo journals. We offer a unique assessment system for partner journals and provide free technical training to support ethically sound publishing practices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <GlobalOutlined />, title: "Global Access", desc: "Increasing the reach and visibility of Oromo-published research worldwide." },
              { icon: <SafetyCertificateOutlined />, title: "Quality Standards", desc: "Assessing and promoting best practices in scholarly publishing." },
              { icon: <TeamOutlined />, title: "Training & Support", desc: "Offering free technical services and training for Oromo journals." },
              { icon: <ReadOutlined />, title: "Open Access", desc: "Supporting fee-free publication models for equitable research." },
            ].map((feature, i) => (
              <div key={i} className="group bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#FCF7F9] flex items-center justify-center mb-6 group-hover:bg-[#7A1C39] transition-colors duration-300">
                  <span className="text-2xl text-[#7A1C39] group-hover:text-white transition-colors duration-300">{feature.icon}</span>
                </div>
                <h4 className="text-[16px] font-bold text-gray-900 mb-3">{feature.title}</h4>
                <p className="text-[13px] text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ================= ANNOUNCEMENTS (only when there are any) ================= */}
        {announcements?.length > 0 && (
          <section className="pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-[26px] font-serif font-bold text-gray-900">Announcements</h2>
              <Link to="/announcements" className="text-[#7A1C39] text-[13px] font-bold hover:underline">All announcements &rarr;</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {announcements.map((a) => (
                <Link key={a.id} to={`/announcements/${a.id}`} className="group block bg-white p-5 rounded-xl border border-gray-200 hover:border-[#7A1C39]/30 hover:shadow-md transition-all">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A1C39] mb-1">{fmtDate(a.published_at)}</p>
                  <h3 className="text-[15px] font-bold text-gray-900 group-hover:text-[#7A1C39] leading-snug">{a.title}</h3>
                  <p className="text-[12px] text-gray-500 mt-1">{String(a.body).split('\n')[0].slice(0, 120)}…</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ================= LATEST ARTICLES ================= */}
        <section className="bg-white py-20 border-y border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
              <div>
                <h2 className="text-[26px] font-serif font-bold text-gray-900">Latest Articles</h2>
                <p className="text-[13px] text-gray-500 mt-1">Recently published research from the Journal of Oromo Research.</p>
              </div>
              <Link to="/issues/current" className="text-[#7A1C39] text-[13px] font-bold hover:underline flex items-center gap-1 group">
                View Current Issue <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </Link>
            </div>

            <ArticleList articles={latest} />
          </div>
        </section>

        {/* ================= AUTHOR CTA ================= */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#7A1C39] rounded-3xl p-10 md:p-16 relative overflow-hidden flex flex-col md:flex-row justify-between items-center shadow-2xl">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full mix-blend-overlay filter blur-2xl"></div>

            <div className="relative z-10 md:max-w-xl text-center md:text-left mb-8 md:mb-0">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4 leading-tight">
                Ready to publish your research?
              </h2>
              <p className="text-[15px] text-[#E8C5D6]">
                Join a global network of researchers committed to rigorous, ethical scholarship. Submit your manuscript to the Journal of Oromo Research today.
              </p>
            </div>
            
            <div className="relative z-10 flex flex-col sm:flex-row gap-4 justify-center w-full md:w-auto">
              <Link to="/author-guide" className="bg-white text-[#7A1C39] px-8 py-3 rounded-lg text-[13px] font-bold hover:bg-gray-100 transition shadow-md hover:-translate-y-0.5 duration-300 w-full sm:w-auto text-center">
                Submit a Manuscript
              </Link>
              <Link to="/editorial" className="border border-white/30 text-white px-8 py-3 rounded-lg text-[13px] font-bold hover:bg-white/10 transition duration-300 w-full sm:w-auto text-center">
                Editorial Board
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
