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
    Key,
    Shield,
    UserCheck,
    UserX,
    Mail,
    Phone
} from 'lucide-react';
import { apiService } from '@/lib/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { useAuthorize } from '@/hooks';

const roleLabels: Record<string, { label: string; color: string }> = {
    CEO: { label: 'ผู้บริหาร', color: 'badge-primary' },
    ACCOUNTANT: { label: 'บัญชี', color: 'badge-warning' },
    BRANCH_MANAGER: { label: 'ผู้จัดการสาขา', color: 'badge-success' },
    PHARMACIST: { label: 'เภสัชกร', color: 'badge-primary' },
    STAFF: { label: 'พนักงาน', color: 'badge-gray' },
};

export default function UsersPage() {
    const queryClient = useQueryClient();
    const { isAuthorized: canManage } = useAuthorize(['CEO', 'BRANCH_MANAGER']);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    // Fetch users
    const { data, isLoading } = useQuery({
        queryKey: ['users', search, roleFilter],
        queryFn: async () => {
            const params: any = { search };
            if (roleFilter !== 'all') params.role = roleFilter;
            const res = await apiService.api.get('/users', { params });
            return res.data;
        },
    });

    const users = data?.data || [];

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiService.api.delete(`/users/${id}`),
        onSuccess: () => {
            toast.success('ลบผู้ใช้งานสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: () => toast.error('เกิดข้อผิดพลาด'),
    });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">ผู้ใช้งาน</h1>
                    <p className="text-gray-500">จัดการผู้ใช้งานระบบทั้งหมด</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => { setSelectedUser(null); setShowModal(true); }}
                        className="btn-primary"
                    >
                        <Plus className="w-5 h-5" />
                        เพิ่มผู้ใช้งาน
                    </button>
                )}
            </div>

            {/* Summary */}
            <div className="grid md:grid-cols-4 gap-4">
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                            <UsersIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                            <p className="text-sm text-gray-500">ทั้งหมด</p>
                        </div>
                    </div>
                </div>
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center text-success-600">
                            <UserCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {users.filter((u: any) => u.isActive).length}
                            </p>
                            <p className="text-sm text-gray-500">ใช้งาน</p>
                        </div>
                    </div>
                </div>
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center text-warning-600">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {users.filter((u: any) => u.role === 'CEO' || u.role === 'BRANCH_MANAGER').length}
                            </p>
                            <p className="text-sm text-gray-500">ผู้จัดการ</p>
                        </div>
                    </div>
                </div>
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-danger-50 rounded-xl flex items-center justify-center text-danger-600">
                            <UserX className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {users.filter((u: any) => !u.isActive).length}
                            </p>
                            <p className="text-sm text-gray-500">ปิดใช้งาน</p>
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
                            placeholder="ค้นหาผู้ใช้งาน..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">ทุกบทบาท</option>
                        <option value="CEO">ผู้บริหาร</option>
                        <option value="BRANCH_MANAGER">ผู้จัดการสาขา</option>
                        <option value="PHARMACIST">เภสัชกร</option>
                        <option value="ACCOUNTANT">บัญชี</option>
                        <option value="STAFF">พนักงาน</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            {isLoading ? (
                <div className="card p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                </div>
            ) : users.length === 0 ? (
                <div className="card p-12 text-center">
                    <UsersIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">ยังไม่มีผู้ใช้งาน</p>
                </div>
            ) : (
                <div className="card p-0 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">ผู้ใช้งาน</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">บทบาท</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">สาขา</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">สถานะ</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((user: any) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-medium">
                                                {user.firstName?.[0]}{user.lastName?.[0]}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                                    <Mail className="w-3 h-3" />{user.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`badge ${roleLabels[user.role]?.color || 'badge-gray'}`}>
                                            {roleLabels[user.role]?.label || user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {user.branch?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            'badge',
                                            user.isActive ? 'badge-success' : 'badge-gray'
                                        )}>
                                            {user.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {canManage && (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => { setSelectedUser(user); setShowResetModal(true); }}
                                                    className="p-2 text-warning-600 hover:bg-warning-50 rounded-lg transition-colors"
                                                    title="รีเซ็ตรหัสผ่าน"
                                                >
                                                    <Key className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedUser(user); setShowModal(true); }}
                                                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                    title="แก้ไข"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`ลบผู้ใช้งาน "${user.firstName} ${user.lastName}"?`)) {
                                                            deleteMutation.mutate(user.id);
                                                        }
                                                    }}
                                                    className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                                                    title="ลบ"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* User Modal */}
            {showModal && (
                <UserModal
                    user={selectedUser}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        queryClient.invalidateQueries({ queryKey: ['users'] });
                    }}
                />
            )}

            {/* Reset Password Modal */}
            {showResetModal && selectedUser && (
                <ResetPasswordModal
                    user={selectedUser}
                    onClose={() => setShowResetModal(false)}
                    onSuccess={() => {
                        setShowResetModal(false);
                    }}
                />
            )}
        </div>
    );
}

