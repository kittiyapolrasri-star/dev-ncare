'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
    Package,
    LayoutDashboard,
    BoxesIcon,
    ShoppingCart,
    Factory,
    FileText,
    Users,
    Settings,
    LogOut,
    Bell,
    Search,
    Menu,
    X,
    Building2,
    ChevronDown,
    Truck
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { clsx } from 'clsx';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'สินค้า', href: '/dashboard/products', icon: Package },
    { name: 'คลังสินค้า', href: '/dashboard/inventory', icon: BoxesIcon },
    { name: 'ขายสินค้า (POS)', href: '/dashboard/pos', icon: ShoppingCart },
    { name: 'สั่งซื้อ OEM', href: '/dashboard/oem', icon: Factory },
    { name: 'ผู้จำหน่าย', href: '/dashboard/suppliers', icon: Truck },
    { name: 'ตัวแทนจำหน่าย', href: '/dashboard/distributors', icon: Users },
    { name: 'ลูกค้า', href: '/dashboard/customers', icon: Building2 },
    { name: 'สาขา', href: '/dashboard/branches', icon: Factory },
    { name: 'ผู้ใช้งาน', href: '/dashboard/users', icon: Settings },
    { name: 'คืนสินค้า', href: '/dashboard/returns', icon: RotateCcw },
    { name: 'รายงาน', href: '/dashboard/reports', icon: FileText },
    { name: 'ตั้งค่า', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isAuthenticated, logout } = useAuthStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    // Check auth on mount
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/auth/login');
        }
    }, [isAuthenticated, router]);

    const handleLogout = () => {
        logout();
        router.push('/auth/login');
    };

    if (!isAuthenticated || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const roleLabels: Record<string, string> = {
        CEO: 'ผู้บริหาร',
        ACCOUNTANT: 'นักบัญชี',
        BRANCH_MANAGER: 'ผู้จัดการสาขา',
        PHARMACIST: 'เภสัชกร',
        STAFF: 'พนักงาน',
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:flex sidebar">
                {/* Logo */}
                <div className="p-6 border-b border-gray-100">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                            <Package className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900">PharmaCare</h1>
                            <p className="text-xs text-gray-500">{user.organization.name}</p>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-gray-100">
                    <div className="relative">
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium">
                                {user.firstName[0]}{user.lastName[0]}
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-sm font-medium text-gray-900">
                                    {user.firstName} {user.lastName}
                                </p>
                                <p className="text-xs text-gray-500">{roleLabels[user.role]}</p>
                            </div>
                            <ChevronDown className={clsx('w-4 h-4 text-gray-400 transition-transform', isProfileOpen && 'rotate-180')} />
                        </button>

                        {isProfileOpen && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-soft-lg border border-gray-100 overflow-hidden">
                                <Link
                                    href="/dashboard/profile"
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                                >
                                    <Users className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-700">โปรไฟล์</span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-danger-600"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="text-sm">ออกจากระบบ</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="lg:pl-64">
                {/* Top Header */}
                <header className="sticky top-0 z-30 glass border-b border-gray-200/50">
                    <div className="flex items-center justify-between px-6 py-4">
                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden btn-icon"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        {/* Search */}
                        <div className="hidden md:flex flex-1 max-w-md mx-6">
                            <div className="relative w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="ค้นหาสินค้า, ใบขาย..."
                                    className="w-full pl-12 pr-4 py-2.5 bg-gray-100 border-0 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-2">
                            {/* Branch selector */}
                            {user.branch && (
                                <button className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors">
                                    <Building2 className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">{user.branch.name}</span>
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                </button>
                            )}

                            {/* Notifications */}
                            <button className="btn-icon relative">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-6">
                    {children}
                </main>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-50">
                    <div
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl animate-slide-up">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                                    <Package className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-bold text-gray-900">PharmaCare</span>
                            </div>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="btn-icon">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <nav className="p-2">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            )}
        </div>
    );
}
