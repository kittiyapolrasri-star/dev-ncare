'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Truck,
    Search,
    Eye,
    Plus,
    X,
    Loader2,
    Calendar,
    Package,
    CheckCircle,
    FileText
} from 'lucide-react';
import { apiService } from '@/lib/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function PurchasesPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState<any>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['purchases', search, status],
        queryFn: async () => {
            const params: any = { search };
            if (status !== 'all') params.status = status;
            const res = await apiService.getPurchases(params);
            return res.data;
        },
    });

    const purchases = data?.data || [];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">สั่งซื้อสินค้า</h1>
                    <p className="text-gray-500">จัดการใบสั่งซื้อ (PO) และรับสินค้าเข้าคลัง</p>
                </div>
                <button
                    onClick={() => { setSelectedPurchase(null); setShowModal(true); }}
                    className="btn-primary"
                >
                    <Plus className="w-5 h-5" />
                    สร้างใบสั่งซื้อ
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid md:grid-cols-4 gap-4">
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{purchases.length}</p>
                            <p className="text-sm text-gray-500">ใบสั่งซื้อทั้งหมด</p>
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
                                {purchases.filter((p: any) => p.status === 'PENDING' || p.status === 'ORDERED').length}
                            </p>
                            <p className="text-sm text-gray-500">รอรับของ</p>
                        </div>
                    </div>
                </div>
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center text-success-600">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {purchases.filter((p: any) => p.status === 'RECEIVED').length}
                            </p>
                            <p className="text-sm text-gray-500">รับของแล้ว</p>
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
                            placeholder="ค้นหาเลขที่ PO..."
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
                        <option value="PENDING">รอดำเนินการ</option>
                        <option value="ORDERED">สั่งของแล้ว</option>
                        <option value="RECEIVED">รับของแล้ว</option>
                        <option value="CANCELLED">ยกเลิก</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">เลขที่ PO</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">วันที่</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">ผู้จำหน่าย</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">ยอดรวม</th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">สถานะ</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            <tr><td colSpan={6} className="text-center p-8"><Loader2 className="animate-spin mx-auto" /></td></tr>
                        ) : purchases.map((po: any) => (
                            <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">{po.poNumber}</td>
                                <td className="px-6 py-4 text-gray-600">
                                    {format(new Date(po.createdAt), 'dd MMM yy', { locale: th })}
                                </td>
                                <td className="px-6 py-4 font-medium">{po.supplier?.name}</td>
                                <td className="px-6 py-4 text-right font-medium">
                                    ฿{parseFloat(po.totalAmount).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={clsx('badge', {
                                        'badge-warning': po.status === 'PENDING' || po.status === 'ORDERED',
                                        'badge-success': po.status === 'RECEIVED',
                                        'badge-danger': po.status === 'CANCELLED',
                                    })}>
                                        {po.status === 'PENDING' ? 'รอดำเนินการ' :
                                            po.status === 'ORDERED' ? 'สั่งของแล้ว' :
                                                po.status === 'RECEIVED' ? 'รับของแล้ว' : 'ยกเลิก'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => { setSelectedPurchase(po); setShowModal(true); }}
                                        className="btn-secondary btn-sm"
                                    >
                                        <Eye className="w-4 h-4 mr-1" />
                                        รายละเอียด
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <PurchaseModal
                    purchase={selectedPurchase}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        queryClient.invalidateQueries({ queryKey: ['purchases'] });
                    }}
                />
            )}
        </div>
    );
}