function UserModal({
    user,
    onClose,
    onSuccess,
}: {
    user: any;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { data: branchesData } = useQuery({
        queryKey: ['branches'],
        queryFn: () => apiService.getBranches(),
    });
    const branches = branchesData?.data?.data || [];

    const [formData, setFormData] = useState({
        email: user?.email || '',
        password: '',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        phone: user?.phone || '',
        role: user?.role || 'STAFF',
        branchId: user?.branchId || '',
        isActive: user?.isActive ?? true,
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (user) {
                await apiService.api.put(`/users/${user.id}`, formData);
                toast.success('อัพเดตผู้ใช้งานสำเร็จ');
            } else {
                await apiService.api.post('/users', formData);
                toast.success('เพิ่มผู้ใช้งานสำเร็จ');
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
                        {user ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
                    </h2>
                    <button onClick={onClose} className="btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">ชื่อ *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">นามสกุล *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">อีเมล *</label>
                        <input
                            type="email"
                            className="input"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            disabled={!!user}
                        />
                    </div>

                    {!user && (
                        <div>
                            <label className="label">รหัสผ่าน *</label>
                            <input
                                type="password"
                                className="input"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                minLength={6}
                            />
                        </div>
                    )}

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
                            <label className="label">บทบาท *</label>
                            <select
                                className="input"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="CEO">ผู้บริหาร</option>
                                <option value="BRANCH_MANAGER">ผู้จัดการสาขา</option>
                                <option value="PHARMACIST">เภสัชกร</option>
                                <option value="ACCOUNTANT">บัญชี</option>
                                <option value="STAFF">พนักงาน</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="label">สาขา</label>
                        <select
                            className="input"
                            value={formData.branchId}
                            onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                        >
                            <option value="">-- เลือกสาขา --</option>
                            {branches.map((branch: any) => (
                                <option key={branch.id} value={branch.id}>{branch.name}</option>
                            ))}
                        </select>
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
                                user ? 'บันทึก' : 'เพิ่มผู้ใช้งาน'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ResetPasswordModal({
    user,
    onClose,
    onSuccess,
}: {
    user: any;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [newPassword, setNewPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await apiService.api.post(`/users/${user.id}/reset-password`, { newPassword });
            toast.success('รีเซ็ตรหัสผ่านสำเร็จ');
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
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-up">
                <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">รีเซ็ตรหัสผ่าน</h2>
                    <button onClick={onClose} className="btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-gray-600">
                        รีเซ็ตรหัสผ่านสำหรับ <strong>{user.firstName} {user.lastName}</strong>
                    </p>

                    <div>
                        <label className="label">รหัสผ่านใหม่ *</label>
                        <input
                            type="password"
                            className="input"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="อย่างน้อย 6 ตัวอักษร"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary">
                            ยกเลิก
                        </button>
                        <button type="submit" disabled={isLoading} className="flex-1 btn-primary">
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'รีเซ็ต'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
