'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Users as UsersIcon,
    Plus,
    Search,
    Edit,
    Trash2,
    X,
    Loader2,
    Phone,
    Mail,
    Building2,
    CreditCard,
    ShoppingBag
} from 'lucide-react';
import { apiService } from '@/lib/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const customerTypes: Record<string, { label: string; color: string }> = {
    RETAIL: { label: 'ปลีก', color: 'badge-gray' },
    WHOLESALE: { label: 'ส่ง', color: 'badge-primary' },
    HOSPITAL: { label: 'โรงพยาบาล', color: 'badge-success' },
    CLINIC: { label: 'คลินิก', color: 'badge-warning' },
    PHARMACY: { label: 'ร้านยา', color: 'badge-primary' },
};

export default function CustomersPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

    // Fetch customers
    const { data, isLoading } = useQuery({
        queryKey: ['customers', search, typeFilter],
        queryFn: async () => {
            const params: any = { search };
            if (typeFilter !== 'all') params.type = typeFilter;
            const res = await apiService.getCustomers(params);
            return res.data;
        },
    });

    const customers = data?.data || [];

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiService.api.delete(`/customers/${id}`),
        onSuccess: () => {
            toast.success('ลบลูกค้าสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['customers'] });
        },
        onError: () => toast.error('เกิดข้อผิดพลาด'),
    });

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">ลูกค้า</h1>
                    <p className="text-gray-500">จัดการข้อมูลลูกค้าทั้งหมด</p>
                </div>
                <button
                    onClick={() => { setSelectedCustomer(null); setShowModal(true); }}
                    className="btn-primary"
                >
                    <Plus className="w-5 h-5" />
                    เพิ่มลูกค้า
                </button>
            </div>

            {/* Summary */}
            <div className="grid md:grid-cols-4 gap-4">
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                            <UsersIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
                            <p className="text-sm text-gray-500">ลูกค้าทั้งหมด</p>
                        </div>
                    </div>
                </div>
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center text-success-600">
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {customers.filter((c: any) => c.customerType === 'WHOLESALE').length}
                            </p>
                            <p className="text-sm text-gray-500">ลูกค้าส่ง</p>
                        </div>
                    </div>
                </div>
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center text-warning-600">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {customers.filter((c: any) => c.customerType === 'HOSPITAL' || c.customerType === 'CLINIC').length}
                            </p>
                            <p className="text-sm text-gray-500">รพ./คลินิก</p>
                        </div>
                    </div>
                </div>
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-danger-50 rounded-xl flex items-center justify-center text-danger-600">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {customers.filter((c: any) => c.creditLimit).length}
                            </p>
                            <p className="text-sm text-gray-500">มีวงเงินเครดิต</p>
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
                            placeholder="ค้นหาลูกค้า..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">ทุกประเภท</option>
                        <option value="RETAIL">ปลีก</option>
                        <option value="WHOLESALE">ส่ง</option>
                        <option value="HOSPITAL">โรงพยาบาล</option>
                        <option value="CLINIC">คลินิก</option>
                        <option value="PHARMACY">ร้านยา</option>
                    </select>
                </div>
            </div>

            {/* Customers Grid */}
            {isLoading ? (
                <div className="card p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                </div>
            ) : customers.length === 0 ? (
                <div className="card p-12 text-center">
                    <UsersIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">ยังไม่มีลูกค้า</p>
                    <button onClick={() => setShowModal(true)} className="btn-primary mt-4">
                        <Plus className="w-5 h-5" />
                        เพิ่มลูกค้าใหม่
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customers.map((customer: any) => (
                        <div key={customer.id} className="card-hover">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                        {customer.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                                        <span className={`badge text-xs ${customerTypes[customer.customerType]?.color || 'badge-gray'}`}>
                                            {customerTypes[customer.customerType]?.label || customer.customerType}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                {customer.phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        {customer.phone}
                                    </div>
                                )}
                                {customer.email && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                        {customer.email}
                                    </div>
                                )}
                                {customer.creditLimit && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <CreditCard className="w-4 h-4 text-gray-400" />
                                        วงเงิน: {formatCurrency(customer.creditLimit)}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-3 border-t border-gray-100">
                                <button
                                    onClick={() => { setSelectedCustomer(customer); setShowModal(true); }}
                                    className="flex-1 btn-secondary py-2 text-sm"
                                >
                                    <Edit className="w-4 h-4" />
                                    แก้ไข
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm(`ลบลูกค้า "${customer.name}"?`)) {
                                            deleteMutation.mutate(customer.id);
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
                <CustomerModal
                    customer={selectedCustomer}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        queryClient.invalidateQueries({ queryKey: ['customers'] });
                    }}
                />
            )}
        </div>
    );
}

function CustomerModal({
    customer,
    onClose,
    onSuccess,
}: {
    customer: any;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [formData, setFormData] = useState({
        code: customer?.code || '',
        name: customer?.name || '',
        phone: customer?.phone || '',
        email: customer?.email || '',
        address: customer?.address || '',
        taxId: customer?.taxId || '',
        customerType: customer?.customerType || 'RETAIL',
        creditLimit: customer?.creditLimit || '',
        isActive: customer?.isActive ?? true,
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const payload = {
                ...formData,
                creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : null,
            };

            if (customer) {
                await apiService.updateCustomer(customer.id, payload);
                toast.success('อัพเดตลูกค้าสำเร็จ');
            } else {
                await apiService.createCustomer(payload);
                toast.success('เพิ่มลูกค้าสำเร็จ');
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
                        {customer ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้าใหม่'}
                    </h2>
                    <button onClick={onClose} className="btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">รหัสลูกค้า</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="ถ้าไม่ระบุ จะสร้างอัตโนมัติ"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">ประเภท *</label>
                            <select
                                className="input"
                                value={formData.customerType}
                                onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                            >
                                <option value="RETAIL">ปลีก</option>
                                <option value="WHOLESALE">ส่ง</option>
                                <option value="HOSPITAL">โรงพยาบาล</option>
                                <option value="CLINIC">คลินิก</option>
                                <option value="PHARMACY">ร้านยา</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="label">ชื่อลูกค้า/บริษัท *</label>
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
                            <label className="label">โทรศัพท์</label>
                            <input
                                type="tel"
                                className="input"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
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
                    </div>

                    <div>
                        <label className="label">ที่อยู่</label>
                        <textarea
                            className="input min-h-[80px]"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">เลขประจำตัวผู้เสียภาษี</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.taxId}
                                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">วงเงินเครดิต (บาท)</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.creditLimit}
                                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                                placeholder="0 = ไม่มีเครดิต"
                            />
                        </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 text-primary-600"
                        />
                        <span className="font-medium text-gray-900">เปิดใช้งาน</span>
                    </label>

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
                                customer ? 'บันทึก' : 'เพิ่มลูกค้า'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
