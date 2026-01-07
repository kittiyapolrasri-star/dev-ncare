'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart3,
    LineChart,
    PieChart,
    Calendar,
    Download,
    TrendingUp,
    Package,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    Filter,
    Search
} from 'lucide-react';
import { apiService } from '@/lib/api';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { clsx } from 'clsx';

export default function ReportsPage() {
    const [tab, setTab] = useState<'sales' | 'inventory' | 'products' | 'tax' | 'pl'>('sales');
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">รายงานและสถิติ</h1>
                    <p className="text-gray-500">วิเคราะห์ข้อมูลยอดขาย สินค้าคงคลัง และประสิทธิภาพธุรกิจ</p>
                </div>

                <div className="flex gap-2">
                    <button className="btn-white">
                        <Calendar className="w-4 h-4 mr-2" />
                        {period === 'day' ? 'วันนี้' : period === 'week' ? 'สัปดาห์นี้' : period === 'month' ? 'เดือนนี้' : 'ปีนี้'}
                    </button>
                    <button className="btn-white">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <div className="border-b border-gray-200 overflow-x-auto">
                <nav className="flex space-x-8 min-w-max">
                    {[
                        { id: 'sales', label: 'ยอดขาย', icon: TrendingUp },
                        { id: 'pl', label: 'กำไร-ขาดทุน', icon: FileText },
                        { id: 'inventory', label: 'ความเคลื่อนไหวสินค้า', icon: Package },
                        { id: 'products', label: 'สินค้าขายดี', icon: BarChart3 },
                        { id: 'tax', label: 'ภาษี (VAT)', icon: FileText },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setTab(item.id as any)}
                            className={clsx(
                                'pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors',
                                tab === item.id
                                    ? 'border-primary-600 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            )}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {tab === 'sales' && <SalesReport period={period} />}
                {tab === 'pl' && <ProfitLossReport />}
                {tab === 'inventory' && <InventoryReport />}
                {tab === 'products' && <ProductPerformanceReport />}
                {tab === 'tax' && <TaxReport />}
            </div>
        </div>
    );
}

function ProfitLossReport() {
    const { data: pl, isLoading } = useQuery({
        queryKey: ['reports', 'pl'],
        queryFn: async () => {
            // Default to month in backend if not specified
            const res = await apiService.getProfitLoss({});
            return res.data?.data;
        }
    });

    if (isLoading) return <div className="card h-64 skeleton" />;

    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
                {/* Revenue */}
                <div className="card border-l-4 border-l-blue-500">
                    <p className="text-gray-500 text-sm mb-1">รายได้จากการขาย (สุทธิ)</p>
                    <p className="text-2xl font-bold text-gray-900">฿{pl?.revenue?.toLocaleString() || 0}</p>
                </div>

                {/* COGS */}
                <div className="card border-l-4 border-l-orange-500">
                    <p className="text-gray-500 text-sm mb-1">ต้นทุนสินค้า (COGS)</p>
                    <p className="text-2xl font-bold text-gray-900">฿{pl?.cogs?.toLocaleString() || 0}</p>
                </div>

                {/* Gross Profit */}
                <div className="card border-l-4 border-l-green-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm mb-1">กำไรขั้นต้น (Gross Profit)</p>
                            <p className="text-2xl font-bold text-green-700">฿{pl?.grossProfit?.toLocaleString() || 0}</p>
                        </div>
                        <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            {pl?.profitMargin}%
                        </div>
                    </div>
                </div>
            </div>

            <div className="card p-6 bg-blue-50 border-blue-100">
                <div className="flex gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg h-fit text-blue-600">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-blue-900">ประสิทธิภาพการทำกำไร</h4>
                        <p className="text-sm text-blue-700 mt-1">
                            อัตรากำไรขั้นต้นของคุณอยู่ที่ <span className="font-bold">{pl?.profitMargin}%</span> {Number(pl?.profitMargin) > 20 ? 'ซึ่งถือว่าอยู่ในเกณฑ์ดี' : 'ควรพิจารณาปรับโครงสร้างราคาหรือลดต้นทุน'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SalesReport({ period }: { period: string }) {
    const { data: sales, isLoading } = useQuery({
        queryKey: ['reports', 'sales', period],
        queryFn: async () => {
            const res = await apiService.getSalesReport({ groupBy: period });
            return res.data;
        }
    });

    if (isLoading) return <div className="card h-64 skeleton" />;

    const summary = sales?.data?.summary || {};

    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
                <SummaryCard title="ยอดขายรวม" value={`฿${summary.totalAmount?.toLocaleString() || 0}`} icon={TrendingUp} color="text-primary-600" bg="bg-primary-50" />
                <SummaryCard title="จำนวนบิล" value={summary.totalSales || 0} icon={FileText} color="text-blue-600" bg="bg-blue-50" />
                <SummaryCard title="ภาษีขาย (VAT)" value={`฿${summary.totalVat?.toLocaleString() || 0}`} icon={FileText} color="text-orange-600" bg="bg-orange-50" />
                <SummaryCard title="ส่วนลดรวม" value={`฿${summary.totalDiscount?.toLocaleString() || 0}`} icon={ArrowDownRight} color="text-danger-600" bg="bg-danger-50" />
            </div>

            {summary.byPaymentMethod && (
                <div className="card">
                    <h3 className="font-semibold mb-4">แยกตามช่องทางชำระเงิน</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-green-50">
                            <p className="text-sm text-gray-500 mb-1">เงินสด</p>
                            <p className="text-xl font-bold text-green-700">฿{summary.byPaymentMethod.cash?.toLocaleString() || 0}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-blue-50">
                            <p className="text-sm text-gray-500 mb-1">เงินโอน/QR</p>
                            <p className="text-xl font-bold text-blue-700">฿{summary.byPaymentMethod.transfer?.toLocaleString() || 0}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-purple-50">
                            <p className="text-sm text-gray-500 mb-1">เครดิต</p>
                            <p className="text-xl font-bold text-purple-700">฿{summary.byPaymentMethod.credit?.toLocaleString() || 0}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InventoryReport() {
    const [search, setSearch] = useState('');
    const { data: movements, isLoading } = useQuery({
        queryKey: ['reports', 'movements', search],
        queryFn: async () => {
            if (!search) return [];
            // In a real app we'd search first to get ID, simplified here assuming search is product ID or text search implemented on backend
            // For now, let's just assume we fetch recent movements if no search
            // But api requires productId. Let's make it optional in API or handle here.
            // Wait, previous step API required productId. Let's fix that next step if needed or just handle UI.
            return [];
        },
        enabled: false // Disable for now as we need robust search
    });

    return (
        <div className="card space-y-4">
            <div className="flex items-center gap-4 p-4 bg-yellow-50 text-yellow-800 rounded-lg">
                <Filter className="w-5 h-5 flex-shrink-0" />
                <p>กรุณาระบุรหัสสินค้า หรือ ชื่อสินค้า เพื่อดูความเคลื่อนไหว (Stock Card)</p>
            </div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="ค้นหาสินค้า..."
                    className="w-full pl-9 pr-4 py-2 border rounded-lg"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>
            {/* Table placeholder */}
            <div className="text-center py-12 text-gray-400">
                รายการความเคลื่อนไหวจะปรากฏที่นี่
            </div>
        </div>
    )
}

function ProductPerformanceReport() {
    const { data: products, isLoading } = useQuery({
        queryKey: ['reports', 'bestsellers'],
        queryFn: async () => {
            const res = await apiService.getProductPerformance({ limit: 10 });
            return res.data;
        }
    });

    if (isLoading) return <div className="card h-64 skeleton" />;

    return (
        <div className="card">
            <h3 className="font-semibold mb-4 text-lg">10 อันดับสินค้าขายดี</h3>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">อันดับ</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">สินค้า</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">หมวดหมู่</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">จำนวนที่ขาย</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">ยอดขายรวม</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {products?.data?.map((item: any, i: number) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-500 font-medium">#{i + 1}</td>
                                <td className="px-4 py-3">
                                    <p className="font-medium text-gray-900">{item.name}</p>
                                    <p className="text-xs text-gray-500">{item.sku}</p>
                                </td>
                                <td className="px-4 py-3 text-gray-600">{item.category}</td>
                                <td className="px-4 py-3 text-right font-medium">{item.quantitySold}</td>
                                <td className="px-4 py-3 text-right font-bold text-primary-600">฿{item.totalRevenue.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function TaxReport() {
    const { data: taxData, isLoading } = useQuery({
        queryKey: ['reports', 'tax'],
        queryFn: async () => {
            const res = await apiService.getTaxReport({});
            return res.data;
        }
    });

    if (isLoading) return <div className="card h-64 skeleton" />;

    const summary = taxData?.data?.summary || {};

    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
                <SummaryCard title="ยอดขายรวม (VAT)" value={`฿${summary.vatSalesAmount?.toLocaleString() || 0}`} icon={FileText} color="text-primary-600" bg="bg-primary-50" />
                <SummaryCard title="ภาษีขาย (Output VAT)" value={`฿${summary.outputVat?.toLocaleString() || 0}`} icon={TrendingUp} color="text-orange-600" bg="bg-orange-50" />
                <SummaryCard title="ยอดขายยกเว้นภาษี" value={`฿${summary.nonVatSalesAmount?.toLocaleString() || 0}`} icon={Package} color="text-gray-600" bg="bg-gray-50" />
            </div>

            <div className="card">
                <h3 className="font-semibold mb-4">รายการใบกำกับภาษี</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">วันที่</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">เลขที่ใบกำกับ</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">มูลค่าสินค้า</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">VAT</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">รวมทั้งสิ้น</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {taxData?.data?.vatInvoices?.map((inv: any) => (
                                <tr key={inv.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-600">{format(new Date(inv.date), 'dd/MM/yyyy')}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900">{inv.invoiceNumber}</td>
                                    <td className="px-4 py-3 text-right">{(inv.amount - inv.vat).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-orange-600">{inv.vat.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right font-bold">{inv.amount.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ title, value, icon: Icon, color, bg }: any) {
    return (
        <div className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg} ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm text-gray-500">{title}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}
