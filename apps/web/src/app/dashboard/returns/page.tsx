'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    RotateCcw,
    Search,
    Eye,
    Check,
    X,
    Loader2,
    FileText,
    AlertTriangle
} from 'lucide-react';
import { apiService } from '@/lib/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function ReturnsPage() {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState<any>(null);

    // Fetch returns
    const { data, isLoading } = useQuery({
        queryKey: ['returns', status],
        queryFn: async () => {
            const params: any = {};
            if (status !== 'all') params.status = status;
            const res = await apiService.api.get('/returns', { params });
            return res.data;
        },
    });

    const returns = data?.data || [];

    // Approve mutation
    const approveMutation = useMutation({
        mutationFn: (id: string) => apiService.api.post(`/returns/${id}/approve`),
        onSuccess: () => {
            toast.success('อนุมัติการคืนสินค้าสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['returns'] });
            setShowModal(false);
        },
        onError: () => toast.error('เกิดข้อผิดพลาด'),
    });

    // Reject mutation
    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            apiService.api.post(`/returns/${id}/reject`, { reason }),
        onSuccess: () => {
            toast.success('ปฏิเสธการคืนสินค้าสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['returns'] });
            setShowModal(false);
        },
        onError: () => toast.error('เกิดข้อผิดพลาด'),
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">การคืนสินค้า</h1>
                    <p className="text-gray-500">จัดการรายการขอคืนสินค้าและคืนเงิน</p>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid md:grid-cols-4 gap-4">
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                            <RotateCcw className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{returns.length}</p>
                            <p className="text-sm text-gray-500">รายการทั้งหมด</p>
                        </div>
                    </div>
                </div>
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center text-warning-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {returns.filter((r: any) => r.status === 'PENDING').length}
                            </p>
                            <p className="text-sm text-gray-500">รอดำเนินการ</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex gap-4">
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="input w-full md:w-48"
                    >
                        <option value="all">ทุกสถานะ</option>
                        <option value="PENDING">รอดำเนินการ</option>
                        <option value="APPROVED">อนุมัติแล้ว</option>
                        <option value="REJECTED">ปฏิเสธ</option>
                        <option value="REFUNDED">คืนเงินแล้ว</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="card p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                </div>
            ) : returns.length === 0 ? (
                <div className="card p-12 text-center">
                    <RotateCcw className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">ไม่มีรายการคืนสินค้า</p>
                </div>
            ) : (
                <div className="card p-0 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">เลขที่คืน</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">อ้างอิงใบขาย</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">วันที่</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">ยอดเงินคืน</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">สถานะ</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {returns.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {item.returnNumber}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {item.sale?.invoiceNumber}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {format(new Date(item.returnDate), 'dd MMM yyyy HH:mm', { locale: th })}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                                        ฿{parseFloat(item.refundAmount).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={clsx('badge', {
                                            'badge-warning': item.status === 'PENDING',
                                            'badge-success': item.status === 'APPROVED',
                                            'badge-danger': item.status === 'REJECTED',
                                            'badge-primary': item.status === 'REFUNDED',
                                        })}>
                                            {item.status === 'PENDING' ? 'รอดำเนินการ' :
                                                item.status === 'APPROVED' ? 'อนุมัติแล้ว' :
                                                    item.status === 'REJECTED' ? 'ปฏิเสธ' : 'คืนเงินแล้ว'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => { setSelectedReturn(item); setShowModal(true); }}
                                            className="btn-secondary btn-sm"
                                        >
                                            <Eye className="w-4 h-4 mr-1" />
                                            ดูรายละเอียด
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detail Modal */}
            {showModal && selectedReturn && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">รายละเอียดการคืน {selectedReturn.returnNumber}</h2>
                                <p className="text-sm text-gray-500">อ้างอิง: {selectedReturn.sale?.invoiceNumber}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="btn-icon">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">เหตุผลที่คืน:</span>
                                    <span className="font-medium text-gray-900">{selectedReturn.reason || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">วันที่แจ้ง:</span>
                                    <span className="font-medium text-gray-900">
                                        {format(new Date(selectedReturn.returnDate), 'dd MMMM yyyy HH:mm', { locale: th })}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3">รายการสินค้า</h3>
                                <div className="border rounded-xl overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-sm text-gray-600">สินค้า</th>
                                                <th className="px-4 py-2 text-right text-sm text-gray-600">จำนวน</th>
                                                <th className="px-4 py-2 text-right text-sm text-gray-600">ราคา/หน่วย</th>
                                                <th className="px-4 py-2 text-right text-sm text-gray-600">รวม</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {selectedReturn.items?.map((item: any) => (
                                                <tr key={item.id}>
                                                    <td className="px-4 py-2">
                                                        <p className="font-medium text-gray-900">{item.product?.name}</p>
                                                        <p className="text-xs text-gray-500">{item.product?.sku}</p>
                                                    </td>
                                                    <td className="px-4 py-2 text-right">{item.quantity}</td>
                                                    <td className="px-4 py-2 text-right">฿{parseFloat(item.unitPrice).toLocaleString()}</td>
                                                    <td className="px-4 py-2 text-right font-medium text-gray-900">
                                                        ฿{parseFloat(item.totalPrice).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 border-t">
                                            <tr>
                                                <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-900">รวมเงินคืนสุทธิ</td>
                                                <td className="px-4 py-3 text-right font-bold text-primary-600 text-lg">
                                                    ฿{parseFloat(selectedReturn.refundAmount).toLocaleString()}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {selectedReturn.status === 'PENDING' && (
                                <div className="flex gap-3 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => {
                                            const reason = prompt('ระบุเหตุผลที่ปฏิเสธ (ถ้ามี):');
                                            if (reason !== null) {
                                                rejectMutation.mutate({ id: selectedReturn.id, reason });
                                            }
                                        }}
                                        className="flex-1 btn-danger"
                                        disabled={approveMutation.isPending || rejectMutation.isPending}
                                    >
                                        ปฎิเสธ
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm('ยืนยันการรับคืนสินค้า? สินค้าจะถูกเพิ่มกลับเข้าสต็อก')) {
                                                approveMutation.mutate(selectedReturn.id);
                                            }
                                        }}
                                        className="flex-1 btn-success"
                                        disabled={approveMutation.isPending || rejectMutation.isPending}
                                    >
                                        {approveMutation.isPending ? (
                                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                        ) : (
                                            <>
                                                <Check className="w-5 h-5 mr-2" />
                                                อนุมัติการคืน
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
