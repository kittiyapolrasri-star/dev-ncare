'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowRightLeft,
    Search,
    Eye,
    Plus,
    X,
    Loader2,
    CheckCircle,
    Truck,
    ArrowRight
} from 'lucide-react';
import { apiService } from '@/lib/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function StockTransfersPage() {
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<'incoming' | 'outgoing'>('incoming');
    const [showModal, setShowModal] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState<any>(null);

    // Fetch Transfers
    const { data, isLoading } = useQuery({
        queryKey: ['stock-transfers', tab],
        queryFn: async () => {
            const res = await apiService.getStockTransfers({ type: tab });
            return res.data;
        },
    });

    const transfers = data?.data || [];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">โอนย้ายสินค้า</h1>
                    <p className="text-gray-500">จัดการการรับ-ส่งสินค้าระหว่างสาขา</p>
                </div>
                <button
                    onClick={() => { setSelectedTransfer(null); setShowModal(true); }}
                    className="btn-primary"
                >
                    <Plus className="w-5 h-5" />
                    สร้างคำขอโอนย้าย
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setTab('incoming')}
                    className={clsx('px-6 py-3 font-medium text-sm transition-colors border-b-2', {
                        'border-primary-600 text-primary-600': tab === 'incoming',
                        'border-transparent text-gray-500 hover:text-gray-700': tab !== 'incoming'
                    })}
                >
                    รายการขอโอนเข้า (Incoming)
                </button>
                <button
                    onClick={() => setTab('outgoing')}
                    className={clsx('px-6 py-3 font-medium text-sm transition-colors border-b-2', {
                        'border-primary-600 text-primary-600': tab === 'outgoing',
                        'border-transparent text-gray-500 hover:text-gray-700': tab !== 'outgoing'
                    })}
                >
                    รายการส่งโอนออก (Outgoing)
                </button>
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">เลขที่เอกสาร</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">วันที่</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                                {tab === 'incoming' ? 'ต้นทาง (ขอจาก)' : 'ปลายทาง (ส่งไป)'}
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">สถานะ</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            <tr><td colSpan={5} className="text-center p-8"><Loader2 className="animate-spin mx-auto" /></td></tr>
                        ) : transfers.length === 0 ? (
                            <tr><td colSpan={5} className="text-center p-8 text-gray-500">ไม่พบรายการ</td></tr>
                        ) : transfers.map((item: any) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">{item.transferNo}</td>
                                <td className="px-6 py-4 text-gray-600">
                                    {format(new Date(item.requestDate), 'dd/MM/yyyy', { locale: th })}
                                </td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    {tab === 'incoming' ? (
                                        <>
                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs">{item.sourceBranch?.name}</span>
                                            <ArrowRight className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium text-primary-600">สาขาเรา</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="font-medium text-primary-600">สาขาเรา</span>
                                            <ArrowRight className="w-4 h-4 text-gray-400" />
                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs">{item.targetBranch?.name}</span>
                                        </>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={clsx('badge', {
                                        'badge-warning': item.status === 'PENDING',
                                        'badge-info': item.status === 'SHIPPED',
                                        'badge-success': item.status === 'COMPLETED',
                                        'badge-danger': item.status === 'CANCELLED' || item.status === 'REJECTED',
                                    })}>
                                        {item.status === 'PENDING' ? 'รออนุมัติ' :
                                            item.status === 'SHIPPED' ? 'อยู่ระหว่างส่ง' :
                                                item.status === 'COMPLETED' ? 'สำเร็จ' : 'ยกเลิก'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => { setSelectedTransfer(item); setShowModal(true); }}
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

            {showModal && (
                <TransferModal
                    transfer={selectedTransfer}
                    currentTab={tab}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
                    }}
                />
            )}
        </div>
    );
}

