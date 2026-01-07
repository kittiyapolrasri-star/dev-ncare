'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ShoppingCart,
    Search,
    Plus,
    Minus,
    Trash2,
    CreditCard,
    Banknote,
    QrCode,
    Receipt,
    X,
    Loader2,
    User,
    CheckCircle
} from 'lucide-react';
import { apiService } from '@/lib/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { useAuthStore } from '@/stores/auth';

interface CartItem {
    productId: string;
    product: any;
    quantity: number;
    unitPrice: number;
    discount: number;
    isVat: boolean;
    vatRate: number;
}

export default function POSPage() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CREDIT_CARD' | 'QR_PAYMENT'>('CASH');
    const [amountReceived, setAmountReceived] = useState<string>('');
    const [showCheckout, setShowCheckout] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastInvoice, setLastInvoice] = useState<string>('');

    // Fetch products for search
    const { data: productsData } = useQuery({
        queryKey: ['products-pos', search],
        queryFn: async () => {
            if (!search) return { data: [] };
            const res = await apiService.getProducts({ search, limit: 10 });
            return res.data;
        },
        enabled: search.length >= 2,
    });

    const products = productsData?.data || [];

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => {
        const itemTotal = (item.unitPrice * item.quantity) - item.discount;
        return sum + itemTotal;
    }, 0);

    const totalVat = cart.reduce((sum, item) => {
        if (!item.isVat) return sum;
        const itemTotal = (item.unitPrice * item.quantity) - item.discount;
        return sum + (itemTotal * (item.vatRate / 100));
    }, 0);

    const totalAmount = subtotal + totalVat;
    const change = parseFloat(amountReceived || '0') - totalAmount;

    // Add to cart
    const addToCart = (product: any) => {
        setSearch('');
        const existing = cart.find(item => item.productId === product.id);

        if (existing) {
            setCart(cart.map(item =>
                item.productId === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, {
                productId: product.id,
                product,
                quantity: 1,
                unitPrice: parseFloat(product.sellingPrice),
                discount: 0,
                isVat: !product.isVatExempt,
                vatRate: product.vatRate || 7,
            }]);
        }
    };

    // Update quantity
    const updateQuantity = (productId: string, delta: number) => {
        setCart(cart.map(item => {
            if (item.productId === productId) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    // Remove from cart
    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.productId !== productId));
    };

    // Clear cart
    const clearCart = () => {
        if (cart.length > 0 && confirm('ต้องการล้างตะกร้าหรือไม่?')) {
            setCart([]);
        }
    };

    // Create sale mutation
    const saleMutation = useMutation({
        mutationFn: async () => {
            const saleData = {
                branchId: user?.branch?.id || '',
                saleType: 'RETAIL',
                items: cart.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discount: item.discount,
                    isVat: item.isVat,
                    vatRate: item.vatRate,
                })),
                discountAmount: 0,
                paymentMethod,
                amountPaid: paymentMethod === 'CASH' ? parseFloat(amountReceived) : totalAmount,
                isVatInvoice: false,
            };
            const res = await apiService.createSale(saleData);
            return res.data;
        },
        onSuccess: (data) => {
            setLastInvoice(data.data.invoiceNumber);
            setShowCheckout(false);
            setShowSuccess(true);
            setCart([]);
            setAmountReceived('');
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error?.message || 'เกิดข้อผิดพลาด');
        },
    });

    // Quick amount buttons
    const quickAmounts = [100, 500, 1000, totalAmount];

    return (
        <div className="h-[calc(100vh-120px)] flex gap-6">
            {/* Left - Products Search */}
            <div className="flex-1 flex flex-col">
                <div className="card mb-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาสินค้า หรือ สแกนบาร์โค้ด..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-xl text-lg focus:ring-2 focus:ring-primary-500"
                            autoFocus
                        />
                    </div>

                    {/* Search Results */}
                    {search.length >= 2 && products.length > 0 && (
                        <div className="mt-4 border-t border-gray-100 pt-4">
                            <p className="text-sm text-gray-500 mb-2">ผลการค้นหา</p>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {products.map((product: any) => (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-primary-50 transition-colors text-left"
                                    >
                                        <div>
                                            <p className="font-medium text-gray-900">{product.name}</p>
                                            <p className="text-sm text-gray-500">{product.sku}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-primary-600">
                                                ฿{parseFloat(product.sellingPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </p>
                                            {!product.isVatExempt && (
                                                <span className="text-xs text-gray-400">+VAT</span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Cart is empty state */}
                {cart.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <ShoppingCart className="w-20 h-20 mx-auto text-gray-300 mb-4" />
                            <p className="text-xl text-gray-500">ยังไม่มีสินค้าในตะกร้า</p>
                            <p className="text-gray-400 mt-2">ค้นหาสินค้าด้านบนเพื่อเริ่มขาย</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Right - Cart */}
            <div className="w-96 flex flex-col">
                <div className="card flex-1 flex flex-col">
                    {/* Cart Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-primary-600" />
                            <h2 className="font-semibold text-gray-900">ตะกร้าสินค้า</h2>
                            <span className="badge-primary">{cart.length}</span>
                        </div>
                        {cart.length > 0 && (
                            <button onClick={clearCart} className="text-sm text-danger-600 hover:underline">
                                ล้างทั้งหมด
                            </button>
                        )}
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto py-4 space-y-3">
                        {cart.map((item) => (
                            <div key={item.productId} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900 text-sm">{item.product.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-primary-600 font-medium">
                                            ฿{item.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </span>
                                        {item.isVat && (
                                            <span className="text-xs text-gray-400">+VAT</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => updateQuantity(item.productId, -1)}
                                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.productId, 1)}
                                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => removeFromCart(item.productId)}
                                        className="w-8 h-8 rounded-lg text-danger-500 hover:bg-danger-50 flex items-center justify-center"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Cart Summary */}
                    {cart.length > 0 && (
                        <div className="pt-4 border-t border-gray-100 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">รวมสินค้า</span>
                                <span className="text-gray-900">฿{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">VAT 7%</span>
                                <span className="text-gray-900">฿{totalVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                                <span>รวมทั้งหมด</span>
                                <span className="text-primary-600">฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                            </div>

                            <button
                                onClick={() => setShowCheckout(true)}
                                className="w-full btn-primary py-4 text-lg mt-4"
                            >
                                <CreditCard className="w-5 h-5" />
                                ชำระเงิน
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Checkout Modal */}
            {showCheckout && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCheckout(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">ชำระเงิน</h2>
                            <button onClick={() => setShowCheckout(false)} className="btn-icon">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Total */}
                            <div className="text-center py-4 bg-primary-50 rounded-xl">
                                <p className="text-sm text-primary-600">ยอดรวม</p>
                                <p className="text-4xl font-bold text-primary-700">
                                    ฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </p>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">ช่องทางชำระเงิน</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { key: 'CASH', icon: Banknote, label: 'เงินสด' },
                                        { key: 'CREDIT_CARD', icon: CreditCard, label: 'บัตร' },
                                        { key: 'QR_PAYMENT', icon: QrCode, label: 'QR' },
                                    ].map((method) => (
                                        <button
                                            key={method.key}
                                            onClick={() => setPaymentMethod(method.key as any)}
                                            className={clsx(
                                                'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
                                                paymentMethod === method.key
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                            )}
                                        >
                                            <method.icon className="w-6 h-6" />
                                            <span className="text-sm font-medium">{method.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Cash Amount */}
                            {paymentMethod === 'CASH' && (
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">จำนวนเงินที่รับ</p>
                                    <input
                                        type="number"
                                        value={amountReceived}
                                        onChange={(e) => setAmountReceived(e.target.value)}
                                        className="input text-2xl text-center font-bold"
                                        placeholder="0.00"
                                    />
                                    <div className="flex gap-2 mt-2">
                                        {quickAmounts.map((amount) => (
                                            <button
                                                key={amount}
                                                onClick={() => setAmountReceived(amount.toString())}
                                                className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200"
                                            >
                                                ฿{amount.toLocaleString()}
                                            </button>
                                        ))}
                                    </div>
                                    {parseFloat(amountReceived) >= totalAmount && (
                                        <div className="mt-4 p-3 bg-success-50 rounded-xl text-center">
                                            <p className="text-sm text-success-600">เงินทอน</p>
                                            <p className="text-2xl font-bold text-success-700">
                                                ฿{change.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                onClick={() => saleMutation.mutate()}
                                disabled={saleMutation.isPending || (paymentMethod === 'CASH' && parseFloat(amountReceived) < totalAmount)}
                                className="w-full btn-primary py-4 text-lg disabled:opacity-50"
                            >
                                {saleMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        กำลังบันทึก...
                                    </>
                                ) : (
                                    <>
                                        <Receipt className="w-5 h-5" />
                                        ยืนยันการขาย
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center animate-slide-up">
                        <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-10 h-10 text-success-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">บันทึกการขายสำเร็จ!</h2>
                        <p className="text-gray-500 mb-2">เลขใบเสร็จ</p>
                        <p className="text-lg font-mono font-bold text-primary-600 mb-6">{lastInvoice}</p>
                        <button
                            onClick={() => setShowSuccess(false)}
                            className="w-full btn-primary py-3"
                        >
                            ขายรายการใหม่
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
