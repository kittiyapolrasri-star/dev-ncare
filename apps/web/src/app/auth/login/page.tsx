'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';

const loginSchema = z.object({
    email: z.string().email('กรุณากรอกอีเมลที่ถูกต้อง'),
    password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const { setAuth } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginForm) => {
        setIsLoading(true);
        try {
            const response = await api.post('/auth/login', data);
            const { token, user } = response.data.data;

            setAuth(token, user);
            toast.success(`ยินดีต้อนรับ ${user.firstName}!`);
            router.push('/dashboard');
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'เกิดข้อผิดพลาด');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
                        <Package className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">PharmaCare ERP</h1>
                    <p className="text-gray-500 mt-1">เข้าสู่ระบบเพื่อจัดการร้านยา</p>
                </div>

                {/* Login Form */}
                <div className="card">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="label">อีเมล</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="email@example.com"
                                className={errors.email ? 'input-error' : 'input'}
                                {...register('email')}
                            />
                            {errors.email && (
                                <p className="text-danger-500 text-sm mt-1">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="label">รหัสผ่าน</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className={`${errors.password ? 'input-error' : 'input'} pr-12`}
                                    {...register('password')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-danger-500 text-sm mt-1">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Remember & Forgot */}
                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                <span className="text-gray-600">จดจำการเข้าสู่ระบบ</span>
                            </label>
                            <Link href="/auth/forgot-password" className="text-primary-600 hover:text-primary-700">
                                ลืมรหัสผ่าน?
                            </Link>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full btn-primary py-3"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    กำลังเข้าสู่ระบบ...
                                </>
                            ) : (
                                'เข้าสู่ระบบ'
                            )}
                        </button>
                    </form>

                    {/* Demo Credentials */}
                    <div className="mt-6 p-4 bg-primary-50 rounded-xl">
                        <p className="text-sm font-medium text-primary-900 mb-2">บัญชีทดสอบ:</p>
                        <div className="text-sm text-primary-700 space-y-1">
                            <p><strong>CEO:</strong> ceo@pharmacare.co.th</p>
                            <p><strong>บัญชี:</strong> accountant@pharmacare.co.th</p>
                            <p><strong>รหัสผ่าน:</strong> password123</p>
                        </div>
                    </div>
                </div>

                {/* Back to home */}
                <div className="text-center mt-6">
                    <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
                        ← กลับหน้าหลัก
                    </Link>
                </div>
            </div>
        </div>
    );
}
