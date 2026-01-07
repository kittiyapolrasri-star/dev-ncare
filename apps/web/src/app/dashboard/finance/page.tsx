'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    TrendingUp,
    TrendingDown,
    Calendar,
    Search,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    Users,
    Building2
} from 'lucide-react';
import { apiService } from '@/lib/api';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function FinancePage() {
    const [tab, setTab] = useState<'ar' | 'ap'>('ar');
    const [search, setSearch] = useState('');

    const fetchFn = tab === 'ar' ? apiService.getArAging : apiService.getApAging;

    const { data, isLoading } = useQuery({
        queryKey: ['finance', tab, search],
        queryFn: async () => {
            const res = await fetchFn({ search });
            return res.data.data;
        },
    });

    const summary = data?.summary || {};
    const details = data?.details || [];

    const stats = [
        {
            title: tab === 'ar' ? 'ลูกหนี้ทั้งหมด (AR)' : 'เจ้าหนี้ทั้งหมด (AP)',
            value: tab === 'ar' ? summary.totalReceivable : summary.totalPayable,
            icon: tab === 'ar' ? <TrendingUp className="w-5 h-5 text-success-600" /> : <TrendingDown className="w-5 h-5 text-danger-600" />,
            color: tab === 'ar' ? 'success' : 'danger',
            bg: tab === 'ar' ? 'bg-success-50' : 'bg-danger-50'
        },
        {
            title: 'ยังไม่ถึงกำหนด',
            value: summary.notDue,
            icon: <Calendar className="w-5 h-5 text-primary-600" />,
            color: 'primary',
            bg: 'bg-primary-50'
        },
        {
            title: 'เกินกำหนด 1-30 วัน',
            value: summary.overdue30,
            icon: <Calendar className="w-5 h-5 text-warning-600" />,
            color: 'warning',
            bg: 'bg-warning-50'
        },
        {
            title: 'เกินกำหนด > 90 วัน',
            value: summary.overdueMore,
            icon: <Calendar className="w-5 h-5 text-danger-600" />,
            color: 'danger',
            bg: 'bg-danger-50',
            isAlert: true
        }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">การเงินและบัญชี</h1>
                    <p className="text-gray-500">ติดตามหนี้สินและลูกหนี้การค้า (Aging Report)</p>
                </div>

                {/* Tab Switcher */}
                <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                    <button
                        onClick={() => setTab('ar')}
                        className={clsx(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                            tab === 'ar' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-600 hover:text-gray-900'
                        )}
                    >
                        <Users className="w-4 h-4" />
                        ลูกหนี้ (AR)
                    </button>
                    <button
                        onClick={() => setTab('ap')}
                        className={clsx(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                            tab === 'ap' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-600 hover:text-gray-900'
                        )}
                    >
                        <Building2 className="w-4 h-4" />
                        เจ้าหนี้ (AP)
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-4">
                {isLoading ? (
                    [...Array(4)].map((_, i) => <div key={i} className="card h-32 skeleton" />)
                ) : (
                    stats.map((stat, i) => (
                        <div key={i} className="card-hover">
                            <div className="flex items-start justify-between mb-2">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bg}`}>
                                    {stat.icon}
                                </div>
                                {stat.isAlert && stat.value > 0 && (
                                    <span className="badge-danger">Action Needed</span>
                                )}
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                                ฿{(stat.value || 0).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500">{stat.title}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Main Content */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {tab === 'ar' ? 'รายการลูกหนี้รายตัว' : 'รายการเจ้าหนี้รายตัว'}
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={tab === 'ar' ? "ค้นหาลูกค้า..." : "ค้นหาผู้จำหน่าย..."}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 w-64"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 text-left border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase">
                                    {tab === 'ar' ? 'ลูกค้า' : 'ผู้จำหน่าย'}
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">ยอดรวม</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase text-success-600">ยังไม่ถึงกำหนด</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase text-warning-600">1-30 วัน</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase text-orange-600">31-60 วัน</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase text-danger-600">&gt; 90 วัน</th>
                                <th className="px-6 py-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={7} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary-600" /></td></tr>
                            ) : details.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-12 text-gray-500">ไม่พบรายการหนี้คงค้าง</td></tr>
                            ) : (
                                details.map((item: any, idx: number) => (
                                    <AgingRow key={idx} item={item} type={tab} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function AgingRow({ item, type }: { item: any; type: 'ar' | 'ap' }) {
    const [expanded, setExpanded] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<any>(null);

    return (
        <>
            <tr
                className={clsx("hover:bg-gray-50 transition-colors cursor-pointer", expanded && "bg-gray-50")}
                onClick={() => setExpanded(!expanded)}
            >
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${type === 'ar' ? 'bg-primary-100 text-primary-700' : 'bg-orange-100 text-orange-700'}`}>
                            {(item.customerName || item.supplierName || '?')[0]}
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">{item.customerName || item.supplierName}</p>
                            <p className="text-xs text-gray-500">{item.customerId || item.supplierId}</p>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4 text-right font-bold text-gray-900">
                    ฿{item.totalAmount.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-gray-600">
                    {item.buckets.not_due > 0 ? `฿${item.buckets.not_due.toLocaleString()}` : '-'}
                </td>
                <td className="px-6 py-4 text-right text-warning-600">
                    {item.buckets['0-30'] > 0 ? `฿${item.buckets['0-30'].toLocaleString()}` : '-'}
                </td>
                <td className="px-6 py-4 text-right text-orange-600">
                    {item.buckets['31-60'] > 0 ? `฿${item.buckets['31-60'].toLocaleString()}` : '-'}
                </td>
                <td className="px-6 py-4 text-right text-danger-600 font-medium">
                    {item.buckets['>90'] > 0 ? `฿${item.buckets['>90'].toLocaleString()}` : '-'}
                </td>
                <td className="px-6 py-4 text-center">
                    {expanded ? <ArrowDownRight className="w-4 h-4 text-gray-400" /> : <ArrowUpRight className="w-4 h-4 text-gray-400" />}
                </td>
            </tr>
            {expanded && (
                <tr className="bg-gray-50/50">
                    <td colSpan={7} className="px-6 py-4">
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        <th className="px-4 py-2 text-left">เลขที่เอกสาร</th>
                                        <th className="px-4 py-2 text-left">วันที่</th>
                                        <th className="px-4 py-2 text-left">วันครบกำหนด</th>
                                        <th className="px-4 py-2 text-center">ช่วงอายุ</th>
                                        <th className="px-4 py-2 text-right">ยอดคงเหลือ</th>
                                        <th className="px-4 py-2 text-center">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(item.invoices || item.documents).map((doc: any) => (
                                        <tr key={doc.id}>
                                            <td className="px-4 py-3 font-medium text-primary-600">{doc.invoiceNumber || doc.poNumber}</td>
                                            <td className="px-4 py-3 text-gray-500">
                                                {format(new Date(doc.date), 'dd MMM yy', { locale: th })}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">
                                                {doc.dueDate ? format(new Date(doc.dueDate), 'dd MMM yy', { locale: th }) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={clsx(
                                                    'px-2 py-0.5 rounded text-xs',
                                                    doc.bucket === 'not_due' ? 'bg-success-100 text-success-700' :
                                                        doc.bucket === '0-30' ? 'bg-warning-100 text-warning-700' :
                                                            'bg-danger-100 text-danger-700'
                                                )}>
                                                    {doc.bucket === 'not_due' ? 'ยังไม่ครบ' : doc.bucket}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">
                                                ฿{doc.outstanding.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedDoc(doc);
                                                    }}
                                                    className={clsx(
                                                        "px-3 py-1 rounded text-xs font-medium transition-colors",
                                                        type === 'ar'
                                                            ? "bg-primary-50 text-primary-600 hover:bg-primary-100"
                                                            : "bg-orange-50 text-orange-600 hover:bg-orange-100"
                                                    )}
                                                >
                                                    {type === 'ar' ? 'รับชำระ' : 'ชำระเงิน'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </td>
                </tr>
            )}

            {selectedDoc && (
                <PaymentModal
                    isOpen={!!selectedDoc}
                    onClose={() => setSelectedDoc(null)}
                    type={type}
                    document={selectedDoc}
                    customerName={item.customerName || item.supplierName}
                />
            )}
        </>
    );
}

function PaymentModal({ isOpen, onClose, type, document, customerName }: any) {
    const [amount, setAmount] = useState(document.outstanding);
    const [method, setMethod] = useState('CASH');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await apiService.createPayment({
                type: type.toUpperCase(),
                documentId: document.id,
                amount: Number(amount),
                paymentMethod: method,
                notes
            });
            // Reload page or invalidate query
            window.location.reload();
        } catch (error) {
            alert('Failed to record payment');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-900">
                        {type === 'ar' ? 'รับชำระเงิน' : 'บันทึกการจ่ายเงิน'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-500">เอกสาร:</span>
                            <span className="font-medium">{document.invoiceNumber || document.poNumber}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-500">{type === 'ar' ? 'ลูกค้า' : 'ผู้จำหน่าย'}:</span>
                            <span className="font-medium">{customerName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">ยอดคงเหลือ:</span>
                            <span className="font-bold text-gray-900">฿{document.outstanding.toLocaleString()}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงินที่ชำระ</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">฿</span>
                            <input
                                type="number"
                                required
                                min="0"
                                max={document.outstanding}
                                step="any"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="pl-8 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ช่องทางการชำระ</label>
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="CASH">เงินสด (Cash)</option>
                            <option value="BANK_TRANSFER">โอนเงิน (Bank Transfer)</option>
                            <option value="CHECK">เช็ค (Check)</option>
                            <option value="CREDIT_CARD">บัตรเครดิต (Credit Card)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">บันทึกเพิ่มเติม</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={clsx(
                                "flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50",
                                type === 'ar' ? "bg-primary-600" : "bg-orange-600"
                            )}
                        >
                            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
