'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Building,
    Plus,
    Search,
    MapPin,
    Phone,
    Users,
    Edit,
    Trash2,
    X,
    Loader2,
    Star,
    Clock
} from 'lucide-react';
import { apiService } from '@/lib/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { useAuthorize } from '@/hooks';

export default function BranchesPage() {
    const queryClient = useQueryClient();
    const { isAuthorized: canManage } = useAuthorize(['CEO']);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState<any>(null);

    // Fetch branches  
    const { data, isLoading } = useQuery({
        queryKey: ['branches', search],
        queryFn: async () => {
            const res = await apiService.getBranches();
            return res.data;
        },
    });

    const branches = data?.data || [];
    const filteredBranches = branches.filter((b: any) =>
        b.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.code?.toLowerCase().includes(search.toLowerCase())
    );

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiService.api.delete(`/branches/${id}`),
        onSuccess: () => {
            toast.success('ลบสาขาสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['branches'] });
        },
        onError: () => toast.error('เกิดข้อผิดพลาด'),
    });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">สาขา</h1>
                    <p className="text-gray-500">จัดการสาขาร้านยาทั้งหมด</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => { setSelectedBranch(null); setShowModal(true); }}
                        className="btn-primary"
                    >
                        <Plus className="w-5 h-5" />
                        เพิ่มสาขา
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="card">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาสาขา..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-500"
                    />
                </div>
            </div>

            {/* Branches Grid */}
            {isLoading ? (
                <div className="card p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                </div>
            ) : filteredBranches.length === 0 ? (
                <div className="card p-12 text-center">
                    <Building className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">ยังไม่มีสาขา</p>
                    {canManage && (
                        <button onClick={() => setShowModal(true)} className="btn-primary mt-4">
                            <Plus className="w-5 h-5" />
                            เพิ่มสาขาใหม่
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBranches.map((branch: any) => (
                        <div key={branch.id} className="card-hover relative">
                            {branch.isMainBranch && (
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-warning-400 rounded-full flex items-center justify-center text-white shadow-lg">
                                    <Star className="w-4 h-4" />
                                </div>
                            )}

                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                    {branch.name?.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">{branch.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">{branch.code}</span>
                                        {branch.isMainBranch && (
                                            <span className="badge-warning text-xs">สาขาหลัก</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                {branch.address && (
                                    <div className="flex items-start gap-2 text-sm text-gray-600">
                                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                        <span className="line-clamp-2">{branch.address}</span>
                                    </div>
                                )}
                                {branch.phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        {branch.phone}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Users className="w-4 h-4" />
                                    {branch._count?.users || 0} พนักงาน
                                </div>
                                <span className={clsx(
                                    'badge',
                                    branch.isActive ? 'badge-success' : 'badge-gray'
                                )}>
                                    {branch.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                                </span>
                            </div>

                            {canManage && (
                                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => { setSelectedBranch(branch); setShowModal(true); }}
                                        className="flex-1 btn-secondary py-2 text-sm"
                                    >
                                        <Edit className="w-4 h-4" />
                                        แก้ไข
                                    </button>
                                    {!branch.isMainBranch && (
                                        <button
                                            onClick={() => {
                                                if (confirm(`ลบสาขา "${branch.name}"?`)) {
                                                    deleteMutation.mutate(branch.id);
                                                }
                                            }}
                                            className="px-3 py-2 text-danger-600 hover:bg-danger-50 rounded-xl transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <BranchModal
                    branch={selectedBranch}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        queryClient.invalidateQueries({ queryKey: ['branches'] });
                    }}
                />
            )}
        </div>
    );
}

function BranchModal({
    branch,
    onClose,
    onSuccess,
}: {
    branch: any;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [formData, setFormData] = useState({
        code: branch?.code || '',
        name: branch?.name || '',
        address: branch?.address || '',
        phone: branch?.phone || '',
        isMainBranch: branch?.isMainBranch || false,
        isActive: branch?.isActive ?? true,
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (branch) {
                await apiService.api.put(`/branches/${branch.id}`, formData);
                toast.success('อัพเดตสาขาสำเร็จ');
            } else {
                await apiService.api.post('/branches', formData);
                toast.success('เพิ่มสาขาสำเร็จ');
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
                        {branch ? 'แก้ไขสาขา' : 'เพิ่มสาขาใหม่'}
                    </h2>
                    <button onClick={onClose} className="btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">รหัสสาขา *</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="เช่น BR001"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">ชื่อสาขา *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
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
                        <label className="label">โทรศัพท์</label>
                        <input
                            type="tel"
                            className="input"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>

                    <div className="space-y-3 pt-4 border-t border-gray-100">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isMainBranch}
                                onChange={(e) => setFormData({ ...formData, isMainBranch: e.target.checked })}
                                className="w-5 h-5 rounded border-gray-300 text-primary-600"
                            />
                            <div>
                                <p className="font-medium text-gray-900">สาขาหลัก</p>
                                <p className="text-sm text-gray-500">กำหนดเป็นสาขาหลักขององค์กร</p>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-5 h-5 rounded border-gray-300 text-primary-600"
                            />
                            <div>
                                <p className="font-medium text-gray-900">เปิดใช้งาน</p>
                                <p className="text-sm text-gray-500">อนุญาตให้ใช้งานสาขานี้</p>
                            </div>
                        </label>
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
                                branch ? 'บันทึก' : 'เพิ่มสาขา'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
