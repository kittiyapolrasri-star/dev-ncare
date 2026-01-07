import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const purchaseSchema = z.object({
    branchId: z.string().uuid(),
    supplierId: z.string().uuid(),
    expectedDate: z.string().datetime().optional(),
    notes: z.string().optional(),
    items: z.array(z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().nonnegative(),
        vatRate: z.number().min(0).max(100).default(7)
    })).min(1)
});

// Generate PO number
const generatePoNumber = async (branchCode: string): Promise<string> => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PO-${branchCode}-${dateStr}`;

    const last = await prisma.purchase.findFirst({
        where: { poNumber: { startsWith: prefix } },
        orderBy: { poNumber: 'desc' }
    });

    let seq = 1;
    if (last) seq = parseInt(last.poNumber.split('-').pop() || '0') + 1;
    return `${prefix}-${seq.toString().padStart(4, '0')}`;
};

// GET /api/purchases
router.get('/', async (req: AuthRequest, res) => {
    const { branchId, supplierId, status, startDate, endDate, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (branchId) where.branchId = branchId;
    else if (req.user!.branchId) where.branchId = req.user!.branchId;
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;
    if (startDate || endDate) {
        where.orderDate = {};
        if (startDate) where.orderDate.gte = new Date(startDate as string);
        if (endDate) where.orderDate.lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [purchases, total] = await Promise.all([
        prisma.purchase.findMany({
            where,
            include: { supplier: true, branch: true, user: { select: { firstName: true, lastName: true } } },
            orderBy: { orderDate: 'desc' },
            skip, take
        }),
        prisma.purchase.count({ where })
    ]);

    res.json({ success: true, data: purchases, pagination: { page: parseInt(page as string), limit: take, total, totalPages: Math.ceil(total / take) } });
});

// GET /api/purchases/:id
router.get('/:id', async (req: AuthRequest, res) => {
    const purchase = await prisma.purchase.findUnique({
        where: { id: req.params.id },
        include: { supplier: true, branch: true, user: { select: { firstName: true, lastName: true } }, items: { include: { product: true } }, goodsReceiving: true }
    });
    if (!purchase) throw ApiError.notFound('ไม่พบใบสั่งซื้อ');
    res.json({ success: true, data: purchase });
});

// POST /api/purchases
router.post('/', authorize('CEO', 'BRANCH_MANAGER', 'PHARMACIST'), async (req: AuthRequest, res) => {
    const validation = purchaseSchema.safeParse(req.body);
    if (!validation.success) throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);

    const { branchId, supplierId, expectedDate, notes, items } = validation.data;

    const branch = await prisma.branch.findFirst({ where: { id: branchId, organizationId: req.user!.organizationId } });
    if (!branch) throw ApiError.notFound('ไม่พบสาขา');

    const poNumber = await generatePoNumber(branch.code);

    let subtotal = 0;
    let totalVat = 0;

    const processedItems = items.map(i => {
        const itemTotal = i.quantity * i.unitPrice;
        const vatAmount = itemTotal * (i.vatRate / 100);
        subtotal += itemTotal;
        totalVat += vatAmount;
        return { ...i, vatAmount, totalPrice: itemTotal + vatAmount };
    });

    const purchase = await prisma.purchase.create({
        data: {
            branchId, supplierId, userId: req.user!.id, poNumber,
            expectedDate: expectedDate ? new Date(expectedDate) : undefined,
            notes, subtotal, vatAmount: totalVat, totalAmount: subtotal + totalVat,
            items: { create: processedItems }
        },
        include: { supplier: true, items: { include: { product: true } } }
    });

    res.status(201).json({ success: true, data: purchase, message: 'สร้างใบสั่งซื้อสำเร็จ' });
});

// PUT /api/purchases/:id/status
router.put('/:id/status', authorize('CEO', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    const { status } = req.body;
    const validStatuses = ['DRAFT', 'PENDING', 'APPROVED', 'ORDERED', 'PARTIAL', 'RECEIVED', 'CANCELLED'];
    if (!validStatuses.includes(status)) throw ApiError.badRequest('สถานะไม่ถูกต้อง');

    const purchase = await prisma.purchase.update({ where: { id: req.params.id }, data: { status } });
    res.json({ success: true, data: purchase, message: 'อัพเดตสถานะสำเร็จ' });
});

export default router;
