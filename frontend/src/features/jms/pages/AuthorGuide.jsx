import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CheckCircleFilled, FileTextOutlined, UploadOutlined, SearchOutlined } from '@ant-design/icons';

export default function AuthorGuide() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] font-sans flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="relative py-20 bg-[#531324]">
          <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1455390582262-044cdead277a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')" }}></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#531324] to-transparent"></div>
          <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
            <p className="text-[11px] font-bold tracking-[0.2em] text-[#C59B4B] uppercase mb-3">Guidelines</p>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">Author Guide</h1>
            <p className="text-[15px] text-gray-200 max-w-2xl mx-auto">Everything you need to know about preparing and submitting your manuscript.</p>
          </div>
        </section>

        <section className="py-20 max-w-4xl mx-auto px-4">
          <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm">
            
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6 border-b pb-4">Submission Process</h2>
            
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[#FCF7F9] text-[#7A1849] flex items-center justify-center flex-shrink-0"><FileTextOutlined /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">1. Prepare your Manuscript</h3>
                  <p className="text-[14px] text-gray-600 leading-relaxed">Ensure your paper aligns with the journal's scope. Format your document according to our official Word/LaTeX templates. All figures must be high resolution and submitted separately or embedded as per guidelines.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[#FCF7F9] text-[#7A1849] flex items-center justify-center flex-shrink-0"><UploadOutlined /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">2. Submit Online</h3>
                  <p className="text-[14px] text-gray-600 leading-relaxed">Register an account on the ORA platform. Once logged in, navigate to the Author Dashboard and click "New Submission". Fill out the metadata (Title, Abstract, Keywords, Authors) and upload your files.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[#FCF7F9] text-[#7A1849] flex items-center justify-center flex-shrink-0"><SearchOutlined /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">3. Peer Review</h3>
                  <p className="text-[14px] text-gray-600 leading-relaxed">Your manuscript will undergo rigorous double-blind peer review. You can track the progress in real-time. If revisions are requested, you must upload a response-to-reviewers document along with your revised files.</p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-serif font-bold text-gray-900 mt-12 mb-6 border-b pb-4">Requirements & Policies</h2>
            <ul className="space-y-3">
              {[
                "Manuscripts must be original and not under consideration elsewhere.",
                "All authors must approve the final version of the submitted manuscript.",
                "Conflict of Interest statements are mandatory for all submissions.",
                "Data availability statements are highly encouraged.",
                "ORA is an Open Access publisher. Article Processing Charges (APCs) apply upon acceptance."
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircleFilled className="text-green-500 mt-1" />
                  <span className="text-[14px] text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}