function PurchaseModal({ purchase, onClose, onSuccess }: any) {
    const [items, setItems] = useState<any[]>(purchase?.items || [{ productId: '', quantity: 1, unitPrice: 0 }]);
    const [formData, setFormData] = useState({
        supplierId: purchase?.supplierId || '',
        branchId: purchase?.branchId || '',
        expectedDate: purchase?.expectedDate ? new Date(purchase.expectedDate).toISOString().slice(0, 10) : '',
        notes: purchase?.notes || '',
    });

    // Mock data fetching for dropdowns
    const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => apiService.api.get('/suppliers').then(r => r.data.data) });
    const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => apiService.api.get('/products').then(r => r.data.data) });
    const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: () => apiService.api.get('/branches').then(r => r.data.data) });

    const createMutation = useMutation({
        mutationFn: (data: any) => apiService.createPurchase(data),
        onSuccess: () => { toast.success('สร้างใบสั่งซื้อสำเร็จ'); onSuccess(); },
        onError: (e: any) => toast.error(e.response?.data?.error?.message || 'เกิดข้อผิดพลาด')
    });

    const receiveMutation = useMutation({
        mutationFn: (data: any) => apiService.receivePurchase(purchase.id, data),
        onSuccess: () => { toast.success('รับสินค้าเข้าคลังสำเร็จ'); onSuccess(); },
        onError: (e: any) => toast.error(e.response?.data?.error?.message || 'เกิดข้อผิดพลาด')
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (purchase) return;
        createMutation.mutate({
            ...formData,
            items: items.map(i => ({
                ...i,
                quantity: Number(i.quantity),
                unitPrice: Number(i.unitPrice),
            }))
        });
    };

    const handleReceive = () => {
        // For simplicity, receiving exactly what was ordered
        const receiveItems = items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            costPrice: item.unitPrice,
            price: 0, // Should be set to retail price ideally
            expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString() // Default 1 year expiry
        }));
        receiveMutation.mutate(receiveItems);
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        // Auto fill price if product selected
        if (field === 'productId') {
            const product = products?.find((p: any) => p.id === value);
            if (product) {
                newItems[index].unitPrice = product.costPrice || 0;
            }
        }
        setItems(newItems);
    };

    const isReadOnly = !!purchase;
    // Calculate total
    const total = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-slide-up">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold">{purchase ? `ใบสั่งซื้อ: ${purchase.poNumber}` : 'สร้างใบสั่งซื้อใหม่'}</h2>
                    <button onClick={onClose}><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">สาขาที่รับของ *</label>
                            <select
                                required
                                disabled={isReadOnly}
                                className="input"
                                value={formData.branchId}
                                onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                            >
                                <option value="">เลือกสาขา</option>
                                {branches?.map((b: any) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">ผู้จำหน่าย *</label>
                            <select
                                required
                                disabled={isReadOnly}
                                className="input"
                                value={formData.supplierId}
                                onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                            >
                                <option value="">เลือกผู้จำหน่าย</option>
                                {suppliers?.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">วันที่คาดว่าจะได้รับ</label>
                            <input
                                type="date"
                                disabled={isReadOnly}
                                className="input"
                                value={formData.expectedDate}
                                onChange={e => setFormData({ ...formData, expectedDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="label mb-0">รายการสินค้า</label>
                            {!isReadOnly && <button type="button" onClick={() => setItems([...items, { productId: '', quantity: 1, unitPrice: 0 }])} className="text-primary-600 font-medium">+ เพิ่มรายการ</button>}
                        </div>

                        <div className="border rounded-xl overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-2 text-left">สินค้า</th>
                                        <th className="px-4 py-2 text-right w-24">จำนวน</th>
                                        <th className="px-4 py-2 text-right w-32">ราคา/หน่วย</th>
                                        <th className="px-4 py-2 text-right w-32">รวม</th>
                                        {!isReadOnly && <th className="px-4 py-2 w-10"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="p-2">
                                                {isReadOnly ? (
                                                    <div className="font-medium">{item.product?.commonName}</div>
                                                ) : (
                                                    <select
                                                        required
                                                        className="input"
                                                        value={item.productId}
                                                        onChange={e => updateItem(idx, 'productId', e.target.value)}
                                                    >
                                                        <option value="">เลือกสินค้า</option>
                                                        {products?.map((p: any) => (
                                                            <option key={p.id} value={p.id}>{p.commonName}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number" min="1" required disabled={isReadOnly}
                                                    className="input text-right"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number" min="0" step="0.01" required disabled={isReadOnly}
                                                    className="input text-right"
                                                    value={item.unitPrice}
                                                    onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-2 text-right font-medium">
                                                ฿{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                                            </td>
                                            {!isReadOnly && (
                                                <td className="p-2 text-center">
                                                    {items.length > 1 && (
                                                        <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 font-bold">
                                    <tr>
                                        <td colSpan={3} className="px-4 py-3 text-right">รวมทั้งหมด</td>
                                        <td className="px-4 py-3 text-right text-primary-600">฿{total.toLocaleString()}</td>
                                        {!isReadOnly && <td></td>}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary">ปิด</button>
                        {!isReadOnly && (
                            <button type="submit" disabled={createMutation.isPending} className="flex-1 btn-primary">
                                {createMutation.isPending ? <Loader2 className="animate-spin mx-auto" /> : 'ยืนยันการสั่งซื้อ'}
                            </button>
                        )}
                        {isReadOnly && purchase.status !== 'RECEIVED' && purchase.status !== 'CANCELLED' && (
                            <button
                                type="button"
                                onClick={handleReceive}
                                disabled={receiveMutation.isPending}
                                className="flex-1 btn-success"
                            >
                                {receiveMutation.isPending ? <Loader2 className="animate-spin mx-auto" /> : 'รับสินค้าเข้าคลัง'}
                            </button>
                        )}
                    </div>

                </form>
            </div>
        </div>
    );
}
