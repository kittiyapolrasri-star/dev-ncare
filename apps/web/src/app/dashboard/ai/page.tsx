'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Brain,
    TrendingUp,
    ShoppingCart,
    AlertCircle,
    Calendar,
    Package,
    ArrowRight
} from 'lucide-react';
import { apiService } from '@/lib/api';
import { format, addDays } from 'date-fns';
import { th } from 'date-fns/locale';

export default function AIDashboardPage() {
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Brain className="w-8 h-8 text-purple-600" />
                        ระบบอัจฉริยะ (AI Intelligence)
                    </h1>
                    <p className="text-gray-500">วิเคราะห์ข้อมูลและแนะนำการตัดสินใจด้วย AI</p>
                </div>
            </div>

            {/* Forecast Section */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <h2 className="text-xl font-bold text-gray-900">พยากรณ์ยอดขาย (Sales Forecast)</h2>
                </div>
                <SalesForecast />
            </section>

            {/* Smart Reorder Section */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <ShoppingCart className="w-5 h-5 text-orange-600" />
                    <h2 className="text-xl font-bold text-gray-900">แนะนำสั่งซื้อสินค้า (Smart Reorder)</h2>
                </div>
                <SmartReorderList />
            </section>
        </div>
    );
}

function SalesForecast() {
    const { data: forecast, isLoading } = useQuery({
        queryKey: ['ai', 'forecast'],
        queryFn: async () => {
            const res = await apiService.getSalesForecast({ days: 7 });
            return res.data?.data;
        }
    });

    if (isLoading) return <div className="card h-64 skeleton" />;

    const trendColor = forecast?.trend === 'up' ? 'text-green-600' : forecast?.trend === 'down' ? 'text-red-600' : 'text-gray-600';
    const trendText = forecast?.trend === 'up' ? 'แนวโน้มขาขึ้น ↗' : forecast?.trend === 'down' ? 'แนวโน้มขาลง ↘' : 'ทรงตัว →';

    return (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="card md:col-span-2">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <p className="text-sm text-gray-500">ความแม่นยำของโมเดล</p>
                        <p className="text-2xl font-bold text-purple-600">{forecast?.confidence}%</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 text-right">สถานะตลาด</p>
                        <p className={`text-xl font-bold ${trendColor} text-right`}>{trendText}</p>
                    </div>
                </div>

                {/* Simple Bar Chart Visualization */}
                <div className="h-64 flex items-end justify-between gap-2 px-4">
                    {forecast?.forecast?.map((item: any, i: number) => {
                        // Normalize height (assuming max sales 50000 for simplicity scale)
                        const height = Math.min((item.amount / 50000) * 100, 100);
                        return (
                            <div key={i} className="flex flex-col items-center gap-2 w-full group relative">
                                <div
                                    className="w-full bg-blue-100 rounded-t-lg transition-all group-hover:bg-blue-200 relative"
                                    style={{ height: `${Math.max(height, 5)}%` }}
                                >
                                    <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10">
                                        ฿{item.amount.toLocaleString()}
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500 transform -rotate-45 origin-top-left mt-2">
                                    {format(new Date(item.date), 'dd/MM')}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="card bg-purple-50 border-purple-100">
                <h3 className="font-semibold text-purple-900 mb-4">สรุปคาดการณ์ 7 วันถัดไป</h3>
                <div className="space-y-4">
                    {forecast?.forecast?.slice(0, 5).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-center border-b border-purple-100 pb-2 last:border-0">
                            <span className="text-gray-600 text-sm">
                                {format(new Date(item.date), 'd MMM yyyy', { locale: th })}
                            </span>
                            <span className="font-bold text-purple-700">
                                ฿{item.amount.toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SmartReorderList() {
    const { data: suggestions, isLoading } = useQuery({
        queryKey: ['ai', 'reorder'],
        queryFn: async () => {
            const res = await apiService.getReorderSuggestions({});
            return res.data?.data;
        }
    });

    if (isLoading) return <div className="card h-64 skeleton" />;

    if (!suggestions || suggestions.length === 0) {
        return (
            <div className="card py-12 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>ยังไม่มีคำแนะนำการสั่งซื้อในขณะนี้</p>
                <p className="text-sm">สินค้าในคลังยังมีเพียงพอ</p>
            </div>
        )
    }

    return (
        <div className="card overflow-hidden">
            <table className="w-full">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">สินค้า</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">คงเหลือ</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">จุดสั่งซื้อ</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">อัตราใช้/วัน</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">แนะนำสั่งซื้อ</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">เหตุผล</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {suggestions.map((item: any) => (
                        <tr key={item.productId} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                                <p className="font-medium text-gray-900">{item.name}</p>
                                <p className="text-xs text-gray-500">{item.sku}</p>
                            </td>
                            <td className="px-6 py-4 text-center font-medium text-gray-900">{item.currentStock}</td>
                            <td className="px-6 py-4 text-center text-gray-500">{item.reorderPoint}</td>
                            <td className="px-6 py-4 text-center text-gray-500">{item.avgDailyUsage}</td>
                            <td className="px-6 py-4 text-right">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-green-100 text-green-800">
                                    {item.suggestedQuantity} {item.unit}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.reason === 'Out of Stock' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {item.reason}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
