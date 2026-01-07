'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Package,
    Search,
    Filter,
    ArrowUpDown,
    AlertTriangle,
    Clock,
    Download,
    Plus,
    ArrowRightLeft,
    Loader2,
    ChevronDown
} from 'lucide-react';
import { apiService } from '@/lib/api';
import { clsx } from 'clsx';

import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth'; // Fix missing import if needed or generic

export default function InventoryPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const initialLowStock = searchParams.get('lowStock') === 'true';
    const initialExpiring = searchParams.get('expiringSoon');

    const [search, setSearch] = useState('');
    const [inventoryType, setInventoryType] = useState<'all' | 'vat' | 'non-vat'>('all');
    const [lowStock, setLowStock] = useState(initialLowStock);
    const [expiringSoon, setExpiringSoon] = useState(initialExpiring ? Number(initialExpiring) : undefined);
    const [showReceiveModal, setShowReceiveModal] = useState(false);

    // Update URL when filters change (optional but good for sharing)
    // For now, simpler to just use state, but we init from URL.

    // Fetch inventory data
    const { data, isLoading } = useQuery({
        queryKey: ['inventory', inventoryType, search, lowStock, expiringSoon],
        queryFn: async () => {
            const res = await apiService.getInventory({
                type: inventoryType === 'all' ? undefined : inventoryType,
                search,
                lowStock: lowStock ? 'true' : undefined,
                expiringSoon: expiringSoon
            });
            return res.data.data;
        },
    });

    const vatInventory = data?.vatInventory || [];
    const nonVatInventory = data?.nonVatInventory || [];
    const expiringItemsList = data?.expiringItems || []; // Items expiring in 30 days regardless of filter?
    // Actually api returns 'expiringItems' (summary list) AND filtered inventory lists.
    // If 'expiringSoon' param is sent, the main lists (vatInventory/nonVat) should ideally be filtered or we rely on 'expiringItems' array?
    // Looking at backend:
    // If 'lowStock' is true, baseWhere adds quantity check.
    // If 'expiringSoon' is passed, it returns 'expiringItems' array (ProductBatch).
    // BUT does it filter vatInventory/nonVatInventory?
    // Backend: 'expiringSoon' ONLY populates 'expiringItems' array side-car. It does NOT filter the main inventory lists.
    // AND 'lowStock' param DOES filter the main inventory lists.
    // So for Low Stock, it works.
    // For Expiring Soon, we might need adjustments if we want the MAIN TABLE to show only expiring items.
    // Current backend logic:
    // if (expiringSoon) -> fetches separate 'expiringItems' list.
    // It doesn't filter the main list.
    // So if user clicks "Expiring Soon", the table shows everything, but there is a summary section.
    // User might expect the TABLE to filter.

    // Let's rely on the backend behavior for now:
    // Low Stock -> Filters table.
    // Expiring Soon -> Shows the 'Expiring Items Alert' section. 
    // We already have code to show that section.

    const summary = data?.summary || {};

    const allInventory = [
        ...vatInventory.map((i: any) => ({ ...i, type: 'vat' })),
        ...nonVatInventory.map((i: any) => ({ ...i, type: 'non-vat' }))
    ];

    const displayItems = inventoryType === 'vat'
        ? vatInventory.map((i: any) => ({ ...i, type: 'vat' }))
        : inventoryType === 'non-vat'
            ? nonVatInventory.map((i: any) => ({ ...i, type: 'non-vat' }))
            : allInventory;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">คลังสินค้า</h1>
                    <p className="text-gray-500">จัดการสต็อกสินค้า VAT และ Non-VAT</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary">
                        <ArrowRightLeft className="w-5 h-5" />
                        โอนสินค้า
                    </button>
                    <button
                        onClick={() => setShowReceiveModal(true)}
                        className="btn-primary"
                    >
                        <Plus className="w-5 h-5" />
                        รับสินค้าเข้า
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
                <SummaryCard
                    title="คลัง VAT"
                    value={summary.vatTotalQuantity || 0}
                    subValue={`${summary.vatItems || 0} รายการ`}
                    extra={`มูลค่า ฿${(summary.vatTotalValue || 0).toLocaleString()}`}
                    color="primary"
                />
                <SummaryCard
                    title="คลัง Non-VAT"
                    value={summary.nonVatTotalQuantity || 0}
                    subValue={`${summary.nonVatItems || 0} รายการ`}
                    extra={`มูลค่า ฿${(summary.nonVatTotalValue || 0).toLocaleString()}`}
                    color="success"
                />
                <SummaryCard
                    title="มูลค่ารวม"
                    value={`฿${((summary.vatTotalValue || 0) + (summary.nonVatTotalValue || 0)).toLocaleString()}`}
                    subValue="ทั้งหมดในคลัง"
                    color="warning"
                />
                <SummaryCard
                    title="แจ้งเตือน"
                    value={expiringItemsList.length}
                    subValue="ใกล้หมดอายุ 30 วัน"
                    color="danger"
                    isAlert={expiringItemsList.length > 0}
                />
            </div>

            {/* Expiring Items Alert */}
            {expiringItemsList.length > 0 && (
                <div className="card bg-danger-50 border-danger-200">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="font-medium text-danger-900">ยาใกล้หมดอายุ</h3>
                            <p className="text-sm text-danger-700 mt-1">
                                {expiringItemsList.length} รายการจะหมดอายุภายใน 30 วัน
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {expiringItemsList.slice(0, 5).map((item: any) => (
                                    <span key={item.batchId} className="px-2 py-1 bg-white rounded-lg text-xs text-danger-700">
                                        {item.productName} - หมด {new Date(item.expiryDate).toLocaleDateString('th-TH')}
                                    </span>
                                ))}
                                {expiringItemsList.length > 5 && (
                                    <span className="px-2 py-1 bg-white rounded-lg text-xs text-danger-600">
                                        +{expiringItemsList.length - 5} รายการ
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="card">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาสินค้า..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    {/* Type Toggle */}
                    <div className="flex bg-gray-100 rounded-xl p-1">
                        {[
                            { key: 'all', label: 'ทั้งหมด' },
                            { key: 'vat', label: 'VAT' },
                            { key: 'non-vat', label: 'Non-VAT' },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setInventoryType(tab.key as any)}
                                className={clsx(
                                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                                    inventoryType === tab.key
                                        ? 'bg-white text-primary-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <button className="btn-secondary">
                        <Download className="w-5 h-5" />
                        Export
                    </button>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="card p-0 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                    </div>
                ) : displayItems.length === 0 ? (
                    <div className="p-12 text-center">
                        <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">ยังไม่มีสินค้าในคลัง</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>สินค้า</th>
                                    <th>สาขา</th>
                                    <th>Batch/Lot</th>
                                    <th className="text-center">ประเภท</th>
                                    <th className="text-right">คงเหลือ</th>
                                    <th className="text-right">ราคาทุน</th>
                                    <th>หมดอายุ</th>
                                    <th>ตำแหน่ง</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayItems.map((item: any) => {
                                    const isExpiringSoon = item.batch?.expiryDate &&
                                        new Date(item.batch.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                                    return (
                                        <tr key={item.id}>
                                            <td>
                                                <div>
                                                    <p className="font-medium text-gray-900">{item.product?.name}</p>
                                                    <p className="text-xs text-gray-500">{item.product?.sku}</p>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge-gray">{item.branch?.name}</span>
                                            </td>
                                            <td>
                                                <div>
                                                    <p className="text-sm font-mono">{item.batch?.batchNumber}</p>
                                                    {item.batch?.lotNumber && (
                                                        <p className="text-xs text-gray-400">Lot: {item.batch.lotNumber}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                {item.type === 'vat' ? (
                                                    <span className="badge-primary">VAT</span>
                                                ) : (
                                                    <span className="badge-gray">Non-VAT</span>
                                                )}
                                            </td>
                                            <td className="text-right">
                                                <span className={clsx(
                                                    'font-medium',
                                                    item.quantity <= (item.product?.reorderPoint || 10) && 'text-danger-600'
                                                )}>
                                                    {item.quantity.toLocaleString()}
                                                </span>
                                                <span className="text-gray-400 text-sm ml-1">{item.product?.unit}</span>
                                            </td>
                                            <td className="text-right font-mono">
                                                ฿{parseFloat(item.costWithVat || item.costPrice || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td>
                                                {item.batch?.expiryDate && (
                                                    <div className={clsx(
                                                        'flex items-center gap-1',
                                                        isExpiringSoon && 'text-danger-600'
                                                    )}>
                                                        {isExpiringSoon && <Clock className="w-4 h-4" />}
                                                        <span className="text-sm">
                                                            {new Date(item.batch.expiryDate).toLocaleDateString('th-TH')}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <span className="text-sm text-gray-500">{item.location || '-'}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function SummaryCard({
    title,
    value,
    subValue,
    extra,
    color,
    isAlert,
}: {
    title: string;
    value: string | number;
    subValue: string;
    extra?: string;
    color: 'primary' | 'success' | 'warning' | 'danger';
    isAlert?: boolean;
}) {
    const bgColors = {
        primary: 'bg-primary-100 text-primary-600',
        success: 'bg-success-50 text-success-600',
        warning: 'bg-warning-50 text-warning-600',
        danger: 'bg-danger-50 text-danger-600',
    };

    return (
        <div className="card-hover">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">{title}</span>
                {isAlert && <span className="w-2 h-2 bg-danger-500 rounded-full animate-pulse" />}
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{subValue}</p>
            {extra && <p className="text-xs text-gray-400 mt-1">{extra}</p>}
        </div>
    );
}
