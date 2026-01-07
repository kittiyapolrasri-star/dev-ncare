'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Truck,
    Plus,
    Search,
    Building2,
    Phone,
    Mail,
    Globe,
    Edit,
    Trash2,
    Factory,
    Package,
    X,
    Loader2
} from 'lucide-react';
import { apiService } from '@/lib/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

export default function SuppliersPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
    const [typeFilter, setTypeFilter] = useState<'all' | 'GENERAL' | 'OEM'>('all');

    // Fetch suppliers
    const { data, isLoading } = useQuery({
        queryKey: ['suppliers', search, typeFilter],
        queryFn: async () => {
            const params: any = { search };
            if (typeFilter !== 'all') params.type = typeFilter;
            const res = await apiService.api.get('/suppliers', { params });
            return res.data;
        },
    });

    const suppliers = data?.data || [];

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiService.api.delete(`/suppliers/${id}`),
        onSuccess: () => {
            toast.success('ลบผู้จำหน่ายสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        },
        onError: () => toast.error('เกิดข้อผิดพลาด'),
    });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">ผู้จำหน่าย</h1>
                    <p className="text-gray-500">จัดการรายชื่อผู้จำหน่ายและ OEM</p>
                </div>
                <button
                    onClick={() => { setSelectedSupplier(null); setShowModal(true); }}
                    className="btn-primary"
                >
                    <Plus className="w-5 h-5" />
                    เพิ่มผู้จำหน่าย
                </button>
            </div>

            {/* Summary */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                            <Truck className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{suppliers.length}</p>
                            <p className="text-sm text-gray-500">ผู้จำหน่ายทั้งหมด</p>
                        </div>
                    </div>
                </div>
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center text-success-600">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {suppliers.filter((s: any) => s.type === 'GENERAL').length}
                            </p>
                            <p className="text-sm text-gray-500">ทั่วไป</p>
                        </div>
                    </div>
                </div>
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center text-warning-600">
                            <Factory className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {suppliers.filter((s: any) => s.type === 'OEM').length}
                            </p>
                            <p className="text-sm text-gray-500">OEM</p>
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
                            placeholder="ค้นหาผู้จำหน่าย..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div className="flex bg-gray-100 rounded-xl p-1">
                        {[
                            { key: 'all', label: 'ทั้งหมด' },
                            { key: 'GENERAL', label: 'ทั่วไป' },
                            { key: 'OEM', label: 'OEM' },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setTypeFilter(tab.key as any)}
                                className={clsx(
                                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                                    typeFilter === tab.key
                                        ? 'bg-white text-primary-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Suppliers Grid */}
            {isLoading ? (
                <div className="card p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                </div>
            ) : suppliers.length === 0 ? (
                <div className="card p-12 text-center">
                    <Truck className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">ยังไม่มีผู้จำหน่าย</p>
                    <button onClick={() => setShowModal(true)} className="btn-primary mt-4">
                        <Plus className="w-5 h-5" />
                        เพิ่มผู้จำหน่ายใหม่
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suppliers.map((supplier: any) => (
                        <div key={supplier.id} className="card-hover">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={clsx(
                                        'w-12 h-12 rounded-xl flex items-center justify-center',
                                        supplier.type === 'OEM'
                                            ? 'bg-warning-100 text-warning-600'
                                            : 'bg-primary-100 text-primary-600'
                                    )}>
                                        {supplier.type === 'OEM' ? <Factory className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                                        <span className={clsx(
                                            'badge text-xs',
                                            supplier.type === 'OEM' ? 'badge-warning' : 'badge-gray'
                                        )}>
                                            {supplier.type === 'OEM' ? 'OEM' : 'ทั่วไป'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                {supplier.contactPerson && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Building2 className="w-4 h-4 text-gray-400" />
                                        {supplier.contactPerson}
                                    </div>
                                )}
                                {supplier.phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        {supplier.phone}
                                    </div>
                                )}
                                {supplier.email && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                        {supplier.email}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-3 border-t border-gray-100">
                                <button
                                    onClick={() => { setSelectedSupplier(supplier); setShowModal(true); }}
                                    className="flex-1 btn-secondary py-2 text-sm"
                                >
                                    <Edit className="w-4 h-4" />
                                    แก้ไข
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm(`ลบผู้จำหน่าย "${supplier.name}"?`)) {
                                            deleteMutation.mutate(supplier.id);
                                        }
                                    }}
                                    className="px-3 py-2 text-danger-600 hover:bg-danger-50 rounded-xl transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <SupplierModal
                    supplier={selectedSupplier}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        queryClient.invalidateQueries({ queryKey: ['suppliers'] });
                    }}
                />
            )}
        </div>
    );
}

function SupplierModal({
    supplier,
    onClose,
    onSuccess,
}: {
    supplier: any;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [formData, setFormData] = useState({
        code: supplier?.code || '',
        name: supplier?.name || '',
        type: supplier?.type || 'GENERAL',
        contactPerson: supplier?.contactPerson || '',
        phone: supplier?.phone || '',
        email: supplier?.email || '',
        address: supplier?.address || '',
        taxId: supplier?.taxId || '',
        paymentTerms: supplier?.paymentTerms || 30,
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (supplier) {
                await apiService.api.put(`/suppliers/${supplier.id}`, formData);
                toast.success('อัพเดตผู้จำหน่ายสำเร็จ');
            } else {
                await apiService.api.post('/suppliers', formData);
                toast.success('เพิ่มผู้จำหน่ายสำเร็จ');
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
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {supplier ? 'แก้ไขผู้จำหน่าย' : 'เพิ่มผู้จำหน่ายใหม่'}
                    </h2>
                    <button onClick={onClose} className="btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">รหัสผู้จำหน่าย *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">ประเภท</label>
                            <select
                                className="input"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="GENERAL">ทั่วไป</option>
                                <option value="OEM">OEM</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="label">ชื่อบริษัท *</label>
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

                    <div className="grid grid-cols-2 gap-4">
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
                            <label className="label">เลขประจำตัวผู้เสียภาษี</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.taxId}
                                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">ที่อยู่</label>
                        <textarea
                            className="input min-h-[80px]"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="label">เงื่อนไขการชำระ (วัน)</label>
                        <input
                            type="number"
                            className="input"
                            value={formData.paymentTerms}
                            onChange={(e) => setFormData({ ...formData, paymentTerms: parseInt(e.target.value) })}
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
                                supplier ? 'บันทึก' : 'เพิ่มผู้จำหน่าย'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
