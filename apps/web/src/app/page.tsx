import Link from 'next/link';
import {
    Package,
    TrendingUp,
    DollarSign,
    AlertCircle,
    ArrowRight,
    ShoppingCart
} from 'lucide-react';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
            {/* Header */}
            <header className="glass border-b border-gray-200/50 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">PharmaCare</h1>
                            <p className="text-xs text-gray-500">Enterprise ERP</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/auth/login" className="btn-secondary">
                            เข้าสู่ระบบ
                        </Link>
                        <Link href="/auth/login" className="btn-primary">
                            เริ่มต้นใช้งาน
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="py-24 px-6">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                        <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                        ระบบร้านยาระดับ Enterprise
                    </div>

                    <h2 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                        บริหารจัดการร้านยา<br />
                        <span className="text-gradient">อย่างมืออาชีพ</span>
                    </h2>

                    <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                        ระบบ ERP สำหรับร้านยาและคลังยาที่ครบครัน รองรับ VAT/Non-VAT,
                        OEM, หลายสาขา และระบบตัวแทนจำหน่าย
                    </p>

                    <div className="flex items-center justify-center gap-4">
                        <Link href="/auth/login" className="btn-primary text-lg px-8 py-4">
                            <ShoppingCart className="w-5 h-5" />
                            เริ่มใช้งานฟรี
                        </Link>
                        <Link href="#features" className="btn-ghost text-lg px-8 py-4">
                            ดูฟีเจอร์
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-20 px-6 bg-white/50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h3 className="text-3xl font-bold text-gray-900 mb-4">
                            ฟีเจอร์ครบครัน พร้อมใช้งาน
                        </h3>
                        <p className="text-gray-600">
                            ออกแบบมาเพื่อธุรกิจร้านยาระดับ 100 ล้านบาทขึ้นไป
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Feature Cards */}
                        <FeatureCard
                            icon={<Package className="w-6 h-6" />}
                            title="คลังสินค้า VAT & Non-VAT"
                            description="แยกคลังชัดเจน คำนวณภาษีอัตโนมัติ รองรับ E-Tax Invoice"
                            color="primary"
                        />
                        <FeatureCard
                            icon={<TrendingUp className="w-6 h-6" />}
                            title="ระบบ OEM"
                            description="สั่งผลิตจาก OEM ติดตามสถานะ รับสินค้าเข้าระบบอัตโนมัติ"
                            color="success"
                        />
                        <FeatureCard
                            icon={<ShoppingCart className="w-6 h-6" />}
                            title="POS ขายหน้าร้าน"
                            description="ระบบขายที่รวดเร็ว สแกนบาร์โค้ด รองรับหลายช่องทางชำระเงิน"
                            color="warning"
                        />
                        <FeatureCard
                            icon={<DollarSign className="w-6 h-6" />}
                            title="บัญชีและการเงิน"
                            description="ติดตามรายรับ-จ่าย รายงานภาษี CEO Dashboard"
                            color="danger"
                        />
                        <FeatureCard
                            icon={<AlertCircle className="w-6 h-6" />}
                            title="แจ้งเตือนอัจฉริยะ"
                            description="ยาใกล้หมดอายุ สต็อกต่ำ คำสั่งซื้อที่รอดำเนินการ"
                            color="primary"
                        />
                        <FeatureCard
                            icon={<Package className="w-6 h-6" />}
                            title="หลายสาขา"
                            description="บริหารหลายสาขาจากที่เดียว โอนสินค้าระหว่างสาขา"
                            color="success"
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white p-12">
                        <h3 className="text-3xl font-bold mb-4">
                            พร้อมยกระดับธุรกิจร้านยาของคุณ?
                        </h3>
                        <p className="text-primary-100 mb-8">
                            เริ่มต้นใช้งาน PharmaCare ERP วันนี้ ฟรี 30 วัน
                        </p>
                        <Link href="/auth/login" className="inline-flex items-center gap-2 bg-white text-primary-700 px-8 py-4 rounded-xl font-medium hover:bg-primary-50 transition-colors">
                            เริ่มใช้งานเลย
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-gray-200 py-8 px-6">
                <div className="max-w-7xl mx-auto text-center text-gray-500 text-sm">
                    © 2024 PharmaCare ERP. All rights reserved.
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({
    icon,
    title,
    description,
    color,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: 'primary' | 'success' | 'warning' | 'danger';
}) {
    const bgColors = {
        primary: 'bg-primary-100 text-primary-600',
        success: 'bg-success-50 text-success-600',
        warning: 'bg-warning-50 text-warning-600',
        danger: 'bg-danger-50 text-danger-600',
    };

    return (
        <div className="card-hover">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${bgColors[color]}`}>
                {icon}
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">{title}</h4>
            <p className="text-gray-600 text-sm">{description}</p>
        </div>
    );
}
