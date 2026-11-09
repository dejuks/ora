import React, { useState } from 'react';
import AdminLayout from '../../layouts/JmsLayout';
import { useTheme } from '../../context/ThemeContext';
import { Table, Button, Select, Modal, Input, message } from 'antd';
import { get, post, errorMessage } from '../../api';
import { useLoad } from '../../hooks';
import { fmtDate, money } from '../../format';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  MobileOutlined, 
  BankOutlined, 
  LockOutlined 
} from '@ant-design/icons';

export default function PublishingFees() {
  const { isDarkMode } = useTheme();
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('telebirr');

  const bgCard = isDarkMode ? 'bg-[#1E1E1E] border-[#2D2D2D]' : 'bg-white border-gray-100';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  const { data: rows, loading, error, reload } = useLoad(() => get('/author/fees'));
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const FEE_TYPE = { APC: 'APC (Gold Open Access)', PAGE_COLOR_CHARGE: 'Page & Color Charges' };
  const STATUS = { PENDING: 'Pending', VERIFYING: 'Verifying', PAID: 'Paid', WAIVED: 'Waived', WAIVER_REQUESTED: 'Waiver requested', CANCELLED: 'Cancelled' };
  const data = (rows || []).map((f) => {
    const overdue = f.status === 'PENDING' && f.due_date && new Date(f.due_date + 'T23:59:59') < new Date();
    return {
      key: f.id, id: f.id, title: f.title, journal: f.journal_title, type: FEE_TYPE[f.fee_type] || f.fee_type,
      amount: money(f.amount, f.currency), amountRaw: f.amount, currency: f.currency, raw: f.status, invoice: f.invoice_no,
      status: overdue ? 'Overdue' : STATUS[f.status] || f.status,
      date: f.status === 'PAID' ? `Paid on ${fmtDate(f.paid_at)}` : f.due_date ? `Due by ${fmtDate(f.due_date)}` : '—',
    };
  });
  const sum = (pred) => data.filter(pred).reduce((t, d) => t + d.amountRaw, 0);
  const open = data.filter((d) => ['PENDING', 'VERIFYING'].includes(d.raw));
  const paid = data.filter((d) => d.raw === 'PAID');
  const cur = data[0]?.currency || 'USD';

  const filteredData = data.filter(item => statusFilter === 'All' || item.status === statusFilter);

  const handlePayClick = (record) => {
    setSelectedInvoice(record);
    setReference('');
    setReason('');
    setIsModalOpen(true);
  };

  const submitPayment = async () => {
    setBusy(true);
    try {
      const res = await post(`/author/fees/${selectedInvoice.id}/pay`, { payment_reference: reference });
      message.success(res.message);
      setIsModalOpen(false);
      reload();
    } catch (e) { message.error(errorMessage(e)); } finally { setBusy(false); }
  };

  const requestWaiver = async () => {
    setBusy(true);
    try {
      const res = await post(`/author/fees/${selectedInvoice.id}/waiver`, { reason });
      message.success(res.message);
      setIsModalOpen(false);
      reload();
    } catch (e) { message.error(errorMessage(e)); } finally { setBusy(false); }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Paid': return 'bg-[#F0FDF4] text-[#15803D]';
      case 'Pending': case 'Verifying': case 'Waiver requested': return 'bg-[#FFF7ED] text-[#C2410C]';
      case 'Waived': return 'bg-[#EBF1FA] text-[#1A56DB]';
      case 'Overdue': return 'bg-[#FEF2F2] text-[#B91C1C]';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const columns = [
    { 
      title: 'PAPER TITLE', 
      dataIndex: 'title', 
      key: 'title', 
      render: (text, record) => (
        <div>
          <p className={`text-[13px] font-bold ${textMain} leading-tight`}>{text}</p>
          <p className={`text-[11.5px] font-medium mt-1 ${textMuted}`}>{record.journal}</p>
        </div>
      )
    },
    { 
      title: 'FEE TYPE', 
      dataIndex: 'type', 
      key: 'type', 
      render: text => <span className={`text-[12px] font-medium ${textMuted}`}>{text}</span> 
    },
    { 
      title: 'AMOUNT', 
      dataIndex: 'amount', 
      key: 'amount', 
      render: text => <span className={`text-[13px] font-bold ${textMain}`}>{text}</span> 
    },
    { 
      title: 'STATUS', 
      dataIndex: 'status', 
      key: 'status', 
      render: status => (
        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${getStatusStyle(status)}`}>
          {status}
        </span>
      )
    },
    { 
      title: 'BILLING DATE / INFO', 
      dataIndex: 'date', 
      key: 'date', 
      render: text => <span className={`text-[12px] font-medium ${textMuted}`}>{text}</span> 
    },
    { 
      title: 'ACTIONS', 
      key: 'actions', 
      align: 'right', 
      render: (_, record) => (
        <Button 
          onClick={() => handlePayClick(record)}
          className={`${
            record.status === 'Paid' 
              ? (isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600 border border-gray-200') 
              : 'bg-[#7A1849] text-white hover:bg-[#5E1136]'
          } font-bold text-[11px] rounded-md border-0 px-5 h-8`}
        >
          {['Paid', 'Waived'].includes(record.status) ? 'View' : record.status === 'Verifying' ? 'Details' : 'Pay'}
        </Button>
      )
    }
  ];

  return (
    <AdminLayout>
      <div className="max-w-[1300px] mx-auto animate-fade-in-up">
        
        {/* Header */}
        <div className="mb-8">
          <p className={`text-[10px] font-bold tracking-[0.1em] uppercase mb-1.5 ${textMuted}`}>WORKSPACE / FEES</p>
          <h1 className={`text-[26px] font-bold tracking-tight ${textMain}`}>Publishing Fees</h1>
          <p className={`text-[13px] font-medium mt-1 ${textMuted}`}>Review Article Processing Charges (APCs) and invoicing statements.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`p-5 rounded-xl border shadow-sm ${bgCard}`}>
            <p className={`text-[11px] font-bold text-gray-400 mb-1`}>Open Invoices</p>
            <h3 className={`text-[22px] font-bold tracking-tight ${textMain}`}>{money(sum((d) => ['PENDING', 'VERIFYING'].includes(d.raw)), cur)}</h3>
            <p className="text-[11px] font-medium text-[#D93025] mt-2">{open.length} payment{open.length === 1 ? '' : 's'} outstanding</p>
          </div>
          <div className={`p-5 rounded-xl border shadow-sm ${bgCard}`}>
            <p className={`text-[11px] font-bold text-gray-400 mb-1`}>Total Paid</p>
            <h3 className={`text-[22px] font-bold tracking-tight ${textMain}`}>{money(sum((d) => d.raw === 'PAID'), cur)}</h3>
            <p className="text-[11px] font-medium text-[#15803D] mt-2">{paid.length} publication{paid.length === 1 ? '' : 's'} settled</p>
          </div>
          <div className={`p-5 rounded-xl border shadow-sm ${bgCard}`}>
            <p className={`text-[11px] font-bold text-gray-400 mb-1`}>How payment works</p>
            <h3 className={`text-[14px] font-bold tracking-tight ${textMain}`}>Pay by Telebirr or CBEbirr</h3>
            <p className="text-[11px] font-medium text-[#1A56DB] mt-2">Enter your transaction ID; the journal office confirms it.</p>
          </div>
        </div>

        {/* Table Container */}
        <div className={`rounded-xl border shadow-sm overflow-hidden ${bgCard}`}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-5 border-b border-gray-100 dark:border-gray-800">
            <h2 className={`text-[15px] font-bold tracking-tight ${textMain}`}>Invoice Statements</h2>
            <Select 
              value={statusFilter} 
              onChange={setStatusFilter}
              className={`w-36 h-8 ${isDarkMode ? 'dark-select' : ''}`}
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Overdue', label: 'Overdue' },
                { value: 'Verifying', label: 'Verifying' },
                { value: 'Waived', label: 'Waived' },
              ]}
            />
          </div>
          {error && <p className="px-5 py-3 text-[12px] text-red-600">{error}</p>}
          <Table loading={loading} locale={{ emptyText: 'No fees yet. A fee is created when a manuscript is accepted.' }} columns={columns} dataSource={filteredData} pagination={false} className={`ora-table ${isDarkMode ? 'dark-table' : ''}`} />
        </div>

        {/* Payment Methods Row */}
        <div className={`mt-6 p-5 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 ${bgCard}`}>
          <div className="flex-1 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#4A1229] text-white px-2 py-1 rounded text-[10px] font-bold">Telebirr</div>
              <div>
                <p className={`text-[13px] font-bold ${textMain}`}>Telebirr</p>
                <p className={`text-[11px] ${textMuted}`}>Pay securely with your Telebirr wallet</p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#7A1849] text-white px-2 py-1 rounded text-[10px] font-bold">CBEbirr</div>
              <div>
                <p className={`text-[13px] font-bold ${textMain}`}>CBEbirr</p>
                <p className={`text-[11px] ${textMuted}`}>Pay securely with your CBEbirr wallet</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={480}
        centered
        className={`ora-modal ${isDarkMode ? 'dark-modal' : ''}`}
        closeIcon={<CloseCircleOutlined className="text-gray-400 hover:text-gray-600" />}
      >
        <div className="pt-4 pb-2">
          <h2 className={`text-xl font-bold mb-1 ${textMain}`}>{selectedInvoice?.raw === 'PENDING' ? 'Complete Payment' : 'Invoice'}</h2>
          <p className={`text-[13px] mb-2 ${textMuted}`}>{selectedInvoice?.title}</p>
          <p className={`text-[13px] mb-4 ${textMuted}`}>Invoice {selectedInvoice?.invoice || '—'} · <strong className="text-[#7A1849]">{selectedInvoice?.amount}</strong> · {selectedInvoice?.status}</p>

          {selectedInvoice?.raw === 'PENDING' && (<>
          <p className={`text-[12px] mb-3 ${textMuted}`}>Pay with your wallet, then enter the transaction ID below. The journal office will confirm it.</p>
          <div className="space-y-3 mb-5">
            <label onClick={() => setPaymentMethod('telebirr')} className={`flex items-center gap-4 p-3 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'telebirr' ? 'border-[#7A1849] bg-[#FCF7F9]' : 'border-gray-200'}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${paymentMethod === 'telebirr' ? 'bg-[#7A1849] text-white' : 'bg-gray-100 text-gray-500'}`}><MobileOutlined /></div>
              <div className="flex-1"><p className={`text-[14px] font-bold ${textMain}`}>Telebirr</p></div>
              {paymentMethod === 'telebirr' && <CheckCircleOutlined className="text-[#7A1849] text-lg" />}
            </label>
            <label onClick={() => setPaymentMethod('cbebirr')} className={`flex items-center gap-4 p-3 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'cbebirr' ? 'border-[#7A1849] bg-[#FCF7F9]' : 'border-gray-200'}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${paymentMethod === 'cbebirr' ? 'bg-[#7A1849] text-white' : 'bg-gray-100 text-gray-500'}`}><BankOutlined /></div>
              <div className="flex-1"><p className={`text-[14px] font-bold ${textMain}`}>CBEbirr</p></div>
              {paymentMethod === 'cbebirr' && <CheckCircleOutlined className="text-[#7A1849] text-lg" />}
            </label>
          </div>
          <Input placeholder="Transaction ID / reference" value={reference} onChange={(e) => setReference(e.target.value)} className="mb-3" />
          <button disabled={busy || reference.trim().length < 3} onClick={submitPayment} className="w-full bg-[#7A1849] text-white py-3 rounded-xl font-bold hover:bg-[#5E1136] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
            <LockOutlined /> Submit payment reference
          </button>
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className={`text-[12px] font-bold mb-2 ${textMain}`}>Cannot pay? Request a fee waiver</p>
            <Input.TextArea rows={2} placeholder="Explain why you need a waiver (at least 10 characters)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button disabled={busy || reason.trim().length < 10} onClick={requestWaiver} className="mt-2 text-[12px] font-bold text-[#7A1849] hover:underline disabled:opacity-40">Send waiver request</button>
          </div>
          </>)}
          {selectedInvoice?.raw === 'VERIFYING' && <p className={`text-[13px] ${textMuted}`}>Your payment reference was received and is waiting for confirmation by the journal office.</p>}
          {selectedInvoice?.raw === 'WAIVER_REQUESTED' && <p className={`text-[13px] ${textMuted}`}>Your waiver request is waiting for the journal manager's decision.</p>}
          {['PAID', 'WAIVED'].includes(selectedInvoice?.raw) && <p className={`text-[13px] ${textMuted}`}>This invoice is settled. Thank you.</p>}
        </div>
      </Modal>
      <style dangerouslySetInnerHTML={{__html: `
        .ora-table .ant-table-thead > tr > th { 
          background-color: #7A1849 !important; 
          color: white !important; 
          font-weight: 600 !important; 
          font-size: 10px !important; 
          text-transform: uppercase; 
          letter-spacing: 0.05em;
          border-bottom: none; 
          padding: 12px 16px; 
        }
        .dark-table .ant-table { background: transparent; color: #E5E7EB; }
        .dark-table .ant-table-tbody > tr > td { color: #E5E7EB; border-bottom: 1px solid #2D2D2D; padding: 16px; }
        .ora-table .ant-table-tbody > tr > td { padding: 16px; border-bottom: 1px solid #F3F4F6; }
        .ora-table .ant-table-tbody > tr:hover > td { background-color: ${isDarkMode ? '#2A2A2A' : '#FAFAFA'} !important; }
        .dark-select .ant-select-selector { background-color: #1A1A1A !important; border-color: #3D3D3D !important; color: white !important; }
        .ora-modal .ant-modal-content { border-radius: 20px !important; padding: 24px !important; }
        .dark-modal .ant-modal-content { background-color: #1E1E1E !important; border: 1px solid #2D2D2D; }
      `}} />
    </AdminLayout>
  );
}