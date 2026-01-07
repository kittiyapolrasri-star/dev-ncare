'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    FileSignature,
    Search,
    Eye,
    Plus,
    X,
    Loader2,
    Calendar,
    User,
    CheckCircle,
    Pill,
    Trash2
} from 'lucide-react';
import { apiService } from '@/lib/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function PrescriptionsPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [selectedPrescription, setSelectedPrescription] = useState<any>(null);

    // Fetch prescriptions
    const { data, isLoading } = useQuery({
        queryKey: ['prescriptions', search, status],
        queryFn: async () => {
            const params: any = { search };
            if (status !== 'all') params.status = status;
            const res = await apiService.api.get('/prescriptions', { params });
            return res.data;
        },
    });

    const prescriptions = data?.data || [];

    // Dispense mutation
    const dispenseMutation = useMutation({
        mutationFn: (id: string) => apiService.api.post(`/prescriptions/${id}/dispense`),
        onSuccess: () => {
            toast.success('บันทึกการจ่ายยาสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
            setShowModal(false);
        },
        onError: () => toast.error('เกิดข้อผิดพลาด'),
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">ใบสั่งยา</h1>
                    <p className="text-gray-500">จัดการใบสั่งยาและการจ่ายยา</p>
                </div>
                <button
                    onClick={() => { setSelectedPrescription(null); setShowModal(true); }}
                    className="btn-primary"
                >
                    <Plus className="w-5 h-5" />
                    สร้างใบสั่งยา
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                            <FileSignature className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{prescriptions.length}</p>
                            <p className="text-sm text-gray-500">ใบสั่งยาทั้งหมด</p>
                        </div>
                    </div>
                </div>
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center text-warning-600">
                            <Loader2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {prescriptions.filter((p: any) => p.status === 'PENDING').length}
                            </p>
                            <p className="text-sm text-gray-500">รอจ่ายยา</p>
                        </div>
                    </div>
                </div>
                <div className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center text-success-600">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {prescriptions.filter((p: any) => p.status === 'DISPENSED').length}
                            </p>
                            <p className="text-sm text-gray-500">จ่ายยาแล้ว</p>
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
                            placeholder="ค้นหาเลขที่, ชื่อผู้ป่วย..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">ทุกสถานะ</option>
                        <option value="PENDING">รอจ่ายยา</option>
                        <option value="DISPENSED">จ่ายยาแล้ว</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="card p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                </div>
            ) : prescriptions.length === 0 ? (
                <div className="card p-12 text-center">
                    <FileSignature className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">ไม่พบใบสั่งยา</p>
                    <button onClick={() => setShowModal(true)} className="btn-primary mt-4">
                        <Plus className="w-5 h-5" />
                        สร้างใบสั่งยาใหม่
                    </button>
                </div>
            ) : (
                <div className="card p-0 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">เลขที่</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">ผู้ป่วย</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">แพทย์/รพ.</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">วันที่</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">สถานะ</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {prescriptions.map((px: any) => (
                                <tr key={px.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{px.prescriptionNo}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{px.patientName}</div>
                                        <div className="text-xs text-gray-500">{px.patientPhone}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        <div>{px.doctorName || '-'}</div>
                                        <div className="text-xs text-gray-500">{px.hospitalName}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {format(new Date(px.prescriptionDate), 'dd MMM yy HH:mm', { locale: th })}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={clsx('badge', {
                                            'badge-warning': px.status === 'PENDING',
                                            'badge-success': px.status === 'DISPENSED',
                                        })}>
                                            {px.status === 'PENDING' ? 'รอจ่ายยา' : 'จ่ายยาแล้ว'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => { setSelectedPrescription(px); setShowModal(true); }}
                                            className="btn-secondary btn-sm"
                                        >
                                            <Eye className="w-4 h-4 mr-1" />
                                            รายละเอียด
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/View Modal */}
            {showModal && (
                <PrescriptionModal
                    prescription={selectedPrescription}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
                    }}
                />
            )}
        </div>
    );
}

function PrescriptionModal({
    prescription,
    onClose,
    onSuccess,
}: {
    prescription: any;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [items, setItems] = useState<any[]>(prescription?.items || [{ drugName: '', quantity: 1, dosage: '', frequency: '' }]);
    const [formData, setFormData] = useState({
        patientName: prescription?.patientName || '',
        patientPhone: prescription?.patientPhone || '',
        doctorName: prescription?.doctorName || '',
        hospitalName: prescription?.hospitalName || '',
        prescriptionDate: prescription?.prescriptionDate ? new Date(prescription.prescriptionDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => apiService.api.post('/prescriptions', data),
        onSuccess: () => {
            toast.success('สร้างใบสั่งยาสำเร็จ');
            onSuccess();
        },
        onError: (err: any) => toast.error(err.response?.data?.error?.message || 'เกิดข้อผิดพลาด'),
    });

    const dispenseMutation = useMutation({
        mutationFn: (id: string) => apiService.api.post(`/prescriptions/${id}/dispense`),
        onSuccess: () => {
            toast.success('บันทึกการจ่ายยาสำเร็จ');
            onSuccess();
        },
        onError: () => toast.error('เกิดข้อผิดพลาด'),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prescription) return; // View mode only for now

        createMutation.mutate({
            ...formData,
            items: items.map(item => ({
                ...item,
                quantity: parseInt(item.quantity)
            }))
        });
    };

    const addItem = () => {
        setItems([...items, { drugName: '', quantity: 1, dosage: '', frequency: '' }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const isReadOnly = !!prescription;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {prescription ? `รายละเอียดใบสั่งยา ${prescription.prescriptionNo}` : 'สร้างใบสั่งยาใหม่'}
                        </h2>
                        {prescription && (
                            <span className={clsx('badge mt-1', {
                                'badge-warning': prescription.status === 'PENDING',
                                'badge-success': prescription.status === 'DISPENSED',
                            })}>
                                {prescription.status === 'PENDING' ? 'รอจ่ายยา' : 'จ่ายยาแล้ว'}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Patient Info */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">ชื่อผู้ป่วย *</label>
                            <input
                                type="text"
                                required
                                readOnly={isReadOnly}
                                className="input"
                                value={formData.patientName}
                                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">เบอร์โทรศัพท์</label>
                            <input
                                type="tel"
                                readOnly={isReadOnly}
                                className="input"
                                value={formData.patientPhone}
                                onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">ชื่อแพทย์</label>
                            <input
                                type="text"
                                readOnly={isReadOnly}
                                className="input"
                                value={formData.doctorName}
                                onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">โรงพยาบาล/คลินิก</label>
                            <input
                                type="text"
                                readOnly={isReadOnly}
                                className="input"
                                value={formData.hospitalName}
                                onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">วันที่สั่งยา</label>
                            <input
                                type="datetime-local"
                                readOnly={isReadOnly}
                                className="input"
                                value={formData.prescriptionDate}
                                onChange={(e) => setFormData({ ...formData, prescriptionDate: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="label mb-0">รายการยา *</label>
                            {!isReadOnly && (
                                <button type="button" onClick={addItem} className="text-primary-600 text-sm font-medium hover:underline">
                                    + เพิ่มรายการ
                                </button>
                            )}
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={index} className="flex gap-3 items-start bg-gray-50 p-3 rounded-xl">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                placeholder="ชื่อยา/ตัวยาสำคัญ"
                                                required
                                                readOnly={isReadOnly}
                                                className="input"
                                                value={item.drugName}
                                                onChange={(e) => updateItem(index, 'drugName', e.target.value)}
                                            />
                                            <input
                                                type="number"
                                                placeholder="จำนวน"
                                                required
                                                min="1"
                                                readOnly={isReadOnly}
                                                className="input w-24"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                placeholder="ขนาดวิธีใช้ (เช่น 1 เม็ด หลังอาหาร)"
                                                readOnly={isReadOnly}
                                                className="input flex-1"
                                                value={item.dosage}
                                                onChange={(e) => updateItem(index, 'dosage', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                placeholder="ความถี่ (เช่น เช้า-เย็น)"
                                                readOnly={isReadOnly}
                                                className="input flex-1"
                                                value={item.frequency}
                                                onChange={(e) => updateItem(index, 'frequency', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    {!isReadOnly && items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="text-danger-500 hover:text-danger-700 p-2"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary">
                            ปิด
                        </button>
                        {isReadOnly ? (
                            prescription.status === 'PENDING' && (
                                <button
                                    type="button"
                                    onClick={() => dispenseMutation.mutate(prescription.id)}
                                    disabled={dispenseMutation.isPending}
                                    className="flex-1 btn-success"
                                >
                                    {dispenseMutation.isPending ? (
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    ) : (
                                        <>
                                            <CheckCircle className="w-5 h-5 mr-2" />
                                            บันทึกการจ่ายยา
                                        </>
                                    )}
                                </button>
                            )
                        ) : (
                            <button
                                type="submit"
                                disabled={createMutation.isPending}
                                className="flex-1 btn-primary"
                            >
                                {createMutation.isPending ? (
                                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                ) : (
                                    'บันทึกใบสั่งยา'
                                )}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
