'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus,
    Search,
    Filter,
    Package,
    MoreHorizontal,
    Edit,
    Trash2,
    Eye,
    X,
    Loader2
} from 'lucide-react';
import { apiService } from '@/lib/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

export default function ProductsPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    // Fetch products
    const { data, isLoading } = useQuery({
        queryKey: ['products', search],
        queryFn: async () => {
            const res = await apiService.getProducts({ search, limit: 50 });
            return res.data;
        },
    });

    const products = data?.data || [];

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiService.deleteProduct(id),
        onSuccess: () => {
            toast.success('ลบสินค้าสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
        onError: () => toast.error('เกิดข้อผิดพลาด'),
    });

    const handleDelete = (id: string, name: string) => {
        if (confirm(`ต้องการลบสินค้า "${name}" หรือไม่?`)) {
            deleteMutation.mutate(id);
        }
    };

    const drugTypeLabels: Record<string, string> = {
        GENERAL: 'ยาทั่วไป',
        DANGEROUS_DRUG: 'ยาอันตราย',
        CONTROLLED_DRUG: 'ยาควบคุมพิเศษ',
        NARCOTIC: 'ยาเสพติด',
        SUPPLEMENT: 'อาหารเสริม',
        MEDICAL_DEVICE: 'เครื่องมือแพทย์',
        COSMETIC: 'เครื่องสำอาง',
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">สินค้า</h1>
                    <p className="text-gray-500">จัดการรายการสินค้าและยาในระบบ</p>
                </div>
                <button
                    onClick={() => { setSelectedProduct(null); setIsModalOpen(true); }}
                    className="btn-primary"
                >
                    <Plus className="w-5 h-5" />
                    เพิ่มสินค้า
                </button>
            </div>

            {/* Search & Filters */}
            <div className="card">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาสินค้า, รหัส, barcode..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <button className="btn-secondary">
                        <Filter className="w-5 h-5" />
                        ตัวกรอง
                    </button>
                </div>
            </div>

            {/* Products Table */}
            <div className="card p-0 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                        <p className="text-gray-500 mt-2">กำลังโหลด...</p>
                    </div>
                ) : products.length === 0 ? (
                    <div className="p-12 text-center">
                        <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">ยังไม่มีสินค้าในระบบ</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="btn-primary mt-4"
                        >
                            <Plus className="w-5 h-5" />
                            เพิ่มสินค้าใหม่
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>รหัส</th>
                                    <th>ชื่อสินค้า</th>
                                    <th>ประเภท</th>
                                    <th>หน่วย</th>
                                    <th className="text-right">ราคาทุน</th>
                                    <th className="text-right">ราคาขาย</th>
                                    <th>VAT</th>
                                    <th className="text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product: any) => (
                                    <tr key={product.id}>
                                        <td>
                                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                                {product.sku}
                                            </span>
                                        </td>
                                        <td>
                                            <div>
                                                <p className="font-medium text-gray-900">{product.name}</p>
                                                {product.genericName && (
                                                    <p className="text-xs text-gray-500">{product.genericName}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={clsx(
                                                'badge',
                                                product.drugType === 'DANGEROUS_DRUG' && 'badge-warning',
                                                product.drugType === 'CONTROLLED_DRUG' && 'badge-danger',
                                                product.drugType === 'SUPPLEMENT' && 'badge-success',
                                                !['DANGEROUS_DRUG', 'CONTROLLED_DRUG', 'SUPPLEMENT'].includes(product.drugType) && 'badge-gray'
                                            )}>
                                                {drugTypeLabels[product.drugType] || product.drugType}
                                            </span>
                                        </td>
                                        <td>{product.unit}</td>
                                        <td className="text-right font-mono">
                                            {parseFloat(product.costPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="text-right font-mono font-medium">
                                            {parseFloat(product.sellingPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td>
                                            {product.isVatExempt ? (
                                                <span className="badge-gray">Non-VAT</span>
                                            ) : (
                                                <span className="badge-primary">VAT {product.vatRate}%</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => { setSelectedProduct(product); setIsViewModalOpen(true); }}
                                                    className="btn-icon"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedProduct(product); setIsModalOpen(true); }}
                                                    className="btn-icon"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id, product.name)}
                                                    className="btn-icon text-danger-500 hover:bg-danger-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Product Form Modal */}
            {isModalOpen && (
                <ProductModal
                    product={selectedProduct}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        queryClient.invalidateQueries({ queryKey: ['products'] });
                    }}
                />
            )}

            {/* View Modal */}
            {isViewModalOpen && selectedProduct && (
                <ViewProductModal
                    product={selectedProduct}
                    onClose={() => setIsViewModalOpen(false)}
                />
            )}
        </div>
    );
}

