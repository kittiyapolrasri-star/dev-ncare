import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

// Generate OEM order number
const generateOemOrderNumber = async (): Promise<string> => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `OEM-${dateStr}`;

    const lastOrder = await prisma.oemOrder.findFirst({
        where: { orderNumber: { startsWith: prefix } },
        orderBy: { orderNumber: 'desc' }
    });

    let sequence = 1;
    if (lastOrder) {
        const lastSeq = parseInt(lastOrder.orderNumber.split('-').pop() || '0');
        sequence = lastSeq + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
};

// GET /api/oem/orders - List OEM orders
router.get('/orders', async (req: AuthRequest, res) => {
    const { status, supplierId, startDate, endDate, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (startDate || endDate) {
        where.orderDate = {};
        if (startDate) where.orderDate.gte = new Date(startDate as string);
        if (endDate) where.orderDate.lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [orders, total] = await Promise.all([
        prisma.oemOrder.findMany({
            where,
            include: {
                supplier: true,
                items: { include: { product: true } },
                _count: { select: { goodsReceiving: true } }
            },
            orderBy: { orderDate: 'desc' },
            skip,
            take
        }),
        prisma.oemOrder.count({ where })
    ]);

    res.json({
        success: true,
        data: orders,
        pagination: { page: parseInt(page as string), limit: take, total, totalPages: Math.ceil(total / take) }
    });
});

// GET /api/oem/orders/:id
router.get('/orders/:id', async (req: AuthRequest, res) => {
    const order = await prisma.oemOrder.findUnique({
        where: { id: req.params.id },
        include: {
            supplier: true,
            items: { include: { product: true } },
            goodsReceiving: { include: { items: true } }
        }
    });

    if (!order) throw ApiError.notFound('ไม่พบคำสั่งผลิต OEM');
    res.json({ success: true, data: order });
});

// POST /api/oem/orders - Create OEM order
router.post('/orders', authorize('CEO', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    const orderSchema = z.object({
        supplierId: z.string().uuid(),
        expectedDate: z.string().datetime().optional(),
        notes: z.string().optional(),
        items: z.array(z.object({
            productId: z.string().uuid(),
            quantity: z.number().int().positive(),
            unitPrice: z.number().nonnegative()
        })).min(1)
    });

    const validation = orderSchema.safeParse(req.body);
    if (!validation.success) throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);

    const { supplierId, expectedDate, notes, items } = validation.data;

    // Verify supplier is OEM type
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw ApiError.notFound('ไม่พบผู้ผลิต OEM');
    if (supplier.supplierType !== 'OEM') throw ApiError.badRequest('ผู้จำหน่ายนี้ไม่ใช่ประเภท OEM');

    const orderNumber = await generateOemOrderNumber();
    const totalAmount = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);

    const order = await prisma.oemOrder.create({
        data: {
            supplierId,
            orderNumber,
            expectedDate: expectedDate ? new Date(expectedDate) : undefined,
            notes,
            totalAmount,
            items: {
                create: items.map(i => ({
                    productId: i.productId,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    totalPrice: i.quantity * i.unitPrice
                }))
            }
        },
        include: { supplier: true, items: { include: { product: true } } }
    });

    res.status(201).json({ success: true, data: order, message: 'สร้างคำสั่งผลิต OEM สำเร็จ' });
});

// PUT /api/oem/orders/:id/status - Update OEM order status
router.put('/orders/:id/status', authorize('CEO', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    const { status } = req.body;
    const validStatuses = ['DRAFT', 'SENT', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'RECEIVED', 'CANCELLED'];

    if (!validStatuses.includes(status)) {
        throw ApiError.badRequest('สถานะไม่ถูกต้อง');
    }

    const order = await prisma.oemOrder.update({
        where: { id: req.params.id },
        data: { status }
    });

    res.json({ success: true, data: order, message: 'อัพเดตสถานะสำเร็จ' });
});

