import React from 'react';
import Header from './Header';
import Footer from './Footer';

/** Header + maroon hero + footer used by the data-driven public pages. */
export default function PublicShell({ eyebrow, title, subtitle, children, actions }) {
  return (
    <div className="min-h-screen bg-[#FAF9F6] font-sans flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="relative py-16 bg-[#531324]">
          <div className="absolute inset-0 bg-gradient-to-r from-[#531324] to-[#2D0A14]"></div>
          <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
            {eyebrow && <p className="text-[11px] font-bold tracking-[0.2em] text-[#C59B4B] uppercase mb-3">{eyebrow}</p>}
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-4">{title}</h1>
            {subtitle && <p className="text-[15px] text-gray-200 max-w-2xl mx-auto">{subtitle}</p>}
            {actions && <div className="mt-6 flex justify-center gap-3">{actions}</div>}
          </div>
        </section>
        <section className="py-12 max-w-6xl mx-auto px-4">{children}</section>
      </main>
      <Footer />
    </div>
  );
}

export const Note = ({ children }) => <p className="text-[14px] text-gray-500 text-center py-10">{children}</p>;
