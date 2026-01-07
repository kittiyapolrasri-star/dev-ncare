'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Settings,
    Building2,
    Users,
    Shield,
    Bell,
    Palette,
    Database,
    Save,
    Loader2,
    ChevronRight,
    Building,
    User,
    Lock
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { apiService } from '@/lib/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

type SettingsTab = 'organization' | 'profile' | 'security' | 'notifications';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('organization');
    const { user } = useAuthStore();

    const tabs = [
        { id: 'organization' as const, label: 'องค์กร', icon: Building2, roles: ['CEO'] },
        { id: 'profile' as const, label: 'โปรไฟล์', icon: User, roles: [] },
        { id: 'security' as const, label: 'ความปลอดภัย', icon: Shield, roles: [] },
        { id: 'notifications' as const, label: 'การแจ้งเตือน', icon: Bell, roles: [] },
    ];

    const visibleTabs = tabs.filter(tab =>
        tab.roles.length === 0 || tab.roles.includes(user?.role || '')
    );

    return (
        <div className="animate-fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">ตั้งค่า</h1>
                <p className="text-gray-500">จัดการการตั้งค่าระบบและโปรไฟล์</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar */}
                <div className="w-full lg:w-64 flex-shrink-0">
                    <div className="card p-2">
                        {visibleTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={clsx(
                                    'w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left',
                                    activeTab === tab.id
                                        ? 'bg-primary-50 text-primary-700'
                                        : 'text-gray-600 hover:bg-gray-50'
                                )}
                            >
                                <tab.icon className="w-5 h-5" />
                                <span className="font-medium">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                    {activeTab === 'organization' && <OrganizationSettings />}
                    {activeTab === 'profile' && <ProfileSettings />}
                    {activeTab === 'security' && <SecuritySettings />}
                    {activeTab === 'notifications' && <NotificationSettings />}
                </div>
            </div>
        </div>
    );
}

// Organization Settings
function OrganizationSettings() {
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        taxId: '',
        address: '',
        phone: '',
        email: '',
        website: '',
    });

    // Fetch organization
    const { data } = useQuery({
        queryKey: ['organization'],
        queryFn: async () => {
            const res = await apiService.api.get('/organizations/current');
            setFormData({
                name: res.data.data?.name || '',
                taxId: res.data.data?.taxId || '',
                address: res.data.data?.address || '',
                phone: res.data.data?.phone || '',
                email: res.data.data?.email || '',
                website: res.data.data?.website || '',
            });
            return res.data;
        },
    });

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await apiService.api.put('/organizations/current', formData);
            toast.success('บันทึกข้อมูลองค์กรสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['organization'] });
        } catch {
            toast.error('เกิดข้อผิดพลาด');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="card">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                    <Building2 className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">ข้อมูลองค์กร</h2>
                    <p className="text-sm text-gray-500">จัดการข้อมูลบริษัทและการติดต่อ</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="label">ชื่อบริษัท</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

                <div className="grid md:grid-cols-2 gap-4">
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

                <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button onClick={handleSave} disabled={isLoading} className="btn-primary">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
}

// Profile Settings
function ProfileSettings() {
    const { user, setUser } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        phone: user?.phone || '',
    });

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const res = await apiService.api.put('/auth/profile', formData);
            setUser({ ...user, ...res.data.data });
            toast.success('บันทึกโปรไฟล์สำเร็จ');
        } catch {
            toast.error('เกิดข้อผิดพลาด');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="card">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                    <User className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">โปรไฟล์ของคุณ</h2>
                    <p className="text-sm text-gray-500">จัดการข้อมูลส่วนตัว</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="label">ชื่อ</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="label">นามสกุล</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="label">อีเมล</label>
                    <input
                        type="email"
                        className="input bg-gray-100"
                        value={user?.email || ''}
                        disabled
                    />
                    <p className="text-xs text-gray-400 mt-1">ไม่สามารถแก้ไขอีเมลได้</p>
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

                <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button onClick={handleSave} disabled={isLoading} className="btn-primary">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
}

// Security Settings
function SecuritySettings() {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const handleChangePassword = async () => {
        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('รหัสผ่านใหม่ไม่ตรงกัน');
            return;
        }
        if (formData.newPassword.length < 8) {
            toast.error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
            return;
        }

        setIsLoading(true);
        try {
            await apiService.api.post('/auth/change-password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword,
            });
            toast.success('เปลี่ยนรหัสผ่านสำเร็จ');
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'เกิดข้อผิดพลาด');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="card">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center text-warning-600">
                    <Lock className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">ความปลอดภัย</h2>
                    <p className="text-sm text-gray-500">เปลี่ยนรหัสผ่านและตั้งค่าความปลอดภัย</p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="label">รหัสผ่านปัจจุบัน</label>
                    <input
                        type="password"
                        className="input"
                        value={formData.currentPassword}
                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    />
                </div>

                <div>
                    <label className="label">รหัสผ่านใหม่</label>
                    <input
                        type="password"
                        className="input"
                        value={formData.newPassword}
                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        ต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวพิมพ์ใหญ่และตัวเลข
                    </p>
                </div>

                <div>
                    <label className="label">ยืนยันรหัสผ่านใหม่</label>
                    <input
                        type="password"
                        className="input"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                        onClick={handleChangePassword}
                        disabled={isLoading || !formData.currentPassword || !formData.newPassword}
                        className="btn-primary"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                        เปลี่ยนรหัสผ่าน
                    </button>
                </div>
            </div>
        </div>
    );
}

