import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Validation schema for generating e-tax
const generateETaxSchema = z.object({
    saleId: z.string().uuid(),
    customerName: z.string().min(1),
    customerTaxId: z.string().min(13).max(13),
    customerBranch: z.string().default('00000'),
    customerAddress: z.string().optional(),
    customerEmail: z.string().email().optional(),
    customerPhone: z.string().optional(),
});

// Get all e-tax invoices
router.get('/', authenticate, async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {};
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { invoiceNumber: { contains: search as string, mode: 'insensitive' } },
                { customerName: { contains: search as string, mode: 'insensitive' } },
                { customerTaxId: { contains: search as string } },
            ];
        }

        const [invoices, total] = await Promise.all([
            prisma.eTaxInvoice.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' },
                include: {
                    sale: {
                        select: {
                            invoiceNumber: true,
                            totalAmount: true,
                        }
                    }
                }
            }),
            prisma.eTaxInvoice.count({ where }),
        ]);

        res.json({
            success: true,
            data: invoices,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        console.error('Get e-tax invoices error:', error);
        res.status(500).json({ success: false, error: { message: 'เกิดข้อผิดพลาด' } });
    }
});

// Generate E-Tax Invoice
router.post('/generate', authenticate, async (req, res) => {
    try {
        const data = generateETaxSchema.parse(req.body);

        // Check if sale exists and doesn't have e-tax yet
        const sale = await prisma.sale.findUnique({
            where: { id: data.saleId },
            include: {
                etaxInvoice: true
            }
        });

        if (!sale) {
            return res.status(404).json({ success: false, error: { message: 'ไม่พบข้อมูลการขาย' } });
        }

        if (sale.etaxInvoice) {
            return res.status(400).json({ success: false, error: { message: 'ใบกำกับภาษีอิเล็กทรอนิกส์ถูกออกไปแล้ว' } });
        }

        // Generate e-tax invoice number
        // Format: TAX-YYYYMM-XXXX
        const today = new Date();
        const prefix = `TAX-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
        const lastInvoice = await prisma.eTaxInvoice.findFirst({
            where: { invoiceNumber: { startsWith: prefix } },
            orderBy: { invoiceNumber: 'desc' },
        });
        const seq = lastInvoice
            ? String(parseInt(lastInvoice.invoiceNumber.split('-')[2]) + 1).padStart(4, '0')
            : '0001';
        const invoiceNumber = `${prefix}-${seq}`;

        // Simulate XML/PDF generation
        const mockXmlUrl = `https://api.pharmacare.com/etax/xml/${invoiceNumber}.xml`;
        const mockPdfUrl = `https://api.pharmacare.com/etax/pdf/${invoiceNumber}.pdf`;

        const etaxInvoice = await prisma.eTaxInvoice.create({
            data: {
                saleId: data.saleId,
                invoiceNumber,
                customerName: data.customerName,
                customerTaxId: data.customerTaxId,
                customerBranch: data.customerBranch,
                customerAddress: data.customerAddress,
                customerEmail: data.customerEmail,
                customerPhone: data.customerPhone,
                totalAmount: sale.totalAmount,
                vatAmount: sale.vatAmount,
                amountBeforeVat: new Prisma.Decimal(Number(sale.totalAmount) - Number(sale.vatAmount)),
                status: 'GENERATED',
                xmlUrl: mockXmlUrl,
                pdfUrl: mockPdfUrl,
            },
        });

        res.status(201).json({ success: true, data: etaxInvoice });

    } catch (error) {
        console.error('Generate e-tax error:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, error: { message: 'ข้อมูลไม่ถูกต้อง', details: error.errors } });
        }
        res.status(500).json({ success: false, error: { message: 'เกิดข้อผิดพลาด' } });
    }
});

// Update Send Status (Mock Sending to RD)
router.post('/:id/send', authenticate, async (req, res) => {
    try {
        const invoice = await prisma.eTaxInvoice.findUnique({
            where: { id: req.params.id }
        });

        if (!invoice) {
            return res.status(404).json({ success: false, error: { message: 'ไม่พบใบกำกับภาษี' } });
        }

        // Mock sending process
        const updated = await prisma.eTaxInvoice.update({
            where: { id: req.params.id },
            data: {
                status: 'SENT_TO_RD',
            }
        });

        res.json({ success: true, data: updated, message: 'ส่งข้อมูลไปยังกรมสรรพากรเรียบร้อยแล้ว' });

    } catch (error) {
        console.error('Send e-tax error:', error);
        res.status(500).json({ success: false, error: { message: 'เกิดข้อผิดพลาด' } });
    }
});

import { Prisma } from '@prisma/client';

export default router;
