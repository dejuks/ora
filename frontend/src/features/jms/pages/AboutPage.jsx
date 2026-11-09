import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { 
  GlobalOutlined, BookOutlined, TeamOutlined, 
  SafetyCertificateOutlined, CheckCircleFilled, 
  AimOutlined, ReadOutlined 
} from '@ant-design/icons';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] font-sans flex flex-col">
      <Header />

      <main className="flex-grow">
        
        {/* ================= HERO SECTION (Reduced Height & Image) ================= */}
        <section className="relative py-20 lg:py-24 overflow-hidden bg-[#531324]">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')" }}
          ></div>
          
          {/* Gradient Overlay to ensure text is readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#531324] via-[#531324]/90 to-[#531324]/60"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <p className="text-[11px] font-bold tracking-[0.2em] text-[#C59B4B] uppercase mb-3">
              About ORA Academic
            </p>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-white leading-tight mb-4 max-w-4xl mx-auto">
              Preserving Oromo Knowledge.<br/>Empowering Global Research.
            </h1>
            <p className="text-[15px] md:text-[16px] text-gray-200 max-w-2xl mx-auto leading-relaxed">
              The Oromo Research Association (ORA) Journal System is a premier open-access platform dedicated to the rigorous publication and global dissemination of scholarly work.
            </p>
          </div>
        </section>

        {/* ================= MISSION & VISION ================= */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Text */}
            <div>
              <p className="text-[11px] font-bold tracking-[0.15em] text-[#7A1C39] uppercase mb-3 flex items-center gap-2">
                <span className="w-6 h-[2px] bg-[#7A1C39]"></span> Our Mission
              </p>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6 leading-tight">
                Cultivating a vibrant ecosystem for Oromo scholarship.
              </h2>
              <p className="text-[15px] text-gray-600 leading-relaxed mb-6">
                We are committed to advancing the frontiers of science, humanities, and social sciences by providing a seamless, transparent, and highly credible publishing environment. 
              </p>
              <p className="text-[15px] text-gray-600 leading-relaxed mb-8">
                By eliminating financial barriers to access and publication, we ensure that researchers, students, and the global public can freely engage with high-quality academic literature.
              </p>
              
              <div className="space-y-4">
                {[
                  "Rigorous, double-blind peer review",
                  "100% Open Access publishing",
                  "Compliance with international ethics (COPE)",
                  "Rapid, transparent editorial timelines"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircleFilled className="text-[#7A1C39] text-lg" />
                    <span className="text-[14px] font-medium text-gray-800">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Images (Journal/Reading Focused) */}
            <div className="relative h-[420px] hidden lg:block">
              <img 
                src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
                alt="Library Books" 
                className="absolute top-0 right-0 w-[75%] h-[320px] object-cover rounded-2xl shadow-xl border-4 border-white"
              />
              <img 
                src="https://images.unsplash.com/photo-1455390582262-044cdead277a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" 
                alt="Writing Research" 
                className="absolute bottom-0 left-0 w-[60%] h-[250px] object-cover rounded-2xl shadow-2xl border-4 border-white"
              />
              <div className="absolute top-1/2 left-1/4 bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex items-center gap-3">
                 <div className="bg-[#FCF7F9] p-2 rounded-full"><BookOutlined className="text-[#7A1C39] text-xl" /></div>
                 <div>
                   <p className="text-[16px] font-bold text-gray-900">24+</p>
                   <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Journals</p>
                 </div>
              </div>
            </div>
            
          </div>
        </section>

        {/* ================= CORE VALUES ================= */}
        <section className="py-20 bg-white border-y border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-serif font-bold text-gray-900 mb-4">Our Core Values</h2>
              <p className="text-[15px] text-gray-500 max-w-2xl mx-auto">
                Everything we do is guided by our commitment to academic excellence, integrity, and community.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: <AimOutlined />, title: "Academic Rigor", desc: "We uphold the highest standards of peer review to ensure the validity and impact of published research." },
                { icon: <GlobalOutlined />, title: "Open Access", desc: "Knowledge should not be locked behind paywalls. We make all our content freely available to the world." },
                { icon: <SafetyCertificateOutlined />, title: "Ethical Integrity", desc: "We strictly adhere to COPE guidelines, ensuring transparency and fairness in every editorial decision." },
                { icon: <TeamOutlined />, title: "Community Driven", desc: "Our platform is built by researchers, for researchers, fostering a collaborative scholarly ecosystem." }
              ].map((value, i) => (
                <div key={i} className="bg-[#FAF9F6] p-8 rounded-2xl border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl text-[#7A1C39] mb-6 group-hover:bg-[#7A1C39] group-hover:text-white transition-colors duration-300">
                    {value.icon}
                  </div>
                  <h3 className="text-[17px] font-bold text-gray-900 mb-3">{value.title}</h3>
                  <p className="text-[13px] text-gray-600 leading-relaxed">{value.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= IMPACT STATS ================= */}
        <section className="py-16 bg-[#7A1C39]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-white/20">
              <div>
                <p className="text-4xl font-serif font-bold text-white mb-2">24</p>
                <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Active Journals</p>
              </div>
              <div>
                <p className="text-4xl font-serif font-bold text-white mb-2">1,500+</p>
                <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Published Articles</p>
              </div>
              <div>
                <p className="text-4xl font-serif font-bold text-white mb-2">50k+</p>
                <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Global Downloads</p>
              </div>
              <div>
                <p className="text-4xl font-serif font-bold text-white mb-2">120+</p>
                <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Expert Editors</p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= CALL TO ACTION ================= */}
        <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ReadOutlined className="text-5xl text-[#7A1C39] mb-6 opacity-20" />
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">
            Join our community of scholars.
          </h2>
          <p className="text-[15px] text-gray-600 mb-10 max-w-xl mx-auto">
            Whether you are an author looking to publish your next breakthrough, or a reviewer dedicated to maintaining academic standards, there is a place for you here.
          </p>
          <div className="flex justify-center gap-4">
            <button className="bg-[#7A1C39] text-white px-8 py-3.5 rounded-lg text-[14px] font-bold hover:bg-[#531324] transition shadow-lg hover:-translate-y-0.5">
              Submit Your Research
            </button>
            <button className="bg-white text-gray-800 border border-gray-300 px-8 py-3.5 rounded-lg text-[14px] font-bold hover:bg-gray-50 transition shadow-sm">
              Become a Reviewer
            </button>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}