// Notification Settings
function NotificationSettings() {
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const [settings, setSettings] = useState({
        lowStock: true,
        expiringSoon: true,
        newOrders: true,
        dailySummary: false,
        emailNotifications: true,
        lineNotify: false,
        lineNotifyToken: '',
    });

    // Fetch settings
    useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const res = await apiService.getSettings();
            const data = res.data.data;
            if (data) {
                setSettings(prev => ({
                    ...prev,
                    lowStock: data.lowStock ?? true,
                    expiringSoon: data.expiringSoon ?? true,
                    newOrders: data.newOrders ?? true,
                    dailySummary: data.dailySummary ?? false,
                    emailNotifications: data.emailNotifications ?? true,
                    lineNotify: data.lineNotify ?? false,
                    lineNotifyToken: data.lineNotifyToken || '',
                }));
            }
            return data;
        },
    });

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await apiService.updateSettings(settings);
            toast.success('บันทึกการตั้งค่าแจ้งเตือนสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        } catch {
            toast.error('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestLine = async () => {
        if (!settings.lineNotifyToken) {
            toast.error('กรุณาระบุ LINE Token');
            return;
        }
        setIsTesting(true);
        try {
            await apiService.api.post('/settings/test-line', { token: settings.lineNotifyToken });
            toast.success('ส่งข้อความทดสอบสำเร็จ');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'ส่งข้อความไม่สำเร็จ โปรดตรวจสอบ Token');
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="card">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center text-success-600">
                    <Bell className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">การแจ้งเตือน</h2>
                    <p className="text-sm text-gray-500">จัดการการแจ้งเตือนที่ต้องการรับ</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-4">
                    <ToggleItem
                        label="สินค้าใกล้หมด (Low Stock)"
                        description="แจ้งเตือนเมื่อสินค้าต่ำกว่าจุดสั่งซื้อ (Reorder Point)"
                        checked={settings.lowStock}
                        onChange={(checked) => setSettings({ ...settings, lowStock: checked })}
                    />
                    <ToggleItem
                        label="ยาใกล้หมดอายุ (Expiring Soon)"
                        description="แจ้งเตือนเมื่อมียาจะหมดอายุใน 90 วัน"
                        checked={settings.expiringSoon}
                        onChange={(checked) => setSettings({ ...settings, expiringSoon: checked })}
                    />
                    <ToggleItem
                        label="คำสั่งซื้อใหม่ (New Orders)"
                        description="แจ้งเตือนเมื่อมีคำสั่งซื้อใหม่เข้ามา"
                        checked={settings.newOrders}
                        onChange={(checked) => setSettings({ ...settings, newOrders: checked })}
                    />
                    <ToggleItem
                        label="สรุปรายวัน (Daily Summary)"
                        description="รับสรุปยอดขายและสต็อกทุกวัน"
                        checked={settings.dailySummary}
                        onChange={(checked) => setSettings({ ...settings, dailySummary: checked })}
                    />
                </div>

                <div className="pt-6 border-t border-gray-100 space-y-6">
                    <h3 className="font-medium text-gray-900">ช่องทางการแจ้งเตือน</h3>

                    <ToggleItem
                        label="อีเมล (Email)"
                        description="รับการแจ้งเตือนผ่านอีเมล"
                        checked={settings.emailNotifications}
                        onChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                    />

                    <div className="space-y-4">
                        <ToggleItem
                            label="LINE Notify"
                            description="รับการแจ้งเตือนผ่าน LINE"
                            checked={settings.lineNotify}
                            onChange={(checked) => setSettings({ ...settings, lineNotify: checked })}
                        />

                        {settings.lineNotify && (
                            <div className="ml-0 sm:ml-12 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-slide-up">
                                <label className="label">LINE Notify Token</label>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        placeholder="กรอก Token ที่ได้จาก https://notify-bot.line.me"
                                        className="input flex-1"
                                        value={settings.lineNotifyToken}
                                        onChange={(e) => setSettings({ ...settings, lineNotifyToken: e.target.value })}
                                    />
                                    <button
                                        onClick={handleTestLine}
                                        disabled={isTesting || !settings.lineNotifyToken}
                                        className="btn-white whitespace-nowrap"
                                    >
                                        {isTesting ? 'กำลังส่ง...' : 'ทดสอบ'}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    1. ไปที่ <a href="https://notify-bot.line.me/my/" target="_blank" className="text-primary-600 hover:underline">notify-bot.line.me</a><br />
                                    2. เข้าสู่ระบบและกด "Generate Token"<br />
                                    3. เลือกกลุ่มไลน์ที่ต้องการรับการแจ้งเตือน<br />
                                    4. คัดลอก Token มาใส่ในช่องนี้
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button onClick={handleSave} disabled={isLoading} className="btn-primary">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        บันทึกการตั้งค่า
                    </button>
                </div>
            </div>
        </div>
    );
}

function ToggleItem({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="font-medium text-gray-900">{label}</p>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={clsx(
                    'w-12 h-6 rounded-full transition-colors relative',
                    checked ? 'bg-primary-600' : 'bg-gray-300'
                )}
            >
                <span
                    className={clsx(
                        'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                        checked ? 'translate-x-7' : 'translate-x-1'
                    )}
                />
            </button>
        </div>
    );
}