// POST /api/oem/orders/:id/receive - Receive OEM order goods
router.post('/orders/:id/receive', authorize('CEO', 'BRANCH_MANAGER', 'PHARMACIST'), async (req: AuthRequest, res) => {
    const receiveSchema = z.object({
        branchId: z.string().uuid(),
        items: z.array(z.object({
            productId: z.string().uuid(),
            batchNumber: z.string(),
            lotNumber: z.string().optional(),
            expiryDate: z.string().datetime(),
            receivedQty: z.number().int().positive(),
            acceptedQty: z.number().int().nonnegative(),
            rejectedQty: z.number().int().nonnegative().default(0),
            isVat: z.boolean().default(true),
            notes: z.string().optional()
        }))
    });

    const validation = receiveSchema.safeParse(req.body);
    if (!validation.success) throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);

    const order = await prisma.oemOrder.findUnique({
        where: { id: req.params.id },
        include: { items: true }
    });

    if (!order) throw ApiError.notFound('ไม่พบคำสั่งผลิต OEM');

    const { branchId, items } = validation.data;

    // Generate GR number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const grCount = await prisma.goodsReceiving.count({ where: { grNumber: { startsWith: `GR-${dateStr}` } } });
    const grNumber = `GR-${dateStr}-${(grCount + 1).toString().padStart(4, '0')}`;

    const goodsReceiving = await prisma.$transaction(async (tx) => {
        // Create goods receiving record
        const gr = await tx.goodsReceiving.create({
            data: {
                branchId,
                oemOrderId: order.id,
                grNumber,
                status: 'APPROVED',
                items: {
                    create: items.map(i => {
                        const orderItem = order.items.find(oi => oi.productId === i.productId);
                        return {
                            productId: i.productId,
                            batchNumber: i.batchNumber,
                            lotNumber: i.lotNumber,
                            expiryDate: new Date(i.expiryDate),
                            orderedQty: orderItem?.quantity || i.receivedQty,
                            receivedQty: i.receivedQty,
                            acceptedQty: i.acceptedQty,
                            rejectedQty: i.rejectedQty,
                            unitPrice: orderItem?.unitPrice || 0,
                            isVat: i.isVat,
                            notes: i.notes
                        };
                    })
                }
            }
        });

        // Update inventory for each item
        for (const item of items) {
            if (item.acceptedQty > 0) {
                const orderItem = order.items.find(oi => oi.productId === item.productId);
                const unitPrice = parseFloat(orderItem?.unitPrice.toString() || '0');

                // Create/update batch
                let batch = await tx.productBatch.findFirst({
                    where: { productId: item.productId, batchNumber: item.batchNumber }
                });

                if (!batch) {
                    batch = await tx.productBatch.create({
                        data: {
                            productId: item.productId,
                            batchNumber: item.batchNumber,
                            lotNumber: item.lotNumber,
                            expiryDate: new Date(item.expiryDate),
                            quantity: item.acceptedQty,
                            costPrice: unitPrice
                        }
                    });
                } else {
                    await tx.productBatch.update({
                        where: { id: batch.id },
                        data: { quantity: { increment: item.acceptedQty } }
                    });
                }

                // Add to inventory
                if (item.isVat) {
                    const vatRate = 7;
                    const vatAmount = unitPrice * (vatRate / 100);
                    const costWithVat = unitPrice + vatAmount;

                    const existing = await tx.inventoryVat.findUnique({
                        where: { branchId_productId_batchId: { branchId, productId: item.productId, batchId: batch.id } }
                    });

                    if (existing) {
                        await tx.inventoryVat.update({
                            where: { id: existing.id },
                            data: { quantity: { increment: item.acceptedQty } }
                        });
                    } else {
                        await tx.inventoryVat.create({
                            data: {
                                branchId, productId: item.productId, batchId: batch.id,
                                quantity: item.acceptedQty, costBeforeVat: unitPrice,
                                vatRate, vatAmount, costWithVat
                            }
                        });
                    }
                } else {
                    const product = await tx.product.findUnique({ where: { id: item.productId } });
                    const sellingPrice = parseFloat(product?.sellingPrice.toString() || '0') || unitPrice * 1.3;

                    const existing = await tx.inventoryNonVat.findUnique({
                        where: { branchId_productId_batchId: { branchId, productId: item.productId, batchId: batch.id } }
                    });

                    if (existing) {
                        await tx.inventoryNonVat.update({
                            where: { id: existing.id },
                            data: { quantity: { increment: item.acceptedQty } }
                        });
                    } else {
                        await tx.inventoryNonVat.create({
                            data: {
                                branchId, productId: item.productId, batchId: batch.id,
                                quantity: item.acceptedQty, costPrice: unitPrice, sellingPrice
                            }
                        });
                    }
                }

                // Stock movement
                await tx.stockMovement.create({
                    data: {
                        branchId, batchId: batch.id, movementType: 'IN', quantity: item.acceptedQty,
                        referenceType: 'OEM_RECEIVING', referenceId: gr.id,
                        notes: `รับสินค้าจาก OEM Order: ${order.orderNumber}`,
                        createdBy: req.user!.id
                    }
                });

                // Update OEM order item received qty
                if (orderItem) {
                    await tx.oemOrderItem.update({
                        where: { id: orderItem.id },
                        data: { receivedQty: { increment: item.acceptedQty } }
                    });
                }
            }
        }

        // Check if all items received
        const updatedOrder = await tx.oemOrder.findUnique({
            where: { id: order.id },
            include: { items: true }
        });

        const allReceived = updatedOrder?.items.every(i => i.receivedQty >= i.quantity);
        if (allReceived) {
            await tx.oemOrder.update({
                where: { id: order.id },
                data: { status: 'RECEIVED' }
            });
        }

        return gr;
    });

    res.status(201).json({ success: true, data: goodsReceiving, message: 'รับสินค้า OEM สำเร็จ' });
});

export default router;
