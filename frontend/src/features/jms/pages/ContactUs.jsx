import React, { useState } from 'react';
import { message } from 'antd';
import PublicShell from '../components/PublicShell';
import { post, errorMessage } from '../api';
import { MailOutlined, PhoneOutlined, EnvironmentOutlined, SendOutlined } from '@ant-design/icons';

const input = 'w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50/50 text-[14px] outline-none focus:bg-white focus:border-[#7A1C39]';

export default function ContactUs() {
  const [f, setF] = useState({ name: '', email: '', subject: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await post('/public/contact', f); setSent(true); setF({ name: '', email: '', subject: '', message: '' }); }
    catch (err) { message.error(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <PublicShell eyebrow="Get in touch" title="Contact Us" subtitle="Reach out to the editorial office or technical support team.">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden flex flex-col lg:flex-row">
        <div className="w-full lg:w-2/5 bg-[#7A1C39] p-10 text-white space-y-6">
          <h2 className="text-2xl font-serif font-bold">Let's talk</h2>
          <p className="text-[14px] text-gray-300 leading-relaxed">Have a question about submissions, peer review, or partnerships? Our team is here to help.</p>
          <p className="flex items-center gap-3 text-[14px]"><MailOutlined /> support@ora-academic.org</p>
          <p className="flex items-center gap-3 text-[14px]"><PhoneOutlined /> +251 900 000 000</p>
          <p className="flex items-center gap-3 text-[14px]"><EnvironmentOutlined /> Bole, Addis Ababa, Ethiopia</p>
        </div>
        <div className="w-full lg:w-3/5 p-10">
          {sent ? (
            <div className="text-center py-16"><h3 className="text-xl font-bold text-gray-900 mb-2">Thank you!</h3><p className="text-[14px] text-gray-500">Your message was sent. We will reply by email.</p><button onClick={() => setSent(false)} className="mt-6 text-[#7A1C39] font-bold text-[13px] hover:underline">Send another message</button></div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <input required className={input} placeholder="Your name" value={f.name} onChange={set('name')} />
                <input required type="email" className={input} placeholder="Email address" value={f.email} onChange={set('email')} />
              </div>
              <input required className={input} placeholder="Subject" value={f.subject} onChange={set('subject')} />
              <textarea required rows="6" className={`${input} resize-none`} placeholder="How can we help? (at least 10 characters)" value={f.message} onChange={set('message')} />
              <button disabled={busy} className="bg-[#7A1C39] text-white px-8 py-3 rounded-lg text-[13px] font-bold hover:bg-[#531324] disabled:opacity-50 flex items-center gap-2"><SendOutlined /> {busy ? 'Sending…' : 'Send message'}</button>
            </form>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
