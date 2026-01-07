import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Get all returns
router.get('/', authenticate, async (req, res) => {
    try {
        const { branchId, status, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {};

        if (req.user!.role !== 'CEO') {
            where.sale = { branchId: req.user!.branchId };
        } else if (branchId) {
            where.sale = { branchId: branchId as string };
        }

        if (status) where.status = status;

        const [returns, total] = await Promise.all([
            prisma.saleReturn.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' },
                include: {
                    sale: {
                        select: { id: true, invoiceNumber: true, branch: { select: { id: true, name: true } } }
                    },
                    items: {
                        include: {
                            product: { select: { id: true, name: true, sku: true } }
                        }
                    },
                },
            }),
            prisma.saleReturn.count({ where }),
        ]);

        res.json({
            success: true,
            data: returns,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        console.error('Get returns error:', error);
        res.status(500).json({ success: false, error: { message: 'เกิดข้อผิดพลาด' } });
    }
});

// Get single return
router.get('/:id', authenticate, async (req, res) => {
    try {
        const saleReturn = await prisma.saleReturn.findUnique({
            where: { id: req.params.id },
            include: {
                sale: {
                    include: {
                        branch: { select: { id: true, name: true } },
                        customer: { select: { id: true, name: true } },
                    }
                },
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true } },
                        batch: { select: { id: true, batchNumber: true, expiryDate: true } },
                    }
                },
            },
        });

        if (!saleReturn) {
            return res.status(404).json({ success: false, error: { message: 'ไม่พบข้อมูลการคืนสินค้า' } });
        }

        res.json({ success: true, data: saleReturn });
    } catch (error) {
        console.error('Get return error:', error);
        res.status(500).json({ success: false, error: { message: 'เกิดข้อผิดพลาด' } });
    }
});

// Create return from sale
router.post('/', authenticate, async (req, res) => {
    try {
        const { saleId, reason, items } = req.body;
        // items: [{ saleItemId, productId, batchId, quantity, reason }]

        // Validate sale exists
        const sale = await prisma.sale.findFirst({
            where: { id: saleId },
            include: { items: true },
        });

        if (!sale) {
            return res.status(404).json({ success: false, error: { message: 'ไม่พบใบขาย' } });
        }

        // Generate return number
        const today = new Date();
        const prefix = `RET${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
        const lastReturn = await prisma.saleReturn.findFirst({
            where: { returnNumber: { startsWith: prefix } },
            orderBy: { returnNumber: 'desc' },
        });
        const seq = lastReturn
            ? String(parseInt(lastReturn.returnNumber.slice(-4)) + 1).padStart(4, '0')
            : '0001';
        const returnNumber = `${prefix}${seq}`;

        // Calculate refund amount
        let refundAmount = 0;
        const returnItems = items.map((item: any) => {
            const saleItem = sale.items.find((si: any) => si.id === item.saleItemId || si.productId === item.productId);
            const unitPrice = saleItem ? Number(saleItem.unitPrice) : 0;
            const itemTotal = unitPrice * item.quantity;
            refundAmount += itemTotal;

            return {
                productId: item.productId,
                batchId: item.batchId,
                quantity: item.quantity,
                unitPrice,
                totalPrice: itemTotal,
                reason: item.reason,
            };
        });

        // Create return with items
        const saleReturn = await prisma.saleReturn.create({
            data: {
                saleId,
                returnNumber,
                returnDate: new Date(),
                reason,
                status: 'PENDING',
                refundAmount,
                items: {
                    create: returnItems,
                },
            },
            include: {
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true } },
                    }
                },
            },
        });

        res.status(201).json({ success: true, data: saleReturn });
    } catch (error) {
        console.error('Create return error:', error);
        res.status(500).json({ success: false, error: { message: 'เกิดข้อผิดพลาด' } });
    }
});

// Approve return (add back to inventory)
router.post('/:id/approve', authenticate, authorize(['CEO', 'BRANCH_MANAGER']), async (req, res) => {
    try {
        const saleReturn = await prisma.saleReturn.findUnique({
            where: { id: req.params.id },
            include: {
                items: true,
                sale: true,
            },
        });

        if (!saleReturn) {
            return res.status(404).json({ success: false, error: { message: 'ไม่พบข้อมูลการคืนสินค้า' } });
        }

        if (saleReturn.status !== 'PENDING') {
            return res.status(400).json({ success: false, error: { message: 'สถานะไม่ถูกต้อง' } });
        }

        // Update return status
        await prisma.saleReturn.update({
            where: { id: req.params.id },
            data: {
                status: 'APPROVED',
                approvedAt: new Date(),
                approvedBy: req.user!.id,
            },
        });

        // Add items back to inventory
        for (const item of saleReturn.items) {
            // Update VAT inventory
            await prisma.inventoryVat.updateMany({
                where: {
                    branchId: saleReturn.sale.branchId,
                    productId: item.productId,
                    batchId: item.batchId,
                },
                data: {
                    quantity: { increment: item.quantity },
                },
            });

            // Create stock movement
            if (item.batchId) {
                await prisma.stockMovement.create({
                    data: {
                        branchId: saleReturn.sale.branchId,
                        batchId: item.batchId,
                        movementType: 'RETURN_IN',
                        quantity: item.quantity,
                        referenceType: 'RETURN',
                        referenceId: saleReturn.id,
                        notes: `คืนสินค้าจากใบขาย ${saleReturn.sale.invoiceNumber}`,
                        createdBy: req.user!.id,
                    },
                });
            }
        }

        res.json({ success: true, message: 'อนุมัติการคืนสินค้าสำเร็จ' });
    } catch (error) {
        console.error('Approve return error:', error);
        res.status(500).json({ success: false, error: { message: 'เกิดข้อผิดพลาด' } });
    }
});

// Reject return
router.post('/:id/reject', authenticate, authorize(['CEO', 'BRANCH_MANAGER']), async (req, res) => {
    try {
        const { reason } = req.body;

        const saleReturn = await prisma.saleReturn.findUnique({
            where: { id: req.params.id },
        });

        if (!saleReturn) {
            return res.status(404).json({ success: false, error: { message: 'ไม่พบข้อมูล' } });
        }

        await prisma.saleReturn.update({
            where: { id: req.params.id },
            data: {
                status: 'REJECTED',
                notes: reason,
            },
        });

        res.json({ success: true, message: 'ปฏิเสธการคืนสินค้าสำเร็จ' });
    } catch (error) {
        console.error('Reject return error:', error);
        res.status(500).json({ success: false, error: { message: 'เกิดข้อผิดพลาด' } });
    }
});

export default router;
