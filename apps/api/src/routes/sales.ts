import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';
import { io } from '../index.js';

const router = Router();

router.use(authenticate);

// Validation schemas
const saleItemSchema = z.object({
    productId: z.string().uuid(),
    batchId: z.string().uuid().optional(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative(),
    discount: z.number().nonnegative().default(0),
    isVat: z.boolean().default(true),
    vatRate: z.number().min(0).max(100).default(7)
});

const saleSchema = z.object({
    branchId: z.string().uuid(),
    customerId: z.string().uuid().optional(),
    distributorId: z.string().uuid().optional(),
    saleType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']).default('RETAIL'),
    items: z.array(saleItemSchema).min(1),
    discountAmount: z.number().nonnegative().default(0),
    paymentMethod: z.enum(['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'QR_PAYMENT', 'CREDIT']).default('CASH'),
    amountPaid: z.number().nonnegative(),
    isVatInvoice: z.boolean().default(false),
    notes: z.string().optional()
});

// Helper to generate invoice number
const generateInvoiceNumber = async (branchCode: string): Promise<string> => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `INV-${branchCode}-${dateStr}`;

    const lastSale = await prisma.sale.findFirst({
        where: { invoiceNumber: { startsWith: prefix } },
        orderBy: { invoiceNumber: 'desc' }
    });

    let sequence = 1;
    if (lastSale) {
        const lastSeq = parseInt(lastSale.invoiceNumber.split('-').pop() || '0');
        sequence = lastSeq + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
};

// GET /api/sales - List sales
router.get('/', async (req: AuthRequest, res) => {
    const {
        branchId,
        customerId,
        distributorId,
        saleType,
        status,
        paymentStatus,
        startDate,
        endDate,
        search,
        page = '1',
        limit = '20'
    } = req.query;

    const where: any = {};

    if (branchId) {
        where.branchId = branchId;
    } else if (req.user!.branchId) {
        where.branchId = req.user!.branchId;
    }

    if (customerId) where.customerId = customerId;
    if (distributorId) where.distributorId = distributorId;
    if (saleType) where.saleType = saleType;
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    if (search) {
        where.invoiceNumber = { contains: search as string, mode: 'insensitive' };
    }

    if (startDate || endDate) {
        where.saleDate = {};
        if (startDate) where.saleDate.gte = new Date(startDate as string);
        if (endDate) where.saleDate.lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [sales, total] = await Promise.all([
        prisma.sale.findMany({
            where,
            include: {
                branch: true,
                customer: true,
                distributor: true,
                user: {
                    select: { id: true, firstName: true, lastName: true }
                },
                _count: { select: { items: true } }
            },
            orderBy: { saleDate: 'desc' },
            skip,
            take
        }),
        prisma.sale.count({ where })
    ]);

    res.json({
        success: true,
        data: sales,
        pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages: Math.ceil(total / take)
        }
    });
});

// GET /api/sales/:id - Get sale by ID
router.get('/:id', async (req: AuthRequest, res) => {
    const sale = await prisma.sale.findFirst({
        where: { id: req.params.id },
        include: {
            branch: true,
            customer: true,
            distributor: true,
            user: {
                select: { id: true, firstName: true, lastName: true }
            },
            items: {
                include: {
                    product: true,
                    batch: true
                }
            },
            payments: true
        }
    });

    if (!sale) {
        throw ApiError.notFound('ไม่พบใบขาย');
    }

    res.json({
        success: true,
        data: sale
    });
});

// POST /api/sales - Create new sale (POS)
router.post('/', async (req: AuthRequest, res) => {
    const validation = saleSchema.safeParse(req.body);

    if (!validation.success) {
        throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);
    }

    const saleData = validation.data;

    // Get branch
    const branch = await prisma.branch.findFirst({
        where: {
            id: saleData.branchId,
            organizationId: req.user!.organizationId
        }
    });

    if (!branch) {
        throw ApiError.notFound('ไม่พบสาขา');
    }

    const sale = await prisma.$transaction(async (tx) => {
        // Calculate totals
        let subtotal = 0;
        let totalVatAmount = 0;
        const processedItems: any[] = [];

        for (const item of saleData.items) {
            const product = await tx.product.findUnique({
                where: { id: item.productId }
            });

            if (!product) {
                throw ApiError.notFound(`ไม่พบสินค้า ${item.productId}`);
            }

            // Get batch with FEFO (First Expiry First Out) if not specified
            let batch = item.batchId
                ? await tx.productBatch.findUnique({ where: { id: item.batchId } })
                : await tx.productBatch.findFirst({
                    where: {
                        productId: item.productId,
                        quantity: { gte: item.quantity },
                        isActive: true
                    },
                    orderBy: { expiryDate: 'asc' }
                });

            if (!batch) {
                throw ApiError.badRequest(`สินค้า ${product.name} มีจำนวนไม่เพียงพอ`);
            }

            // Check inventory
            if (item.isVat) {
                const inventory = await tx.inventoryVat.findUnique({
                    where: {
                        branchId_productId_batchId: {
                            branchId: saleData.branchId,
                            productId: item.productId,
                            batchId: batch.id
                        }
                    }
                });

                if (!inventory || inventory.quantity < item.quantity) {
                    throw ApiError.badRequest(`สินค้า ${product.name} ในคลัง VAT มีไม่เพียงพอ`);
                }

                // Deduct inventory
                await tx.inventoryVat.update({
                    where: { id: inventory.id },
                    data: { quantity: { decrement: item.quantity } }
                });
            } else {
                const inventory = await tx.inventoryNonVat.findUnique({
                    where: {
                        branchId_productId_batchId: {
                            branchId: saleData.branchId,
                            productId: item.productId,
                            batchId: batch.id
                        }
                    }
                });

                if (!inventory || inventory.quantity < item.quantity) {
                    throw ApiError.badRequest(`สินค้า ${product.name} ในคลัง Non-VAT มีไม่เพียงพอ`);
                }

                await tx.inventoryNonVat.update({
                    where: { id: inventory.id },
                    data: { quantity: { decrement: item.quantity } }
                });
            }

            // Calculate item totals
            const itemTotal = (item.unitPrice * item.quantity) - item.discount;
            const itemVat = item.isVat ? itemTotal * (item.vatRate / 100) : 0;

            subtotal += itemTotal;
            totalVatAmount += itemVat;

            // Deduct batch quantity
            await tx.productBatch.update({
                where: { id: batch.id },
                data: { quantity: { decrement: item.quantity } }
            });

            // Create stock movement
            await tx.stockMovement.create({
                data: {
                    branchId: saleData.branchId,
                    batchId: batch.id,
                    movementType: 'OUT',
                    quantity: item.quantity,
                    referenceType: 'SALE',
                    notes: `ขายสินค้า`,
                    createdBy: req.user!.id
                }
            });

            processedItems.push({
                productId: item.productId,
                batchId: batch.id,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                vatRate: item.vatRate,
                vatAmount: itemVat,
                totalPrice: itemTotal + itemVat,
                isVat: item.isVat
            });
        }

        const totalAmount = subtotal + totalVatAmount - saleData.discountAmount;
        const changeAmount = saleData.amountPaid - totalAmount;

        if (saleData.paymentMethod !== 'CREDIT' && changeAmount < 0) {
            throw ApiError.badRequest('ยอดชำระไม่เพียงพอ');
        }

        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber(branch.code);

        // Create sale
        const newSale = await tx.sale.create({
            data: {
                branchId: saleData.branchId,
                customerId: saleData.customerId,
                distributorId: saleData.distributorId,
                userId: req.user!.id,
                invoiceNumber,
                saleType: saleData.saleType,
                status: 'COMPLETED',
                subtotal,
                discountAmount: saleData.discountAmount,
                vatAmount: totalVatAmount,
                totalAmount,
                paymentMethod: saleData.paymentMethod,
                paymentStatus: saleData.paymentMethod === 'CREDIT' ? 'PENDING' : 'PAID',
                amountPaid: saleData.amountPaid,
                changeAmount: changeAmount > 0 ? changeAmount : 0,
                isVatInvoice: saleData.isVatInvoice,
                notes: saleData.notes,
                items: {
                    create: processedItems
                }
            },
            include: {
                items: {
                    include: { product: true }
                },
                branch: true,
                customer: true
            }
        });

        // Create payment record if paid
        if (saleData.paymentMethod !== 'CREDIT') {
            await tx.payment.create({
                data: {
                    saleId: newSale.id,
                    paymentNumber: `PAY-${invoiceNumber}`,
                    paymentMethod: saleData.paymentMethod,
                    amount: totalAmount
                }
            });
        }

        return newSale;
    });

    // Emit real-time update
    io?.to(`branch-${sale.branchId}`).emit('sale:created', {
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        totalAmount: sale.totalAmount
    });

    res.status(201).json({
        success: true,
        data: sale,
        message: 'บันทึกการขายสำเร็จ'
    });
});

// POST /api/sales/:id/cancel - Cancel sale
router.post('/:id/cancel', authorize('CEO', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    const { reason } = req.body;

    const sale = await prisma.sale.findUnique({
        where: { id: req.params.id },
        include: { items: true }
    });

    if (!sale) {
        throw ApiError.notFound('ไม่พบใบขาย');
    }

    if (sale.status === 'CANCELLED') {
        throw ApiError.badRequest('ใบขายนี้ถูกยกเลิกแล้ว');
    }

    await prisma.$transaction(async (tx) => {
        // Return items to inventory
        for (const item of sale.items) {
            if (item.batchId) {
                if (item.isVat) {
                    await tx.inventoryVat.update({
                        where: {
                            branchId_productId_batchId: {
                                branchId: sale.branchId,
                                productId: item.productId,
                                batchId: item.batchId
                            }
                        },
                        data: { quantity: { increment: item.quantity } }
                    });
                } else {
                    await tx.inventoryNonVat.update({
                        where: {
                            branchId_productId_batchId: {
                                branchId: sale.branchId,
                                productId: item.productId,
                                batchId: item.batchId
                            }
                        },
                        data: { quantity: { increment: item.quantity } }
                    });
                }

                // Return to batch
                await tx.productBatch.update({
                    where: { id: item.batchId },
                    data: { quantity: { increment: item.quantity } }
                });

                // Create return movement
                await tx.stockMovement.create({
                    data: {
                        branchId: sale.branchId,
                        batchId: item.batchId,
                        movementType: 'RETURN_IN',
                        quantity: item.quantity,
                        referenceType: 'SALE_CANCEL',
                        referenceId: sale.id,
                        notes: `ยกเลิกใบขาย: ${reason || 'ไม่ระบุเหตุผล'}`,
                        createdBy: req.user!.id
                    }
                });
            }
        }

        // Update sale status
        await tx.sale.update({
            where: { id: sale.id },
            data: { status: 'CANCELLED' }
        });
    });

    res.json({
        success: true,
        message: 'ยกเลิกใบขายสำเร็จ'
    });
});

// GET /api/sales/daily-summary - Get daily sales summary
router.get('/summary/daily', async (req: AuthRequest, res) => {
    const { branchId, date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const where: any = {
        saleDate: { gte: startOfDay, lte: endOfDay },
        status: { not: 'CANCELLED' }
    };

    if (branchId) {
        where.branchId = branchId;
    } else if (req.user!.branchId) {
        where.branchId = req.user!.branchId;
    }

    const sales = await prisma.sale.findMany({
        where,
        include: {
            items: true
        }
    });

    const summary = {
        totalSales: sales.length,
        totalAmount: sales.reduce((sum, s) => sum + parseFloat(s.totalAmount.toString()), 0),
        totalVat: sales.reduce((sum, s) => sum + parseFloat(s.vatAmount.toString()), 0),
        totalDiscount: sales.reduce((sum, s) => sum + parseFloat(s.discountAmount.toString()), 0),
        byPaymentMethod: {} as Record<string, { count: number; amount: number }>,
        bySaleType: {} as Record<string, { count: number; amount: number }>
    };

    for (const sale of sales) {
        // By payment method
        if (!summary.byPaymentMethod[sale.paymentMethod]) {
            summary.byPaymentMethod[sale.paymentMethod] = { count: 0, amount: 0 };
        }
        summary.byPaymentMethod[sale.paymentMethod].count++;
        summary.byPaymentMethod[sale.paymentMethod].amount += parseFloat(sale.totalAmount.toString());

        // By sale type
        if (!summary.bySaleType[sale.saleType]) {
            summary.bySaleType[sale.saleType] = { count: 0, amount: 0 };
        }
        summary.bySaleType[sale.saleType].count++;
        summary.bySaleType[sale.saleType].amount += parseFloat(sale.totalAmount.toString());
    }

    res.json({
        success: true,
        data: summary
    });
});

export default router;
