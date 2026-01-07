import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const supplierSchema = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    taxId: z.string().optional(),
    contactPerson: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    supplierType: z.enum(['GENERAL', 'OEM', 'IMPORTER', 'DISTRIBUTOR']).default('GENERAL'),
    paymentTerms: z.number().int().positive().default(30),
    creditLimit: z.number().optional(),
    isVatRegistered: z.boolean().default(true)
});

// GET /api/suppliers - List suppliers
router.get('/', async (req: AuthRequest, res) => {
    const { search, type, isActive = 'true' } = req.query;

    const where: any = { organizationId: req.user!.organizationId };
    if (search) {
        where.OR = [
            { name: { contains: search as string, mode: 'insensitive' } },
            { code: { contains: search as string, mode: 'insensitive' } }
        ];
    }
    if (type) where.supplierType = type;
    if (isActive) where.isActive = isActive === 'true';

    const suppliers = await prisma.supplier.findMany({
        where,
        include: { _count: { select: { products: true, purchases: true } } },
        orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: suppliers });
});

// GET /api/suppliers/:id
router.get('/:id', async (req: AuthRequest, res) => {
    const supplier = await prisma.supplier.findFirst({
        where: { id: req.params.id, organizationId: req.user!.organizationId },
        include: { products: { take: 10 }, purchases: { take: 10, orderBy: { orderDate: 'desc' } } }
    });
    if (!supplier) throw ApiError.notFound('ไม่พบผู้จำหน่าย');
    res.json({ success: true, data: supplier });
});

// POST /api/suppliers
router.post('/', authorize('CEO', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    const validation = supplierSchema.safeParse(req.body);
    if (!validation.success) throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);

    const existing = await prisma.supplier.findFirst({
        where: { organizationId: req.user!.organizationId, code: validation.data.code }
    });
    if (existing) throw ApiError.conflict('รหัสผู้จำหน่ายซ้ำ');

    const supplier = await prisma.supplier.create({
        data: { ...validation.data, organizationId: req.user!.organizationId }
    });

    res.status(201).json({ success: true, data: supplier, message: 'สร้างผู้จำหน่ายสำเร็จ' });
});

// PUT /api/suppliers/:id
router.put('/:id', authorize('CEO', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    const supplier = await prisma.supplier.findFirst({
        where: { id: req.params.id, organizationId: req.user!.organizationId }
    });
    if (!supplier) throw ApiError.notFound('ไม่พบผู้จำหน่าย');

    const updated = await prisma.supplier.update({
        where: { id: supplier.id },
        data: req.body
    });

    res.json({ success: true, data: updated, message: 'อัพเดตผู้จำหน่ายสำเร็จ' });
});

// DELETE /api/suppliers/:id
router.delete('/:id', authorize('CEO'), async (req: AuthRequest, res) => {
    await prisma.supplier.update({
        where: { id: req.params.id },
        data: { isActive: false }
    });
    res.json({ success: true, message: 'ลบผู้จำหน่ายสำเร็จ' });
});

export default router;
