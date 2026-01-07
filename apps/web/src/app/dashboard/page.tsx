'use client';

import { useQuery } from '@tanstack/react-query';
import {
    Package,
    TrendingUp,
    TrendingDown,
    DollarSign,
    AlertTriangle,
    Clock,
    ArrowUpRight,
    ShoppingCart,
    Box
} from 'lucide-react';
import { apiService } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export default function DashboardPage() {
    const { user } = useAuthStore();
    const isCeo = user?.role === 'CEO';

    // Fetch dashboard data
    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['dashboard'],
        queryFn: async () => {
            const response = await apiService.getDashboard();
            return response.data.data;
        },
    });

    // Fetch CEO dashboard if applicable
    const { data: ceoData } = useQuery({
        queryKey: ['ceo-dashboard'],
        queryFn: async () => {
            const response = await apiService.getCeoDashboard();
            return response.data.data;
        },
        enabled: isCeo,
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="card h-32 skeleton" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500">ยินดีต้อนรับ, {user?.firstName}! นี่คือภาพรวมธุรกิจวันนี้</p>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="ยอดขายวันนี้"
                    value={formatCurrency(dashboardData?.sales?.today?.amount || 0)}
                    subValue={`${dashboardData?.sales?.today?.count || 0} รายการ`}
                    icon={<DollarSign className="w-5 h-5" />}
                    trend={dashboardData?.sales?.growthPercent || 0}
                    color="primary"
                />
                <StatCard
                    title="ยอดขายเดือนนี้"
                    value={formatCurrency(dashboardData?.sales?.thisMonth?.amount || 0)}
                    subValue={`${dashboardData?.sales?.thisMonth?.count || 0} รายการ`}
                    icon={<TrendingUp className="w-5 h-5" />}
                    trend={dashboardData?.sales?.growthPercent || 0}
                    color="success"
                />
                <StatCard
                    title="สินค้าในคลัง"
                    value={formatNumber(dashboardData?.inventory?.totalQuantity || 0)}
                    subValue={`${dashboardData?.inventory?.totalItems || 0} รายการ`}
                    icon={<Package className="w-5 h-5" />}
                    color="warning"
                />
                <StatCard
                    title="แจ้งเตือน"
                    value={
                        (dashboardData?.alerts?.lowStock || 0) +
                        (dashboardData?.alerts?.expiringSoon || 0)
                    }
                    subValue="ต้องดำเนินการ"
                    icon={<AlertTriangle className="w-5 h-5" />}
                    color="danger"
                    isAlert
                />
            </div>

            {/* Content Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Sales */}
                <div className="lg:col-span-2 card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">การขายล่าสุด</h2>
                        <a href="/dashboard/pos" className="text-primary-600 text-sm hover:underline flex items-center gap-1">
                            ดูทั้งหมด <ArrowUpRight className="w-4 h-4" />
                        </a>
                    </div>
                    <div className="space-y-3">
                        {dashboardData?.recentActivity?.sales?.length > 0 ? (
                            dashboardData.recentActivity.sales.map((sale: any) => (
                                <div key={sale.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                                            <ShoppingCart className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{sale.invoiceNumber}</p>
                                            <p className="text-sm text-gray-500">{sale.user} • {sale.branch}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-gray-900">{formatCurrency(sale.amount)}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(sale.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                <p>ยังไม่มีรายการขายวันนี้</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Alerts & Notifications */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">แจ้งเตือน</h2>
                    <div className="space-y-3">
                        {dashboardData?.alerts?.lowStock > 0 && (
                            <AlertItem
                                type="warning"
                                title="สินค้าใกล้หมด"
                                description={`${dashboardData.alerts.lowStock} รายการต้องสั่งซื้อ`}
                                href="/dashboard/inventory?lowStock=true"
                            />
                        )}
                        {dashboardData?.alerts?.expiringSoon > 0 && (
                            <AlertItem
                                type="danger"
                                title="ยาใกล้หมดอายุ"
                                description={`${dashboardData.alerts.expiringSoon} รายการภายใน 30 วัน`}
                                href="/dashboard/inventory?expiringSoon=30"
                            />
                        )}
                        {dashboardData?.alerts?.pendingOem > 0 && (
                            <AlertItem
                                type="primary"
                                title="คำสั่ง OEM รอดำเนินการ"
                                description={`${dashboardData.alerts.pendingOem} คำสั่งซื้อ`}
                                href="/dashboard/oem"
                            />
                        )}
                        {!dashboardData?.alerts?.lowStock &&
                            !dashboardData?.alerts?.expiringSoon &&
                            !dashboardData?.alerts?.pendingOem && (
                                <div className="text-center py-8 text-gray-500">
                                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                    <p>ไม่มีแจ้งเตือน</p>
                                </div>
                            )}
                    </div>
                </div>
            </div>

            {/* CEO Section - Branch Performance */}
            {isCeo && ceoData && (
                <div className="card">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">ผลประกอบการรายสาขา</h2>
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>สาขา</th>
                                    <th>รหัส</th>
                                    <th className="text-right">จำนวนขาย</th>
                                    <th className="text-right">ยอดขาย</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ceoData.branchPerformance?.map((branch: any) => (
                                    <tr key={branch.id}>
                                        <td className="font-medium">{branch.name}</td>
                                        <td><span className="badge-gray">{branch.code}</span></td>
                                        <td className="text-right">{branch.salesCount}</td>
                                        <td className="text-right font-medium">{formatCurrency(branch.totalSales)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// Components
function StatCard({
    title,
    value,
    subValue,
    icon,
    trend,
    color,
    isAlert,
}: {
    title: string;
    value: string | number;
    subValue: string;
    icon: React.ReactNode;
    trend?: number;
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
            <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgColors[color]}`}>
                    {icon}
                </div>
                {trend !== undefined && trend !== 0 && (
                    <span className={`flex items-center gap-1 text-sm ${trend > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                        {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {Math.abs(trend)}%
                    </span>
                )}
                {isAlert && Number(value) > 0 && (
                    <span className="w-3 h-3 bg-danger-500 rounded-full animate-pulse" />
                )}
            </div>
            <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500">{title}</p>
                <p className="text-xs text-gray-400 mt-1">{subValue}</p>
            </div>
        </div>
    );
}

function AlertItem({
    type,
    title,
    description,
    href,
}: {
    type: 'primary' | 'warning' | 'danger';
    title: string;
    description: string;
    href: string;
}) {
    const colors = {
        primary: 'border-primary-200 bg-primary-50 text-primary-700',
        warning: 'border-warning-200 bg-warning-50 text-warning-700',
        danger: 'border-danger-200 bg-danger-50 text-danger-700',
    };

    return (
        <a
            href={href}
            className={`block p-3 rounded-xl border ${colors[type]} hover:opacity-80 transition-opacity`}
        >
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs opacity-80">{description}</p>
        </a>
    );
}

// Helpers
function formatCurrency(value: number) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
    }).format(value);
}

function formatNumber(value: number) {
    return new Intl.NumberFormat('th-TH').format(value);
}
