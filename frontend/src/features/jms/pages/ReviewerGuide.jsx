import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { EyeInvisibleOutlined, ClockCircleOutlined, MessageOutlined } from '@ant-design/icons';

export default function ReviewerGuide() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] font-sans flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="relative py-20 bg-[#531324]">
          <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')" }}></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#531324] to-transparent"></div>
          <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
            <p className="text-[11px] font-bold tracking-[0.2em] text-[#C59B4B] uppercase mb-3">Guidelines</p>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">Reviewer Guide</h1>
            <p className="text-[15px] text-gray-200 max-w-2xl mx-auto">Maintain the integrity of ORA journals by providing fair and rigorous peer review.</p>
          </div>
        </section>

        <section className="py-20 max-w-4xl mx-auto px-4">
          <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6 border-b pb-4">Peer Review Standards</h2>
            
            <p className="text-[15px] text-gray-600 leading-relaxed mb-8">
              Thank you for contributing your expertise to the ORA Academic community. As a reviewer, you play a critical role in ensuring the quality and validity of published research. 
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
               <div className="p-5 bg-[#FCF7F9] rounded-xl border border-[#7A1849]/10 text-center">
                 <EyeInvisibleOutlined className="text-3xl text-[#7A1849] mb-3" />
                 <h4 className="font-bold text-gray-900 text-sm mb-1">Double-Blind</h4>
                 <p className="text-[12px] text-gray-500">You will not know the identity of the authors, and they will not know yours.</p>
               </div>
               <div className="p-5 bg-[#FCF7F9] rounded-xl border border-[#7A1849]/10 text-center">
                 <ClockCircleOutlined className="text-3xl text-[#7A1849] mb-3" />
                 <h4 className="font-bold text-gray-900 text-sm mb-1">Timely Response</h4>
                 <p className="text-[12px] text-gray-500">We request reviews be completed within 14 to 21 days of acceptance.</p>
               </div>
               <div className="p-5 bg-[#FCF7F9] rounded-xl border border-[#7A1849]/10 text-center">
                 <MessageOutlined className="text-3xl text-[#7A1849] mb-3" />
                 <h4 className="font-bold text-gray-900 text-sm mb-1">Constructive Feedback</h4>
                 <p className="text-[12px] text-gray-500">Provide detailed, actionable comments to help authors improve their work.</p>
               </div>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-3">How to Submit a Review</h3>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] text-gray-600">
              <li>Log in to your Reviewer Dashboard.</li>
              <li>Open the assigned manuscript from your queue.</li>
              <li>Download the manuscript PDF and any supplementary files.</li>
              <li>Fill out the review form (comments to authors, confidential comments to editor, and a recommendation).</li>
              <li>Submit the review before the deadline.</li>
            </ol>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}