'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Users,
    Plus,
    Search,
    MapPin,
    DollarSign,
    Phone,
    Mail,
    MoreHorizontal,
    Edit,
    Trash2,
    TrendingUp,
    X,
    Loader2
} from 'lucide-react';
import { apiService } from '@/lib/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { useAuthorize } from '@/hooks';

export default function DistributorsPage() {
    const queryClient = useQueryClient();
    const { isAuthorized: canManage } = useAuthorize(['CEO', 'BRANCH_MANAGER']);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedDistributor, setSelectedDistributor] = useState<any>(null);

    // Fetch distributors
    const { data, isLoading } = useQuery({
        queryKey: ['distributors', search],
        queryFn: async () => {
            const res = await apiService.getDistributors({ search });
            return res.data;
        },
    });

    const distributors = data?.data || [];

    // Calculate totals
    const totalSales = distributors.reduce((sum: number, d: any) => {
        return sum + (d.performance?.totalSales || d._count?.sales || 0);
    }, 0);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">ตัวแทนจำหน่าย</h1>
                    <p className="text-gray-500">จัดการตัวแทนจำหน่ายและคอมมิชชั่น</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => { setSelectedDistributor(null); setShowModal(true); }}
                        className="btn-primary"
                    >
                        <Plus className="w-5 h-5" />
                        เพิ่มตัวแทน
                    </button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{distributors.length}</p>
                            <p className="text-sm text-gray-500">ตัวแทนทั้งหมด</p>
                        </div>
                    </div>
                </div>
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center text-success-600">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                ฿{totalSales.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500">ยอดขายรวม</p>
                        </div>
                    </div>
                </div>
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center text-warning-600">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                ฿{Math.round(totalSales * 0.05).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500">คอมมิชชั่นรวม (ประมาณ)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="card">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาตัวแทน..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-500"
                    />
                </div>
            </div>

            {/* Distributors Grid */}
            {isLoading ? (
                <div className="card p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                </div>
            ) : distributors.length === 0 ? (
                <div className="card p-12 text-center">
                    <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">ยังไม่มีตัวแทนจำหน่าย</p>
                    {canManage && (
                        <button onClick={() => setShowModal(true)} className="btn-primary mt-4">
                            <Plus className="w-5 h-5" />
                            เพิ่มตัวแทนใหม่
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {distributors.map((distributor: any) => (
                        <div key={distributor.id} className="card-hover">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                        {distributor.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{distributor.name}</h3>
                                        <p className="text-sm text-gray-500">{distributor.code}</p>
                                    </div>
                                </div>
                                <span className={clsx(
                                    'badge',
                                    distributor.isActive ? 'badge-success' : 'badge-gray'
                                )}>
                                    {distributor.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                                </span>
                            </div>

                            <div className="space-y-2 mb-4">
                                {distributor.territory && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        {distributor.territory}
                                    </div>
                                )}
                                {distributor.phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        {distributor.phone}
                                    </div>
                                )}
                                {distributor.email && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                        {distributor.email}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <div>
                                    <p className="text-xs text-gray-500">ค่าคอมมิชชั่น</p>
                                    <p className="font-bold text-primary-600">{distributor.commissionRate}%</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">ยอดขาย</p>
                                    <p className="font-bold text-gray-900">
                                        {distributor._count?.sales || 0} รายการ
                                    </p>
                                </div>
                            </div>

                            {canManage && (
                                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => { setSelectedDistributor(distributor); setShowModal(true); }}
                                        className="flex-1 btn-secondary text-sm py-2"
                                    >
                                        <Edit className="w-4 h-4" />
                                        แก้ไข
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <DistributorModal
                    distributor={selectedDistributor}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        queryClient.invalidateQueries({ queryKey: ['distributors'] });
                    }}
                />
            )}
        </div>
    );
}

function DistributorModal({
    distributor,
    onClose,
    onSuccess,
}: {
    distributor: any;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [formData, setFormData] = useState({
        code: distributor?.code || '',
        name: distributor?.name || '',
        contactPerson: distributor?.contactPerson || '',
        phone: distributor?.phone || '',
        email: distributor?.email || '',
        address: distributor?.address || '',
        territory: distributor?.territory || '',
        commissionRate: distributor?.commissionRate || 5,
        creditLimit: distributor?.creditLimit || 0,
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (distributor) {
                // Update
                await apiService.api.put(`/distributors/${distributor.id}`, formData);
                toast.success('อัพเดตตัวแทนสำเร็จ');
            } else {
                // Create
                await apiService.api.post('/distributors', formData);
                toast.success('สร้างตัวแทนสำเร็จ');
            }
            onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'เกิดข้อผิดพลาด');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg animate-slide-up">
                <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {distributor ? 'แก้ไขตัวแทน' : 'เพิ่มตัวแทนใหม่'}
                    </h2>
                    <button onClick={onClose} className="btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">รหัสตัวแทน *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">ค่าคอมมิชชั่น (%)</label>
                            <input
                                type="number"
                                step="0.5"
                                className="input"
                                value={formData.commissionRate}
                                onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">ชื่อบริษัท/ตัวแทน *</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">ผู้ติดต่อ</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.contactPerson}
                                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">โทรศัพท์</label>
                            <input
                                type="tel"
                                className="input"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">อีเมล</label>
                        <input
                            type="email"
                            className="input"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="label">พื้นที่ขาย</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="เช่น กรุงเทพฯ เขตเหนือ"
                            value={formData.territory}
                            onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="label">วงเงินสินเชื่อ</label>
                        <input
                            type="number"
                            className="input"
                            value={formData.creditLimit}
                            onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) })}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary">
                            ยกเลิก
                        </button>
                        <button type="submit" disabled={isLoading} className="flex-1 btn-primary">
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                distributor ? 'บันทึก' : 'สร้างตัวแทน'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
