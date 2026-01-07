'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    FileText,
    Download,
    Calendar,
    TrendingUp,
    DollarSign,
    Package,
    Users,
    Filter,
    Loader2,
    BarChart3,
    PieChart
} from 'lucide-react';
import { apiService } from '@/lib/api';
import { clsx } from 'clsx';

type ReportType = 'sales' | 'inventory' | 'tax' | 'products' | 'distributors';

export default function ReportsPage() {
    const [reportType, setReportType] = useState<ReportType>('sales');
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
    });
    const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

    // Fetch report data
    const { data, isLoading } = useQuery({
        queryKey: ['report', reportType, dateRange, groupBy],
        queryFn: async () => {
            switch (reportType) {
                case 'sales':
                    return (await apiService.getSalesReport({ ...dateRange, groupBy })).data.data;
                case 'inventory':
                    return (await apiService.getInventoryReport({})).data.data;
                case 'tax':
                    return (await apiService.getTaxReport(dateRange)).data.data;
                case 'products':
                    return (await apiService.getProducts({ limit: 10 })).data.data;
                case 'distributors':
                    return (await apiService.getDistributors({})).data.data;
                default:
                    return null;
            }
        },
    });

    const reports = [
        { key: 'sales', icon: TrendingUp, label: 'รายงานยอดขาย', color: 'primary' },
        { key: 'inventory', icon: Package, label: 'รายงานคลังสินค้า', color: 'success' },
        { key: 'tax', icon: DollarSign, label: 'รายงานภาษี VAT', color: 'warning' },
        { key: 'products', icon: BarChart3, label: 'สินค้าขายดี', color: 'danger' },
        { key: 'distributors', icon: Users, label: 'ผลงานตัวแทน', color: 'primary' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">รายงาน</h1>
                    <p className="text-gray-500">ดูรายงานและวิเคราะห์ข้อมูลธุรกิจ</p>
                </div>
                <button className="btn-primary">
                    <Download className="w-5 h-5" />
                    Export PDF
                </button>
            </div>

            {/* Report Type Selector */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {reports.map((report) => (
                    <button
                        key={report.key}
                        onClick={() => setReportType(report.key as ReportType)}
                        className={clsx(
                            'card-hover flex flex-col items-center gap-2 py-4 transition-all',
                            reportType === report.key && 'ring-2 ring-primary-500 bg-primary-50'
                        )}
                    >
                        <report.icon className={clsx(
                            'w-6 h-6',
                            reportType === report.key ? 'text-primary-600' : 'text-gray-400'
                        )} />
                        <span className={clsx(
                            'text-sm font-medium',
                            reportType === report.key ? 'text-primary-700' : 'text-gray-600'
                        )}>
                            {report.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Date Range */}
            {['sales', 'tax'].includes(reportType) && (
                <div className="card">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-gray-600">ช่วงเวลา:</span>
                        </div>
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                        />
                        <span className="text-gray-400">ถึง</span>
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                        />

                        {reportType === 'sales' && (
                            <div className="flex bg-gray-100 rounded-lg p-1 ml-auto">
                                {(['day', 'week', 'month'] as const).map((g) => (
                                    <button
                                        key={g}
                                        onClick={() => setGroupBy(g)}
                                        className={clsx(
                                            'px-3 py-1.5 rounded-md text-sm transition-all',
                                            groupBy === g ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                                        )}
                                    >
                                        {g === 'day' ? 'รายวัน' : g === 'week' ? 'รายสัปดาห์' : 'รายเดือน'}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Report Content */}
            {isLoading ? (
                <div className="card p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                    <p className="text-gray-500 mt-2">กำลังโหลดรายงาน...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {reportType === 'sales' && data && <SalesReport data={data} />}
                    {reportType === 'inventory' && data && <InventoryReport data={data} />}
                    {reportType === 'tax' && data && <TaxReport data={data} />}
                    {reportType === 'products' && data && <ProductsReport data={data} />}
                    {reportType === 'distributors' && data && <DistributorsReport data={data} />}
                </div>
            )}
        </div>
    );
}

// Sales Report
function SalesReport({ data }: { data: any }) {
    const { summary, byPeriod } = data;

    return (
        <>
            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
                <StatCard label="ยอดขายรวม" value={`฿${summary?.totalAmount?.toLocaleString() || 0}`} />
                <StatCard label="จำนวนรายการ" value={summary?.totalSales || 0} />
                <StatCard label="VAT" value={`฿${summary?.totalVat?.toLocaleString() || 0}`} />
                <StatCard label="ส่วนลด" value={`฿${summary?.totalDiscount?.toLocaleString() || 0}`} />
            </div>

            {/* Chart Placeholder */}
            <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">กราฟยอดขาย</h3>
                <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-16 h-16 text-gray-300" />
                </div>
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden">
                <table className="table">
                    <thead>
                        <tr>
                            <th>วันที่</th>
                            <th className="text-right">จำนวนรายการ</th>
                            <th className="text-right">ยอดขาย</th>
                            <th className="text-right">VAT</th>
                            <th className="text-right">ส่วนลด</th>
                        </tr>
                    </thead>
                    <tbody>
                        {byPeriod?.map((row: any) => (
                            <tr key={row.date}>
                                <td className="font-medium">{row.date}</td>
                                <td className="text-right">{row.count}</td>
                                <td className="text-right font-mono">฿{row.total?.toLocaleString()}</td>
                                <td className="text-right text-gray-500">฿{row.vat?.toLocaleString()}</td>
                                <td className="text-right text-gray-500">฿{row.discount?.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

// Inventory Report
function InventoryReport({ data }: { data: any }) {
    const { summary, alerts } = data;

    return (
        <>
            <div className="grid md:grid-cols-3 gap-4">
                <StatCard label="มูลค่าคลัง VAT" value={`฿${summary?.vatTotalValue?.toLocaleString() || 0}`} sub={`${summary?.vatItems || 0} รายการ`} />
                <StatCard label="มูลค่าคลัง Non-VAT" value={`฿${summary?.nonVatTotalValue?.toLocaleString() || 0}`} sub={`${summary?.nonVatItems || 0} รายการ`} />
                <StatCard label="มูลค่ารวม" value={`฿${summary?.totalValue?.toLocaleString() || 0}`} />
            </div>

            {/* Alerts */}
            {(alerts?.lowStock?.length > 0 || alerts?.expiringSoon?.length > 0) && (
                <div className="grid md:grid-cols-2 gap-4">
                    {alerts?.lowStock?.length > 0 && (
                        <div className="card border-warning-200 bg-warning-50">
                            <h3 className="font-semibold text-warning-900 mb-3">สินค้าใกล้หมด ({alerts.lowStock.length})</h3>
                            <div className="space-y-2">
                                {alerts.lowStock.slice(0, 5).map((item: any) => (
                                    <div key={item.id} className="flex justify-between text-sm">
                                        <span className="text-warning-800">{item.name}</span>
                                        <span className="font-medium text-warning-900">{item.currentStock} ชิ้น</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {alerts?.expiringSoon?.length > 0 && (
                        <div className="card border-danger-200 bg-danger-50">
                            <h3 className="font-semibold text-danger-900 mb-3">ใกล้หมดอายุ ({alerts.expiringSoon.length})</h3>
                            <div className="space-y-2">
                                {alerts.expiringSoon.slice(0, 5).map((item: any) => (
                                    <div key={item.batchId} className="flex justify-between text-sm">
                                        <span className="text-danger-800">{item.productName}</span>
                                        <span className="font-medium text-danger-900">
                                            {new Date(item.expiryDate).toLocaleDateString('th-TH')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

// Tax Report
function TaxReport({ data }: { data: any }) {
    const { summary, vatInvoices } = data;

    return (
        <>
            <div className="grid md:grid-cols-4 gap-4">
                <StatCard label="ยอดขาย VAT" value={`฿${summary?.vatSalesAmount?.toLocaleString() || 0}`} />
                <StatCard label="ภาษีขาย" value={`฿${summary?.outputVat?.toLocaleString() || 0}`} />
                <StatCard label="ยอดขาย Non-VAT" value={`฿${summary?.nonVatSalesAmount?.toLocaleString() || 0}`} />
                <StatCard label="ใบกำกับภาษี" value={summary?.vatInvoiceCount || 0} />
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">รายการใบกำกับภาษี</h3>
                </div>
                <table className="table">
                    <thead>
                        <tr>
                            <th>เลขที่</th>
                            <th>วันที่</th>
                            <th>สาขา</th>
                            <th className="text-right">ยอดเงิน</th>
                            <th className="text-right">VAT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vatInvoices?.map((inv: any) => (
                            <tr key={inv.id}>
                                <td className="font-mono text-sm">{inv.invoiceNumber}</td>
                                <td>{new Date(inv.date).toLocaleDateString('th-TH')}</td>
                                <td>{inv.branch}</td>
                                <td className="text-right font-mono">฿{inv.amount?.toLocaleString()}</td>
                                <td className="text-right font-mono text-gray-500">฿{inv.vat?.toLocaleString()}</td>
                            </tr>
                        ))}
                        {!vatInvoices?.length && (
                            <tr>
                                <td colSpan={5} className="text-center text-gray-500 py-8">
                                    ไม่มีใบกำกับภาษีในช่วงเวลานี้
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}

// Products Report
function ProductsReport({ data }: { data: any }) {
    return (
        <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">สินค้าขายดี</h3>
            </div>
            <table className="table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>สินค้า</th>
                        <th>หมวดหมู่</th>
                        <th className="text-right">จำนวนขาย</th>
                        <th className="text-right">รายได้</th>
                    </tr>
                </thead>
                <tbody>
                    {data?.slice(0, 10).map((product: any, idx: number) => (
                        <tr key={product.id}>
                            <td className="font-medium text-gray-400">{idx + 1}</td>
                            <td>
                                <div>
                                    <p className="font-medium text-gray-900">{product.name}</p>
                                    <p className="text-xs text-gray-500">{product.sku}</p>
                                </div>
                            </td>
                            <td><span className="badge-gray">{product.category?.name || '-'}</span></td>
                            <td className="text-right">{product.quantitySold?.toLocaleString() || '-'}</td>
                            <td className="text-right font-mono">฿{product.totalRevenue?.toLocaleString() || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Distributors Report
function DistributorsReport({ data }: { data: any }) {
    return (
        <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">ผลงานตัวแทนจำหน่าย</h3>
            </div>
            <table className="table">
                <thead>
                    <tr>
                        <th>ตัวแทน</th>
                        <th>พื้นที่</th>
                        <th className="text-right">จำนวนขาย</th>
                        <th className="text-right">ยอดขาย</th>
                        <th className="text-right">ค่าคอมมิชชั่น</th>
                    </tr>
                </thead>
                <tbody>
                    {data?.map((dist: any) => (
                        <tr key={dist.id}>
                            <td className="font-medium text-gray-900">{dist.name}</td>
                            <td className="text-gray-500">{dist.territory || '-'}</td>
                            <td className="text-right">{dist._count?.sales || 0}</td>
                            <td className="text-right font-mono">฿{(dist.totalSales || 0).toLocaleString()}</td>
                            <td className="text-right font-mono text-success-600">
                                ฿{((dist.totalSales || 0) * (parseFloat(dist.commissionRate) / 100)).toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Stat Card Component
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <div className="card-hover">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
    );
}
