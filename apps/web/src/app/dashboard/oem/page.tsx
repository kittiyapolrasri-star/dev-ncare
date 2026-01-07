'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Factory,
    Plus,
    Search,
    Package,
    Truck,
    Clock,
    CheckCircle,
    X,
    Loader2,
    Eye,
    ChevronRight,
    AlertCircle
} from 'lucide-react';
import { apiService } from '@/lib/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
    DRAFT: { label: 'ร่าง', color: 'badge-gray', icon: Clock },
    SENT: { label: 'ส่งแล้ว', color: 'badge-primary', icon: Truck },
    CONFIRMED: { label: 'ยืนยัน', color: 'badge-primary', icon: CheckCircle },
    IN_PRODUCTION: { label: 'กำลังผลิต', color: 'badge-warning', icon: Factory },
    SHIPPED: { label: 'จัดส่งแล้ว', color: 'badge-success', icon: Truck },
    RECEIVED: { label: 'รับแล้ว', color: 'badge-success', icon: Package },
    CANCELLED: { label: 'ยกเลิก', color: 'badge-danger', icon: X },
};

export default function OEMPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [showNewOrderModal, setShowNewOrderModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

    // Fetch OEM orders
    const { data, isLoading } = useQuery({
        queryKey: ['oem-orders', search, statusFilter],
        queryFn: async () => {
            const params: any = { limit: 50 };
            if (statusFilter) params.status = statusFilter;
            const res = await apiService.getOemOrders(params);
            return res.data;
        },
    });

    const orders = data?.data || [];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">สั่งผลิต OEM</h1>
                    <p className="text-gray-500">จัดการคำสั่งผลิตจากโรงงาน OEM</p>
                </div>
                <button
                    onClick={() => setShowNewOrderModal(true)}
                    className="btn-primary"
                >
                    <Plus className="w-5 h-5" />
                    สร้างคำสั่งผลิต
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
                <SummaryCard
                    title="รอดำเนินการ"
                    count={orders.filter((o: any) => ['DRAFT', 'SENT', 'CONFIRMED'].includes(o.status)).length}
                    icon={<Clock className="w-5 h-5" />}
                    color="warning"
                />
                <SummaryCard
                    title="กำลังผลิต"
                    count={orders.filter((o: any) => o.status === 'IN_PRODUCTION').length}
                    icon={<Factory className="w-5 h-5" />}
                    color="primary"
                />
                <SummaryCard
                    title="รอรับสินค้า"
                    count={orders.filter((o: any) => o.status === 'SHIPPED').length}
                    icon={<Truck className="w-5 h-5" />}
                    color="success"
                />
                <SummaryCard
                    title="รับแล้ว"
                    count={orders.filter((o: any) => o.status === 'RECEIVED').length}
                    icon={<CheckCircle className="w-5 h-5" />}
                    color="gray"
                />
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาเลขที่คำสั่ง..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto">
                        {['', 'DRAFT', 'IN_PRODUCTION', 'SHIPPED'].map((status) => (
                            <button
                                key={status || 'all'}
                                onClick={() => setStatusFilter(status)}
                                className={clsx(
                                    'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                                    statusFilter === status
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                )}
                            >
                                {status ? statusLabels[status]?.label : 'ทั้งหมด'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Orders List */}
            <div className="card p-0 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                    </div>
                ) : orders.length === 0 ? (
                    <div className="p-12 text-center">
                        <Factory className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">ยังไม่มีคำสั่งผลิต OEM</p>
                        <button
                            onClick={() => setShowNewOrderModal(true)}
                            className="btn-primary mt-4"
                        >
                            <Plus className="w-5 h-5" />
                            สร้างคำสั่งผลิตใหม่
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {orders.map((order: any) => {
                            const statusInfo = statusLabels[order.status] || statusLabels.DRAFT;
                            const StatusIcon = statusInfo.icon;

                            return (
                                <div
                                    key={order.id}
                                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedOrder(order)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                                                <Factory className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                                                    <span className={clsx('badge flex items-center gap-1', statusInfo.color)}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {statusInfo.label}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    {order.supplier?.name} • {order.items?.length || 0} รายการ
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-gray-900">
                                                ฿{parseFloat(order.totalAmount || 0).toLocaleString()}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(order.orderDate).toLocaleDateString('th-TH')}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-400 ml-4" />
                                    </div>

                                    {/* Items preview */}
                                    {order.items?.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {order.items.slice(0, 3).map((item: any) => (
                                                <span key={item.id} className="text-xs px-2 py-1 bg-gray-100 rounded-lg text-gray-600">
                                                    {item.product?.name} x{item.quantity}
                                                </span>
                                            ))}
                                            {order.items.length > 3 && (
                                                <span className="text-xs px-2 py-1 bg-gray-100 rounded-lg text-gray-500">
                                                    +{order.items.length - 3} รายการ
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Order Detail Modal */}
            {selectedOrder && (
                <OrderDetailModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onUpdate={() => {
                        queryClient.invalidateQueries({ queryKey: ['oem-orders'] });
                        setSelectedOrder(null);
                    }}
                />
            )}
        </div>
    );
}

function SummaryCard({
    title,
    count,
    icon,
    color,
}: {
    title: string;
    count: number;
    icon: React.ReactNode;
    color: 'primary' | 'success' | 'warning' | 'danger' | 'gray';
}) {
    const colors = {
        primary: 'bg-primary-100 text-primary-600',
        success: 'bg-success-50 text-success-600',
        warning: 'bg-warning-50 text-warning-600',
        danger: 'bg-danger-50 text-danger-600',
        gray: 'bg-gray-100 text-gray-600',
    };

    return (
        <div className="card-hover flex items-center gap-4">
            <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center', colors[color])}>
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-500">{title}</p>
            </div>
        </div>
    );
}

function OrderDetailModal({
    order,
    onClose,
    onUpdate
}: {
    order: any;
    onClose: () => void;
    onUpdate: () => void;
}) {
    const statusInfo = statusLabels[order.status] || statusLabels.DRAFT;
    const StatusIcon = statusInfo.icon;
    const canReceive = order.status === 'SHIPPED';

    const receiveMutation = useMutation({
        mutationFn: async () => {
            // Simplified - just update status for demo
            const res = await apiService.receiveOemOrder(order.id, {
                branchId: order.items?.[0]?.product?.organizationId || '',
                items: order.items?.map((item: any) => ({
                    productId: item.productId,
                    batchNumber: `OEM-${Date.now()}`,
                    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    receivedQty: item.quantity,
                    acceptedQty: item.quantity,
                    rejectedQty: 0,
                    isVat: true,
                }))
            });
            return res.data;
        },
        onSuccess: () => {
            toast.success('รับสินค้าสำเร็จ');
            onUpdate();
        },
        onError: () => {
            toast.error('เกิดข้อผิดพลาด');
        },
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{order.orderNumber}</h2>
                        <p className="text-sm text-gray-500">{order.supplier?.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={clsx('badge flex items-center gap-1', statusInfo.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                        </span>
                        <button onClick={onClose} className="btn-icon">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InfoItem label="วันที่สั่ง" value={new Date(order.orderDate).toLocaleDateString('th-TH')} />
                        <InfoItem label="วันที่คาดหวัง" value={order.expectedDate ? new Date(order.expectedDate).toLocaleDateString('th-TH') : '-'} />
                        <InfoItem label="จำนวนรายการ" value={order.items?.length || 0} />
                        <InfoItem label="ยอดรวม" value={`฿${parseFloat(order.totalAmount || 0).toLocaleString()}`} />
                    </div>

                    {/* Items Table */}
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-3">รายการสินค้า</h3>
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>สินค้า</th>
                                        <th className="text-right">จำนวน</th>
                                        <th className="text-right">ราคา/หน่วย</th>
                                        <th className="text-right">รวม</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items?.map((item: any) => (
                                        <tr key={item.id}>
                                            <td>
                                                <p className="font-medium text-gray-900">{item.product?.name}</p>
                                                <p className="text-xs text-gray-500">{item.product?.sku}</p>
                                            </td>
                                            <td className="text-right">{item.quantity}</td>
                                            <td className="text-right font-mono">฿{parseFloat(item.unitPrice || 0).toLocaleString()}</td>
                                            <td className="text-right font-mono font-medium">฿{parseFloat(item.totalPrice || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-sm text-gray-600">{order.notes}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <button onClick={onClose} className="flex-1 btn-secondary">
                            ปิด
                        </button>
                        {canReceive && (
                            <button
                                onClick={() => receiveMutation.mutate()}
                                disabled={receiveMutation.isPending}
                                className="flex-1 btn-primary"
                            >
                                {receiveMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        กำลังดำเนินการ...
                                    </>
                                ) : (
                                    <>
                                        <Package className="w-5 h-5" />
                                        รับสินค้าเข้าคลัง
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoItem({ label, value }: { label: string; value: string | number }) {
    return (
        <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="font-medium text-gray-900">{value}</p>
        </div>
    );
}
