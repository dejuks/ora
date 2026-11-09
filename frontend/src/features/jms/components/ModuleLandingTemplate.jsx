import React from 'react';
import { Link } from 'react-router-dom';
import GlobalHeader from './GlobalHeader';
import { SearchOutlined, ArrowRightOutlined } from '@ant-design/icons';

export default function ModuleLandingTemplate({ title, subtitle, heroImage, primaryColor, stats, subjects }) {
  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans">
      <GlobalHeader />
      
      {/* Hero */}
      <section className="bg-white py-16 px-4 border-b">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2">
            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">{title}</h1>
            <p className="text-[15px] text-gray-600 mb-8 max-w-lg">{subtitle}</p>
            <div className="flex gap-3">
              <button className="text-white px-6 py-3 rounded-lg font-bold shadow-md" style={{ backgroundColor: primaryColor }}>Browse Collection</button>
              <button className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-lg font-bold shadow-sm">Search</button>
            </div>
          </div>
          <div className="md:w-1/2">
            <img src={heroImage} alt={title} className="rounded-xl shadow-xl w-full h-[300px] object-cover" />
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="bg-white border-b py-6">
        <div className="max-w-7xl mx-auto px-4 flex justify-around text-center">
          {stats.map((s, i) => (
            <div key={i}>
              <p className="text-3xl font-bold text-gray-900">{s.value}</p>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Subjects / Categories */}
      <section className="py-16 max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-8">Browse by Subject</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {subjects.map((sub, i) => (
            <div key={i} className="bg-white p-6 rounded-xl border text-center hover:shadow-md transition cursor-pointer">
              <p className="text-[14px] font-bold text-gray-800">{sub}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}