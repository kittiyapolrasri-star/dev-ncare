'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    FileCheck,
    Search,
    Eye,
    Plus,
    X,
    Loader2,
    Send,
    Download,
    FileText
} from 'lucide-react';
import { apiService } from '@/lib/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function ETaxPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    // Fetch E-Tax Invoices
    const { data, isLoading } = useQuery({
        queryKey: ['etax', search, status],
        queryFn: async () => {
            const params: any = { search };
            if (status !== 'all') params.status = status;
            const res = await apiService.api.get('/etax', { params });
            return res.data;
        },
    });

    const invoices = data?.data || [];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">ใบกำกับภาษีอิเล็กทรอนิกส์ (E-Tax)</h1>
                    <p className="text-gray-500">ออกเอกสารและส่งข้อมูลไปยังกรมสรรพากร</p>
                </div>
                <button
                    onClick={() => setShowGenerateModal(true)}
                    className="btn-primary"
                >
                    <Plus className="w-5 h-5" />
                    ออกใบกำกับภาษีใหม่
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid md:grid-cols-4 gap-4">
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                            <FileCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
                            <p className="text-sm text-gray-500">เอกสารทั้งหมด</p>
                        </div>
                    </div>
                </div>
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center text-warning-600">
                            <Loader2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {invoices.filter((inv: any) => inv.status === 'GENERATED').length}
                            </p>
                            <p className="text-sm text-gray-500">รอส่งสรรพากร</p>
                        </div>
                    </div>
                </div>
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center text-success-600">
                            <Send className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {invoices.filter((inv: any) => inv.status === 'SENT_TO_RD').length}
                            </p>
                            <p className="text-sm text-gray-500">ส่งแล้ว</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาเลขที่เอกสาร, ชื่อลูกค้า..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">ทุกสถานะ</option>
                        <option value="GENERATED">รอส่งสรรพากร</option>
                        <option value="SENT_TO_RD">ส่งแล้ว</option>
                        <option value="CANCELLED">ยกเลิก</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">เลขที่เอกสาร</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">วันที่</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">ลูกค้า</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">ยอดรวม</th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">สถานะ</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            <tr><td colSpan={6} className="text-center p-8"><Loader2 className="animate-spin mx-auto" /></td></tr>
                        ) : invoices.length === 0 ? (
                            <tr><td colSpan={6} className="text-center p-8 text-gray-500">ไม่พบเอกสาร</td></tr>
                        ) : invoices.map((invoice: any) => (
                            <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">{invoice.invoiceNumber}</td>
                                <td className="px-6 py-4 text-gray-600">
                                    {format(new Date(invoice.invoiceDate), 'dd/MM/yyyy', { locale: th })}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{invoice.customerName}</div>
                                    <div className="text-xs text-gray-500">Tax ID: {invoice.customerTaxId}</div>
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-gray-900">
                                    ฿{parseFloat(invoice.totalAmount).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={clsx('badge', {
                                        'badge-warning': invoice.status === 'GENERATED',
                                        'badge-success': invoice.status === 'SENT_TO_RD' || invoice.status === 'COMPLETED',
                                        'badge-danger': invoice.status === 'CANCELLED' || invoice.status === 'FAILED',
                                    })}>
                                        {invoice.status === 'GENERATED' ? 'สร้างแล้ว' :
                                            invoice.status === 'SENT_TO_RD' ? 'ส่งแล้ว' :
                                                invoice.status === 'COMPLETED' ? 'สมบูรณ์' : 'ยกเลิก'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => { setSelectedInvoice(invoice); setShowModal(true); }}
                                        className="btn-secondary btn-sm"
                                    >
                                        <Eye className="w-4 h-4 mr-1" />
                                        ดู
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* View Modal */}
            {showModal && selectedInvoice && (
                <ViewInfoModal
                    invoice={selectedInvoice}
                    onClose={() => setShowModal(false)}
                    onUpdate={() => {
                        setShowModal(false);
                        queryClient.invalidateQueries({ queryKey: ['etax'] });
                    }}
                />
            )}

            {/* Generate Modal */}
            {showGenerateModal && (
                <GenerateModal
                    onClose={() => setShowGenerateModal(false)}
                    onSuccess={() => {
                        setShowGenerateModal(false);
                        queryClient.invalidateQueries({ queryKey: ['etax'] });
                    }}
                />
            )}
        </div>
    );
}