function TransferModal({ transfer, currentTab, onClose, onSuccess }: any) {
    // Logic for Create Mode
    const [items, setItems] = useState<any[]>(transfer?.items || [{ productId: '', quantity: 1 }]);
    const [formData, setFormData] = useState({
        sourceBranchId: transfer?.sourceBranchId || '',
        notes: transfer?.notes || '',
    });

    // Mock data
    const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: () => apiService.api.get('/branches').then(r => r.data.data) });
    const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => apiService.api.get('/products').then(r => r.data.data) });

    const createMutation = useMutation({
        mutationFn: (data: any) => apiService.createStockTransfer(data),
        onSuccess: () => { toast.success('บันทึกคำขอโอนย้ายสำเร็จ'); onSuccess(); },
        onError: (e: any) => toast.error(e.response?.data?.error?.message || 'เกิดข้อผิดพลาด')
    });

    const shipMutation = useMutation({
        mutationFn: () => apiService.shipStockTransfer(transfer.id),
        onSuccess: () => { toast.success('อนุมัติและตัดสต็อกเรียบร้อย'); onSuccess(); },
        onError: (e: any) => toast.error(e.response?.data?.error?.message || 'เกิดข้อผิดพลาด')
    });

    const receiveMutation = useMutation({
        mutationFn: () => apiService.receiveStockTransfer(transfer.id),
        onSuccess: () => { toast.success('รับสินค้าเข้าคลังเรียบร้อย'); onSuccess(); },
        onError: (e: any) => toast.error(e.response?.data?.error?.message || 'เกิดข้อผิดพลาด')
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({
            ...formData,
            items: items.map(i => ({ productId: i.productId, quantity: Number(i.quantity) }))
        });
    };

    const isReadOnly = !!transfer;
    const isIncoming = currentTab === 'incoming';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold">{transfer ? `ใบโอนย้าย: ${transfer.transferNo}` : 'สร้างคำขอโอนย้าย'}</h2>
                    <button onClick={onClose}><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-6">
                    {!isReadOnly ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="label">ขอโอนจากสาขา</label>
                                <select
                                    required
                                    className="input"
                                    value={formData.sourceBranchId}
                                    onChange={e => setFormData({ ...formData, sourceBranchId: e.target.value })}
                                >
                                    <option value="">เลือกสาขาต้นทาง</option>
                                    {branches?.map((b: any) => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">รายการสินค้า</label>
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <select
                                            className="input flex-1"
                                            value={item.productId}
                                            onChange={e => {
                                                const newItems = [...items];
                                                newItems[idx].productId = e.target.value;
                                                setItems(newItems);
                                            }}
                                            required
                                        >
                                            <option value="">เลือกสินค้า</option>
                                            {products?.map((p: any) => (
                                                <option key={p.id} value={p.id}>{p.commonName}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number" min="1" className="input w-24 text-right"
                                            value={item.quantity}
                                            onChange={e => {
                                                const newItems = [...items];
                                                newItems[idx].quantity = e.target.value;
                                                setItems(newItems);
                                            }}
                                            required
                                        />
                                        {items.length > 1 && (
                                            <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-500">
                                                <X className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={() => setItems([...items, { productId: '', quantity: 1 }])} className="text-primary-600 text-sm font-medium">+ เพิ่มรายการ</button>
                            </div>
                            <div>
                                <label className="label">หมายเหตุ</label>
                                <textarea className="input" rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                            </div>
                            <div className="pt-4 flex gap-2">
                                <button type="button" onClick={onClose} className="flex-1 btn-secondary">ยกเลิก</button>
                                <button type="submit" disabled={createMutation.isPending} className="flex-1 btn-primary">
                                    {createMutation.isPending ? <Loader2 className="animate-spin mx-auto" /> : 'บันทึกคำขอ'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">สถานะ</span>
                                    <span className="font-medium">{transfer.status}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">สาขาต้นทาง</span>
                                    <span className="font-medium">{transfer.sourceBranch?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">สาขาปลายทาง</span>
                                    <span className="font-medium">{transfer.targetBranch?.name}</span>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-medium mb-2">รายการสินค้า</h3>
                                <div className="border rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left">สินค้า</th>
                                                <th className="px-4 py-2 text-right">จำนวน</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {transfer.items?.map((item: any) => (
                                                <tr key={item.id}>
                                                    <td className="px-4 py-2">{item.product?.commonName}</td>
                                                    <td className="px-4 py-2 text-right">{item.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-2 border-t">
                                <button onClick={onClose} className="flex-1 btn-secondary">ปิด</button>

                                {/* Action Buttons */}
                                {!isIncoming && transfer.status === 'PENDING' && (
                                    <button
                                        onClick={() => shipMutation.mutate()}
                                        disabled={shipMutation.isPending}
                                        className="flex-1 btn-primary"
                                    >
                                        {shipMutation.isPending ? <Loader2 className="animate-spin mx-auto" /> : 'อนุมัติและส่งของ'}
                                    </button>
                                )}

                                {isIncoming && transfer.status === 'SHIPPED' && (
                                    <button
                                        onClick={() => receiveMutation.mutate()}
                                        disabled={receiveMutation.isPending}
                                        className="flex-1 btn-success"
                                    >
                                        {receiveMutation.isPending ? <Loader2 className="animate-spin mx-auto" /> : 'รับสินค้าเข้าคลัง'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
