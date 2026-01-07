import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authenticate);

const distributorSchema = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    contactPerson: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    address: z.string().optional(),
    taxId: z.string().optional(),
    territory: z.string().optional(),
    commissionRate: z.number().min(0).max(100).default(0),
    creditLimit: z.number().optional()
});

// GET /api/distributors
router.get('/', async (req: AuthRequest, res) => {
    const { search, isActive = 'true' } = req.query;
    const where: any = { organizationId: req.user!.organizationId };

    if (search) {
        where.OR = [
            { name: { contains: search as string, mode: 'insensitive' } },
            { code: { contains: search as string, mode: 'insensitive' } },
            { territory: { contains: search as string, mode: 'insensitive' } }
        ];
    }
    if (isActive) where.isActive = isActive === 'true';

    const distributors = await prisma.distributor.findMany({
        where,
        include: { _count: { select: { sales: true } } },
        orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: distributors });
});

// GET /api/distributors/:id
router.get('/:id', async (req: AuthRequest, res) => {
    const distributor = await prisma.distributor.findFirst({
        where: { id: req.params.id, organizationId: req.user!.organizationId },
        include: {
            sales: {
                take: 20,
                orderBy: { saleDate: 'desc' },
                include: { _count: { select: { items: true } } }
            }
        }
    });
    if (!distributor) throw ApiError.notFound('ไม่พบตัวแทนจำหน่าย');

    // Calculate performance
    const totalSales = distributor.sales.reduce((sum, s) => sum + parseFloat(s.totalAmount.toString()), 0);
    const commission = totalSales * (parseFloat(distributor.commissionRate.toString()) / 100);

    res.json({
        success: true,
        data: {
            ...distributor,
            password: undefined,
            performance: { totalSales, commission, orderCount: distributor.sales.length }
        }
    });
});

// POST /api/distributors
router.post('/', authorize('CEO', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    const validation = distributorSchema.safeParse(req.body);
    if (!validation.success) throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);

    const existing = await prisma.distributor.findFirst({
        where: { organizationId: req.user!.organizationId, code: validation.data.code }
    });
    if (existing) throw ApiError.conflict('รหัสตัวแทนซ้ำ');

    const data = validation.data;
    if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
    }

    const distributor = await prisma.distributor.create({
        data: { ...data, organizationId: req.user!.organizationId }
    });

    res.status(201).json({
        success: true,
        data: { ...distributor, password: undefined },
        message: 'สร้างตัวแทนจำหน่ายสำเร็จ'
    });
});

// PUT /api/distributors/:id
router.put('/:id', authorize('CEO', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    const distributor = await prisma.distributor.findFirst({
        where: { id: req.params.id, organizationId: req.user!.organizationId }
    });
    if (!distributor) throw ApiError.notFound('ไม่พบตัวแทนจำหน่าย');

    const data = { ...req.body };
    if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
    }

    const updated = await prisma.distributor.update({
        where: { id: distributor.id },
        data
    });

    res.json({
        success: true,
        data: { ...updated, password: undefined },
        message: 'อัพเดตตัวแทนจำหน่ายสำเร็จ'
    });
});

// DELETE /api/distributors/:id
router.delete('/:id', authorize('CEO'), async (req: AuthRequest, res) => {
    await prisma.distributor.update({
        where: { id: req.params.id },
        data: { isActive: false }
    });
    res.json({ success: true, message: 'ลบตัวแทนจำหน่ายสำเร็จ' });
});

// GET /api/distributors/:id/commission - Calculate commission for period
router.get('/:id/commission', async (req: AuthRequest, res) => {
    const { startDate, endDate } = req.query;

    const distributor = await prisma.distributor.findFirst({
        where: { id: req.params.id, organizationId: req.user!.organizationId }
    });
    if (!distributor) throw ApiError.notFound('ไม่พบตัวแทนจำหน่าย');

    const where: any = {
        distributorId: distributor.id,
        status: { not: 'CANCELLED' }
    };

    if (startDate || endDate) {
        where.saleDate = {};
        if (startDate) where.saleDate.gte = new Date(startDate as string);
        if (endDate) where.saleDate.lte = new Date(endDate as string);
    }

    const sales = await prisma.sale.findMany({ where });
    const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.totalAmount.toString()), 0);
    const commission = totalSales * (parseFloat(distributor.commissionRate.toString()) / 100);

    res.json({
        success: true,
        data: {
            distributorId: distributor.id,
            name: distributor.name,
            commissionRate: distributor.commissionRate,
            totalSales,
            commission,
            salesCount: sales.length,
            period: { startDate, endDate }
        }
    });
});

export default router;