// Product Form Modal Component
function ProductModal({ product, onClose, onSuccess }: { product: any; onClose: () => void; onSuccess: () => void }) {
    const [formData, setFormData] = useState({
        sku: product?.sku || '',
        barcode: product?.barcode || '',
        name: product?.name || '',
        genericName: product?.genericName || '',
        drugType: product?.drugType || 'GENERAL',
        dosageForm: product?.dosageForm || '',
        strength: product?.strength || '',
        unit: product?.unit || 'ชิ้น',
        packSize: product?.packSize || 1,
        costPrice: product?.costPrice || 0,
        sellingPrice: product?.sellingPrice || 0,
        isVatExempt: product?.isVatExempt || false,
        vatRate: product?.vatRate || 7,
        reorderPoint: product?.reorderPoint || 10,
        reorderQty: product?.reorderQty || 100,
        isOemProduct: product?.isOemProduct || false,
    });

    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (product) {
                await apiService.updateProduct(product.id, formData);
                toast.success('อัพเดตสินค้าสำเร็จ');
            } else {
                await apiService.createProduct(formData);
                toast.success('เพิ่มสินค้าสำเร็จ');
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
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {product ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
                    </h2>
                    <button onClick={onClose} className="btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">รหัสสินค้า (SKU) *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Barcode</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">ชื่อสินค้า *</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">ชื่อสามัญ</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.genericName}
                                onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">ประเภท</label>
                            <select
                                className="input"
                                value={formData.drugType}
                                onChange={(e) => setFormData({ ...formData, drugType: e.target.value })}
                            >
                                <option value="GENERAL">ยาทั่วไป</option>
                                <option value="DANGEROUS_DRUG">ยาอันตราย</option>
                                <option value="CONTROLLED_DRUG">ยาควบคุมพิเศษ</option>
                                <option value="SUPPLEMENT">อาหารเสริม</option>
                                <option value="MEDICAL_DEVICE">เครื่องมือแพทย์</option>
                                <option value="COSMETIC">เครื่องสำอาง</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="label">รูปแบบยา</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="เม็ด, แคปซูล..."
                                value={formData.dosageForm}
                                onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">ความแรง</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="500 มก."
                                value={formData.strength}
                                onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">หน่วย</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="label">ราคาทุน</label>
                            <input
                                type="number"
                                step="0.01"
                                className="input"
                                value={formData.costPrice}
                                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="label">ราคาขาย</label>
                            <input
                                type="number"
                                step="0.01"
                                className="input"
                                value={formData.sellingPrice}
                                onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="label">Pack Size</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.packSize}
                                onChange={(e) => setFormData({ ...formData, packSize: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>

                    {/* VAT */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-5 h-5 rounded border-gray-300 text-primary-600"
                                checked={formData.isVatExempt}
                                onChange={(e) => setFormData({ ...formData, isVatExempt: e.target.checked })}
                            />
                            <span className="text-gray-700">ยกเว้น VAT (Non-VAT)</span>
                        </label>
                        {!formData.isVatExempt && (
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">VAT:</span>
                                <input
                                    type="number"
                                    className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-lg"
                                    value={formData.vatRate}
                                    onChange={(e) => setFormData({ ...formData, vatRate: parseFloat(e.target.value) })}
                                />
                                <span className="text-gray-500">%</span>
                            </div>
                        )}
                    </div>

                    {/* Stock Control */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">จุดสั่งซื้อ (Reorder Point)</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.reorderPoint}
                                onChange={(e) => setFormData({ ...formData, reorderPoint: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="label">จำนวนสั่งซื้อ (Reorder Qty)</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.reorderQty}
                                onChange={(e) => setFormData({ ...formData, reorderQty: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>

                    {/* OEM */}
                    <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl">
                        <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-gray-300 text-primary-600"
                            checked={formData.isOemProduct}
                            onChange={(e) => setFormData({ ...formData, isOemProduct: e.target.checked })}
                        />
                        <span className="text-gray-700">สินค้า OEM (สั่งผลิต)</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            ยกเลิก
                        </button>
                        <button type="submit" disabled={isLoading} className="btn-primary">
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                product ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// View Product Modal
function ViewProductModal({ product, onClose }: { product: any; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg animate-slide-up">
                <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">รายละเอียดสินค้า</h2>
                    <button onClick={onClose} className="btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                            <Package className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
                            <p className="text-gray-500">{product.genericName}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <InfoItem label="รหัส SKU" value={product.sku} />
                        <InfoItem label="Barcode" value={product.barcode || '-'} />
                        <InfoItem label="ประเภท" value={product.drugType} />
                        <InfoItem label="รูปแบบ" value={product.dosageForm || '-'} />
                        <InfoItem label="ราคาทุน" value={`฿${parseFloat(product.costPrice).toLocaleString()}`} />
                        <InfoItem label="ราคาขาย" value={`฿${parseFloat(product.sellingPrice).toLocaleString()}`} />
                        <InfoItem label="VAT" value={product.isVatExempt ? 'ยกเว้น' : `${product.vatRate}%`} />
                        <InfoItem label="หน่วย" value={product.unit} />
                    </div>

                    <button onClick={onClose} className="w-full btn-secondary">
                        ปิด
                    </button>
                </div>
            </div>
        </div>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="font-medium text-gray-900">{value}</p>
        </div>
    );
}
