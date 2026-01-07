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

// POST /api/purchases/:id/receive
router.post('/:id/receive', authorize('CEO', 'BRANCH_MANAGER', 'PHARMACIST'), async (req: AuthRequest, res) => {
    const { items } = req.body; // Array of { productId, quantity, batchNo, expiryDate ... }

    // 1. Get Purchase
    const purchase = await prisma.purchase.findUnique({
        where: { id: req.params.id },
        include: { items: true }
    });

    if (!purchase) throw ApiError.notFound('ไม่พบใบสั่งซื้อ');
    if (purchase.status === 'RECEIVED' || purchase.status === 'CANCELLED') {
        throw ApiError.badRequest('ใบสั่งซื้อนี้ถูกรับสินค้าหรือยกเลิกไปแล้ว');
    }

    // 2. Process receiving (Update Inventory)
    // For simplicity in this P priority, we assume full receive or nothing for now, 
    // but structure allows partial.

    await prisma.$transaction(async (tx: any) => {
        // Update PO status
        await tx.purchase.update({
            where: { id: purchase.id },
            data: { status: 'RECEIVED' } // Force close for now
        });

        // Add to Inventory
        for (const item of items) {
            // Find or Create ProductBatch
            // Add stock movement
            // This part requires careful logic with Inventory model
            // implementation detail omitted for brevity, assuming simple stock add for now

            // Check if product exists
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (!product) continue;

            // Create Batch
            const batch = await tx.productBatch.create({
                data: {
                    productId: item.productId,
                    batchNumber: item.batchNo || `BATCH-${Date.now()}`,
                    expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
                    costPrice: item.costPrice,
                    price: item.price || product.price, // Use new price or existing
                    quantity: item.quantity,
                    remaining: item.quantity,
                    branchId: purchase.branchId,
                    status: 'ACTIVE'
                }
            });

            // Record Stock Movement
            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    batchId: batch.id,
                    branchId: purchase.branchId,
                    type: 'PURCHASE_IN',
                    quantity: item.quantity,
                    balanceAfter: item.quantity, // New batch starts with this
                    referenceType: 'PURCHASE',
                    referenceId: purchase.id,
                    reason: 'รับสินค้าจากการสั่งซื้อ',
                    performedBy: req.user!.id
                }
            });
        }
    });

    res.json({ success: true, message: 'รับสินค้าเข้าคลังเรียบร้อยแล้ว' });
});

export default router;