function ViewInfoModal({ invoice, onClose, onUpdate }: any) {
    const sendMutation = useMutation({
        mutationFn: () => apiService.api.post(`/etax/${invoice.id}/send`),
        onSuccess: () => {
            toast.success('ส่งข้อมูลไปยังกรมสรรพากรเรียบร้อยแล้ว');
            onUpdate();
        },
        onError: () => toast.error('เกิดข้อผิดพลาดในการส่งข้อมูล')
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-y-auto animate-slide-up p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-xl font-bold">รายละเอียด E-Tax</h2>
                    <button onClick={onClose}><X className="w-5 h-5" /></button>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-500">เลขที่เอกสาร</span>
                        <span className="font-medium">{invoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">วันที่</span>
                        <span className="font-medium">{format(new Date(invoice.invoiceDate), 'dd MMM yyyy HH:mm', { locale: th })}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">ลูกค้า</span>
                        <span className="font-medium">{invoice.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Tax ID</span>
                        <span className="font-medium">{invoice.customerTaxId || '-'} ({invoice.customerBranch || '00000'})</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-500">มูลค่าสินค้า (ก่อน VAT)</span>
                        <span className="font-medium">฿{parseFloat(invoice.amountBeforeVat).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">VAT (7%)</span>
                        <span className="font-medium">฿{parseFloat(invoice.vatAmount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-primary-600">
                        <span>ยอดรวมสุทธิ</span>
                        <span>฿{parseFloat(invoice.totalAmount).toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex gap-2 pt-4">
                    <a href={invoice.xmlUrl} target="_blank" rel="noreferrer" className="flex-1 btn-secondary text-center flex items-center justify-center gap-2">
                        <FileText className="w-4 h-4" /> XML
                    </a>
                    <a href={invoice.pdfUrl} target="_blank" rel="noreferrer" className="flex-1 btn-secondary text-center flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" /> PDF
                    </a>
                </div>

                {invoice.status === 'GENERATED' && (
                    <button
                        onClick={() => sendMutation.mutate()}
                        disabled={sendMutation.isPending}
                        className="w-full btn-primary mt-2"
                    >
                        {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'ส่งข้อมูลกรมสรรพากร'}
                    </button>
                )}
            </div>
        </div>
    )
}

function GenerateModal({ onClose, onSuccess }: any) {
    const [step, setStep] = useState(1);
    const [searchSale, setSearchSale] = useState('');
    const [selectedSale, setSelectedSale] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});

    // Search sales for creating invoice
    const { data: salesData, isLoading: salesLoading } = useQuery({
        queryKey: ['sales-for-etax', searchSale],
        queryFn: async () => {
            // In real apps, we would filter sales that don't have invoices yet
            const res = await apiService.api.get('/sales', { params: { search: searchSale, limit: 5 } });
            return res.data;
        },
        enabled: step === 1
    });

    const generateMutation = useMutation({
        mutationFn: (data: any) => apiService.api.post('/etax/generate', data),
        onSuccess: () => {
            toast.success('ออกใบกำกับภาษีสำเร็จ');
            onSuccess();
        },
        onError: (err: any) => toast.error(err.response?.data?.error?.message || 'เกิดข้อผิดพลาด')
    });

    const handleSelectSale = (sale: any) => {
        setSelectedSale(sale);
        setFormData({
            saleId: sale.id,
            customerName: sale.customer?.name || 'เงินสด/ทั่วไป',
            customerTaxId: sale.customer?.taxId || '',
            customerBranch: '00000',
            customerAddress: sale.customer?.address || '',
            customerEmail: sale.customer?.email || '',
            customerPhone: sale.customer?.phone || '',
        });
        setStep(2);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        generateMutation.mutate(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-semibold">ออกใบกำกับภาษีใหม่</h2>
                    <button onClick={onClose}><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6">
                    {step === 1 ? (
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="ค้นหาตามเลขที่ใบเสร็จ..."
                                className="input"
                                value={searchSale}
                                onChange={(e) => setSearchSale(e.target.value)}
                                autoFocus
                            />

                            <div className="space-y-2">
                                {salesLoading && <Loader2 className="animate-spin mx-auto" />}
                                {salesData?.data?.map((sale: any) => (
                                    <div key={sale.id} onClick={() => handleSelectSale(sale)} className="p-4 border rounded-xl hover:bg-gray-50 cursor-pointer flex justify-between items-center">
                                        <div>
                                            <div className="font-medium">{sale.invoiceNumber}</div>
                                            <div className="text-sm text-gray-500">{format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm')}</div>
                                        </div>
                                        <div className="font-bold text-primary-600">฿{parseFloat(sale.totalAmount).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-xl mb-4">
                                <span className="text-gray-500 text-sm">อ้างอิงใบเสร็จ:</span>
                                <span className="font-bold ml-2">{selectedSale.invoiceNumber}</span>
                                <div className="text-primary-600 font-bold mt-1">ยอดรวม: ฿{parseFloat(selectedSale.totalAmount).toLocaleString()}</div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">ชื่อผู้เสียภาษี *</label>
                                    <input type="text" required className="input" value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">เลขประจำตัวผู้เสียภาษี (13 หลัก) *</label>
                                    <input type="text" required maxLength={13} className="input" value={formData.customerTaxId} onChange={e => setFormData({ ...formData, customerTaxId: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">สาขา (5 หลัก) *</label>
                                    <input type="text" required maxLength={5} className="input" value={formData.customerBranch} onChange={e => setFormData({ ...formData, customerBranch: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">เบอร์โทรศัพท์</label>
                                    <input type="text" className="input" value={formData.customerPhone} onChange={e => setFormData({ ...formData, customerPhone: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="label">ที่อยู่ *</label>
                                <textarea required className="input" rows={2} value={formData.customerAddress} onChange={e => setFormData({ ...formData, customerAddress: e.target.value })} />
                            </div>
                            <div>
                                <label className="label">อีเมลในการจัดส่ง PDF/XML</label>
                                <input type="email" className="input" value={formData.customerEmail} onChange={e => setFormData({ ...formData, customerEmail: e.target.value })} />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setStep(1)} className="flex-1 btn-secondary">ย้อนกลับ</button>
                                <button type="submit" disabled={generateMutation.isPending} className="flex-1 btn-primary">
                                    {generateMutation.isPending ? <Loader2 className="animate-spin mx-auto" /> : 'ยืนยันการออกเอกสาร'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
