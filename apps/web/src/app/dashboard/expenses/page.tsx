'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus,
    Search,
    Receipt,
    Calendar,
    DollarSign,
    TrendingDown,
    Loader2,
    X,
    Filter,
    PieChart
} from 'lucide-react';
import { apiService } from '@/lib/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface Expense {
    id: string;
    expenseDate: string;
    amount: number;
    description: string;
    reference?: string;
    paymentMethod?: string;
    category: { id: string; name: string };
    branch?: { id: string; name: string };
    user: { firstName: string; lastName: string };
}

interface ExpenseCategory {
    id: string;
    code: string;
    name: string;
    _count: { expenses: number };
}

export default function ExpensesPage() {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [filters, setFilters] = useState({
        categoryId: '',
        startDate: '',
        endDate: ''
    });

    // Fetch expenses
    const { data: expensesData, isLoading } = useQuery({
        queryKey: ['expenses', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.categoryId) params.append('categoryId', filters.categoryId);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            const res = await fetch(`/api/expenses?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            return res.json();
        }
    });

    // Fetch categories
    const { data: categoriesData } = useQuery({
        queryKey: ['expense-categories'],
        queryFn: async () => {
            const res = await fetch('/api/expenses/categories', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            return res.json();
        }
    });

    // Fetch summary
    const { data: summaryData } = useQuery({
        queryKey: ['expenses-summary'],
        queryFn: async () => {
            const res = await fetch('/api/expenses/summary?months=1', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            return res.json();
        }
    });

    const expenses: Expense[] = expensesData?.data || [];
    const categories: ExpenseCategory[] = categoriesData?.data || [];
    const monthlyTotal = summaryData?.data?.[0]?.total || 0;

    // Form state
    const [form, setForm] = useState({
        categoryId: '',
        expenseDate: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        description: '',
        reference: '',
        paymentMethod: 'CASH'
    });

    // Create/Update mutation
    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            const url = selectedExpense ? `/api/expenses/${selectedExpense.id}` : '/api/expenses';
            const method = selectedExpense ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    ...data,
                    expenseDate: new Date(data.expenseDate).toISOString(),
                    amount: parseFloat(data.amount)
                })
            });
            return res.json();
        },
        onSuccess: () => {
            toast.success(selectedExpense ? 'อัพเดตสำเร็จ' : 'บันทึกค่าใช้จ่ายสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
            closeModal();
        },
        onError: () => {
            toast.error('เกิดข้อผิดพลาด');
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/expenses/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            return res.json();
        },
        onSuccess: () => {
            toast.success('ลบสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
        }
    });

    const openModal = (expense?: Expense) => {
        if (expense) {
            setSelectedExpense(expense);
            setForm({
                categoryId: expense.category.id,
                expenseDate: format(new Date(expense.expenseDate), 'yyyy-MM-dd'),
                amount: expense.amount.toString(),
                description: expense.description || '',
                reference: expense.reference || '',
                paymentMethod: expense.paymentMethod || 'CASH'
            });
        } else {
            setSelectedExpense(null);
            setForm({
                categoryId: categories[0]?.id || '',
                expenseDate: format(new Date(), 'yyyy-MM-dd'),
                amount: '',
                description: '',
                reference: '',
                paymentMethod: 'CASH'
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedExpense(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveMutation.mutate(form);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">ค่าใช้จ่ายดำเนินงาน</h1>
                    <p className="text-gray-500">บันทึกค่าเช่า, เงินเดือน, ค่าน้ำ/ไฟ และค่าใช้จ่ายอื่นๆ</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary">
                    <Plus className="w-5 h-5" />
                    เพิ่มค่าใช้จ่าย
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <TrendingDown className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-red-100">ค่าใช้จ่ายเดือนนี้</p>
                            <p className="text-2xl font-bold">
                                ฿{monthlyTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary-100 rounded-xl">
                            <Receipt className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                            <p className="text-gray-500">จำนวนรายการ</p>
                            <p className="text-2xl font-bold text-gray-900">{expenses.length}</p>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 rounded-xl">
                            <PieChart className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-gray-500">หมวดหมู่</p>
                            <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex flex-wrap gap-4">
                    <select
                        value={filters.categoryId}
                        onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                        className="input w-48"
                    >
                        <option value="">ทุกหมวดหมู่</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="input w-40"
                        placeholder="จากวันที่"
                    />
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="input w-40"
                        placeholder="ถึงวันที่"
                    />
                </div>
            </div>

            {/* Expenses Table */}
            <div className="card overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">วันที่</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">หมวดหมู่</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">รายละเอียด</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">จำนวนเงิน</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">การชำระ</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {expenses.map((expense) => (
                                <tr key={expense.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">
                                        {format(new Date(expense.expenseDate), 'd MMM yyyy', { locale: th })}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="badge-primary">{expense.category.name}</span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                        {expense.description || '-'}
                                        {expense.reference && (
                                            <span className="text-gray-400 ml-2">#{expense.reference}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-red-600">
                                        -฿{Number(expense.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-500">
                                        {expense.paymentMethod === 'CASH' && 'เงินสด'}
                                        {expense.paymentMethod === 'BANK_TRANSFER' && 'โอน'}
                                        {expense.paymentMethod === 'CREDIT_CARD' && 'บัตร'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => openModal(expense)}
                                            className="text-primary-600 hover:underline text-sm mr-3"
                                        >
                                            แก้ไข
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('ต้องการลบรายการนี้?')) {
                                                    deleteMutation.mutate(expense.id);
                                                }
                                            }}
                                            className="text-red-600 hover:underline text-sm"
                                        >
                                            ลบ
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {expenses.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                                        ยังไม่มีรายการค่าใช้จ่าย
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">
                                {selectedExpense ? 'แก้ไขค่าใช้จ่าย' : 'เพิ่มค่าใช้จ่าย'}
                            </h2>
                            <button onClick={closeModal} className="btn-icon">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่ *</label>
                                <select
                                    value={form.categoryId}
                                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                                    className="input"
                                    required
                                >
                                    <option value="">เลือกหมวดหมู่</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ *</label>
                                    <input
                                        type="date"
                                        value={form.expenseDate}
                                        onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                                        className="input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงิน *</label>
                                    <input
                                        type="number"
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        className="input"
                                        placeholder="0.00"
                                        step="0.01"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
                                <input
                                    type="text"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="input"
                                    placeholder="เช่น ค่าเช่าร้าน เดือน ม.ค."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เลขใบเสร็จ</label>
                                    <input
                                        type="text"
                                        value={form.reference}
                                        onChange={(e) => setForm({ ...form, reference: e.target.value })}
                                        className="input"
                                        placeholder="INV-001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">การชำระ</label>
                                    <select
                                        value={form.paymentMethod}
                                        onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                                        className="input"
                                    >
                                        <option value="CASH">เงินสด</option>
                                        <option value="BANK_TRANSFER">โอนเงิน</option>
                                        <option value="CREDIT_CARD">บัตรเครดิต</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={saveMutation.isPending}
                                    className="w-full btn-primary py-3"
                                >
                                    {saveMutation.isPending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        selectedExpense ? 'บันทึกการแก้ไข' : 'บันทึกค่าใช้จ่าย'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
