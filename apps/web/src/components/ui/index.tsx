'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

// Error Boundary Component
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error('Error caught by boundary:', error, errorInfo);
        // TODO: Send to error tracking service (e.g., Sentry)
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[400px] flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        <div className="w-16 h-16 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-danger-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            เกิดข้อผิดพลาด
                        </h2>
                        <p className="text-gray-500 mb-6">
                            ขออภัย เกิดข้อผิดพลาดในการแสดงผลหน้านี้
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => this.setState({ hasError: false, error: null })}
                                className="btn-primary"
                            >
                                <RefreshCcw className="w-5 h-5" />
                                ลองอีกครั้ง
                            </button>
                            <Link href="/dashboard" className="btn-secondary">
                                <Home className="w-5 h-5" />
                                กลับหน้าหลัก
                            </Link>
                        </div>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-6 text-left bg-gray-100 rounded-lg p-4">
                                <summary className="cursor-pointer font-medium text-gray-700">
                                    รายละเอียด Error
                                </summary>
                                <pre className="mt-2 text-xs text-red-600 overflow-auto">
                                    {this.state.error.message}
                                    {'\n\n'}
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Loading skeleton components
export function CardSkeleton() {
    return (
        <div className="card animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
    );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="card p-0 overflow-hidden animate-pulse">
            <div className="bg-gray-50 border-b border-gray-100 p-4">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
            <div className="divide-y divide-gray-100">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="p-4 flex gap-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-1/2" />
                            <div className="h-3 bg-gray-200 rounded w-1/3" />
                        </div>
                        <div className="h-4 bg-gray-200 rounded w-20" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function PageSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex justify-between items-center">
                <div>
                    <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-64" />
                </div>
                <div className="h-10 bg-gray-200 rounded w-32" />
            </div>
            <div className="grid md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <CardSkeleton key={i} />
                ))}
            </div>
            <TableSkeleton />
        </div>
    );
}

export function StatsSkeleton() {
    return (
        <div className="grid md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
                <CardSkeleton key={i} />
            ))}
        </div>
    );
}

// Empty state component
export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    actionLabel,
}: {
    icon: any;
    title: string;
    description: string;
    action?: () => void;
    actionLabel?: string;
}) {
    return (
        <div className="text-center py-12">
            <Icon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">{description}</p>
            {action && actionLabel && (
                <button onClick={action} className="btn-primary">
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

// Confirm dialog component
export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel = 'ยืนยัน',
    cancelLabel = 'ยกเลิก',
    onConfirm,
    onCancel,
    variant = 'danger',
}: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'warning' | 'primary';
}) {
    if (!isOpen) return null;

    const buttonClass = {
        danger: 'bg-danger-600 hover:bg-danger-700 text-white',
        warning: 'bg-warning-600 hover:bg-warning-700 text-white',
        primary: 'btn-primary',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-slide-up">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 btn-secondary">
                        {cancelLabel}
                    </button>
                    <button onClick={onConfirm} className={`flex-1 px-4 py-2 rounded-xl font-medium transition-colors ${buttonClass[variant]}`}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
