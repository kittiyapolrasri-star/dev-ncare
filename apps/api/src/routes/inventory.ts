import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { authenticate, authorize, checkBranchAccess, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const router = Router();

router.use(authenticate);

// GET /api/inventory - Get inventory by branch
router.get('/', async (req: AuthRequest, res) => {
    const {
        branchId,
        type = 'all', // 'vat', 'non-vat', 'all'
        search,
        lowStock,
        expiringSoon, // days
        page = '1',
        limit = '20'
    } = req.query;

    const targetBranchId = branchId as string || req.user!.branchId;

    if (!targetBranchId && req.user!.role !== 'CEO') {
        throw ApiError.badRequest('กรุณาระบุสาขา');
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Build where clauses
    const baseWhere: any = {};
    if (targetBranchId) {
        baseWhere.branchId = targetBranchId;
    } else {
        // CEO can see all, but filter by organization through branch
        const branches = await prisma.branch.findMany({
            where: { organization: { id: req.user!.organizationId } },
            select: { id: true }
        });
        baseWhere.branchId = { in: branches.map(b => b.id) };
    }

    if (lowStock === 'true') {
        baseWhere.quantity = { lte: prisma.raw('product.reorder_point') };
    }

    let vatInventory: any[] = [];
    let nonVatInventory: any[] = [];
    let vatTotal = 0;
    let nonVatTotal = 0;

    if (type === 'all' || type === 'vat') {
        const vatWhere = {
            ...baseWhere,
            ...(search && {
                product: {
                    OR: [
                        { name: { contains: search as string, mode: 'insensitive' as const } },
                        { sku: { contains: search as string, mode: 'insensitive' as const } }
                    ]
                }
            })
        };

        [vatInventory, vatTotal] = await Promise.all([
            prisma.inventoryVat.findMany({
                where: vatWhere,
                include: {
                    product: true,
                    batch: true,
                    branch: true
                },
                skip: type === 'vat' ? skip : 0,
                take: type === 'vat' ? take : undefined
            }),
            prisma.inventoryVat.count({ where: vatWhere })
        ]);
    }

    if (type === 'all' || type === 'non-vat') {
        const nonVatWhere = {
            ...baseWhere,
            ...(search && {
                product: {
                    OR: [
                        { name: { contains: search as string, mode: 'insensitive' as const } },
                        { sku: { contains: search as string, mode: 'insensitive' as const } }
                    ]
                }
            })
        };

        [nonVatInventory, nonVatTotal] = await Promise.all([
            prisma.inventoryNonVat.findMany({
                where: nonVatWhere,
                include: {
                    product: true,
                    batch: true,
                    branch: true
                },
                skip: type === 'non-vat' ? skip : 0,
                take: type === 'non-vat' ? take : undefined
            }),
            prisma.inventoryNonVat.count({ where: nonVatWhere })
        ]);
    }

    // Check for expiring products
    let expiringItems: any[] = [];
    if (expiringSoon) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + parseInt(expiringSoon as string));

        expiringItems = await prisma.productBatch.findMany({
            where: {
                expiryDate: { lte: expiryDate },
                isActive: true,
                quantity: { gt: 0 }
            },
            include: {
                product: true
            },
            orderBy: { expiryDate: 'asc' }
        });
    }

    res.json({
        success: true,
        data: {
            vatInventory,
            nonVatInventory,
            expiringItems,
            summary: {
                totalVatItems: vatTotal,
                totalNonVatItems: nonVatTotal,
                totalVatValue: vatInventory.reduce((sum, i) => sum + (i.quantity * parseFloat(i.costWithVat.toString())), 0),
                totalNonVatValue: nonVatInventory.reduce((sum, i) => sum + (i.quantity * parseFloat(i.costPrice.toString())), 0)
            }
        },
        pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: type === 'vat' ? vatTotal : type === 'non-vat' ? nonVatTotal : vatTotal + nonVatTotal
        }
    });
});

// POST /api/inventory/receive - Receive goods into inventory
router.post('/receive', authorize('CEO', 'BRANCH_MANAGER', 'PHARMACIST', 'STAFF'), async (req: AuthRequest, res) => {
    const receiveSchema = z.object({
        branchId: z.string().uuid(),
        items: z.array(z.object({
            productId: z.string().uuid(),
            batchNumber: z.string(),
            lotNumber: z.string().optional(),
            expiryDate: z.string().datetime(),
            quantity: z.number().int().positive(),
            costPrice: z.number().nonnegative(),
            isVat: z.boolean().default(true),
            vatRate: z.number().min(0).max(100).default(7),
            location: z.string().optional()
        }))
    });

    const validation = receiveSchema.safeParse(req.body);
    if (!validation.success) {
        throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);
    }

    const { branchId, items } = validation.data;

    // Verify branch belongs to organization
    const branch = await prisma.branch.findFirst({
        where: {
            id: branchId,
            organizationId: req.user!.organizationId
        }
    });

    if (!branch) {
        throw ApiError.notFound('ไม่พบสาขา');
    }

    const results = await prisma.$transaction(async (tx) => {
        const createdItems = [];

        for (const item of items) {
            // Get or create batch
            let batch = await tx.productBatch.findFirst({
                where: {
                    productId: item.productId,
                    batchNumber: item.batchNumber
                }
            });

            if (!batch) {
                batch = await tx.productBatch.create({
                    data: {
                        productId: item.productId,
                        batchNumber: item.batchNumber,
                        lotNumber: item.lotNumber,
                        expiryDate: new Date(item.expiryDate),
                        quantity: item.quantity,
                        costPrice: item.costPrice
                    }
                });
            } else {
                // Update batch quantity
                await tx.productBatch.update({
                    where: { id: batch.id },
                    data: {
                        quantity: { increment: item.quantity }
                    }
                });
            }

            // Add to appropriate inventory
            if (item.isVat) {
                const vatAmount = item.costPrice * (item.vatRate / 100);
                const costWithVat = item.costPrice + vatAmount;

                const existingVat = await tx.inventoryVat.findUnique({
                    where: {
                        branchId_productId_batchId: {
                            branchId,
                            productId: item.productId,
                            batchId: batch.id
                        }
                    }
                });

                if (existingVat) {
                    await tx.inventoryVat.update({
                        where: { id: existingVat.id },
                        data: {
                            quantity: { increment: item.quantity }
                        }
                    });
                } else {
                    await tx.inventoryVat.create({
                        data: {
                            branchId,
                            productId: item.productId,
                            batchId: batch.id,
                            quantity: item.quantity,
                            costBeforeVat: item.costPrice,
                            vatRate: item.vatRate,
                            vatAmount,
                            costWithVat,
                            location: item.location
                        }
                    });
                }
            } else {
                const product = await tx.product.findUnique({
                    where: { id: item.productId }
                });

                const existingNonVat = await tx.inventoryNonVat.findUnique({
                    where: {
                        branchId_productId_batchId: {
                            branchId,
                            productId: item.productId,
                            batchId: batch.id
                        }
                    }
                });

                if (existingNonVat) {
                    await tx.inventoryNonVat.update({
                        where: { id: existingNonVat.id },
                        data: {
                            quantity: { increment: item.quantity }
                        }
                    });
                } else {
                    await tx.inventoryNonVat.create({
                        data: {
                            branchId,
                            productId: item.productId,
                            batchId: batch.id,
                            quantity: item.quantity,
                            costPrice: item.costPrice,
                            sellingPrice: product?.sellingPrice || item.costPrice * 1.3,
                            location: item.location
                        }
                    });
                }
            }

            // Create stock movement
            await tx.stockMovement.create({
                data: {
                    branchId,
                    batchId: batch.id,
                    movementType: 'IN',
                    quantity: item.quantity,
                    referenceType: 'GOODS_RECEIVING',
                    notes: `รับสินค้าเข้าคลัง - Batch: ${item.batchNumber}`,
                    createdBy: req.user!.id
                }
            });

            createdItems.push({
                productId: item.productId,
                batchId: batch.id,
                quantity: item.quantity,
                isVat: item.isVat
            });
        }

        return createdItems;
    });

    res.status(201).json({
        success: true,
        data: results,
        message: 'รับสินค้าเข้าคลังสำเร็จ'
    });
});

// POST /api/inventory/adjust - Adjust inventory
router.post('/adjust', authorize('CEO', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    const adjustSchema = z.object({
        branchId: z.string().uuid(),
        productId: z.string().uuid(),
        batchId: z.string().uuid(),
        adjustmentType: z.enum(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'EXPIRED', 'DAMAGED']),
        quantity: z.number().int().positive(),
        isVat: z.boolean(),
        reason: z.string().min(1)
    });

    const validation = adjustSchema.safeParse(req.body);
    if (!validation.success) {
        throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);
    }

    const { branchId, productId, batchId, adjustmentType, quantity, isVat, reason } = validation.data;

    await prisma.$transaction(async (tx) => {
        if (isVat) {
            const inventory = await tx.inventoryVat.findUnique({
                where: {
                    branchId_productId_batchId: { branchId, productId, batchId }
                }
            });

            if (!inventory) {
                throw ApiError.notFound('ไม่พบรายการสินค้าในคลัง');
            }

            const newQty = adjustmentType === 'ADJUSTMENT_IN'
                ? inventory.quantity + quantity
                : inventory.quantity - quantity;

            if (newQty < 0) {
                throw ApiError.badRequest('จำนวนสินค้าไม่เพียงพอ');
            }

            await tx.inventoryVat.update({
                where: { id: inventory.id },
                data: { quantity: newQty }
            });
        } else {
            const inventory = await tx.inventoryNonVat.findUnique({
                where: {
                    branchId_productId_batchId: { branchId, productId, batchId }
                }
            });

            if (!inventory) {
                throw ApiError.notFound('ไม่พบรายการสินค้าในคลัง');
            }

            const newQty = adjustmentType === 'ADJUSTMENT_IN'
                ? inventory.quantity + quantity
                : inventory.quantity - quantity;

            if (newQty < 0) {
                throw ApiError.badRequest('จำนวนสินค้าไม่เพียงพอ');
            }

            await tx.inventoryNonVat.update({
                where: { id: inventory.id },
                data: { quantity: newQty }
            });
        }

        // Update batch quantity
        await tx.productBatch.update({
            where: { id: batchId },
            data: {
                quantity: adjustmentType === 'ADJUSTMENT_IN'
                    ? { increment: quantity }
                    : { decrement: quantity }
            }
        });

        // Create stock movement
        await tx.stockMovement.create({
            data: {
                branchId,
                batchId,
                movementType: adjustmentType as any,
                quantity,
                referenceType: 'ADJUSTMENT',
                notes: reason,
                createdBy: req.user!.id
            }
        });
    });

    res.json({
        success: true,
        message: 'ปรับปรุงสต็อกสำเร็จ'
    });
});

// POST /api/inventory/transfer - Transfer between branches
router.post('/transfer', authorize('CEO', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    const transferSchema = z.object({
        fromBranchId: z.string().uuid(),
        toBranchId: z.string().uuid(),
        items: z.array(z.object({
            productId: z.string().uuid(),
            batchId: z.string().uuid(),
            quantity: z.number().int().positive(),
            isVat: z.boolean()
        }))
    });

    const validation = transferSchema.safeParse(req.body);
    if (!validation.success) {
        throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);
    }

    const { fromBranchId, toBranchId, items } = validation.data;

    if (fromBranchId === toBranchId) {
        throw ApiError.badRequest('ไม่สามารถโอนไปยังสาขาเดียวกัน');
    }

    await prisma.$transaction(async (tx) => {
        for (const item of items) {
            if (item.isVat) {
                // Get source inventory
                const sourceInventory = await tx.inventoryVat.findUnique({
                    where: {
                        branchId_productId_batchId: {
                            branchId: fromBranchId,
                            productId: item.productId,
                            batchId: item.batchId
                        }
                    }
                });

                if (!sourceInventory || sourceInventory.quantity < item.quantity) {
                    throw ApiError.badRequest('จำนวนสินค้าไม่เพียงพอ');
                }

                // Deduct from source
                await tx.inventoryVat.update({
                    where: { id: sourceInventory.id },
                    data: { quantity: { decrement: item.quantity } }
                });

                // Add to destination
                const destInventory = await tx.inventoryVat.findUnique({
                    where: {
                        branchId_productId_batchId: {
                            branchId: toBranchId,
                            productId: item.productId,
                            batchId: item.batchId
                        }
                    }
                });

                if (destInventory) {
                    await tx.inventoryVat.update({
                        where: { id: destInventory.id },
                        data: { quantity: { increment: item.quantity } }
                    });
                } else {
                    await tx.inventoryVat.create({
                        data: {
                            branchId: toBranchId,
                            productId: item.productId,
                            batchId: item.batchId,
                            quantity: item.quantity,
                            costBeforeVat: sourceInventory.costBeforeVat,
                            vatRate: sourceInventory.vatRate,
                            vatAmount: sourceInventory.vatAmount,
                            costWithVat: sourceInventory.costWithVat,
                            location: sourceInventory.location
                        }
                    });
                }
            } else {
                // Similar logic for Non-VAT inventory
                const sourceInventory = await tx.inventoryNonVat.findUnique({
                    where: {
                        branchId_productId_batchId: {
                            branchId: fromBranchId,
                            productId: item.productId,
                            batchId: item.batchId
                        }
                    }
                });

                if (!sourceInventory || sourceInventory.quantity < item.quantity) {
                    throw ApiError.badRequest('จำนวนสินค้าไม่เพียงพอ');
                }

                await tx.inventoryNonVat.update({
                    where: { id: sourceInventory.id },
                    data: { quantity: { decrement: item.quantity } }
                });

                const destInventory = await tx.inventoryNonVat.findUnique({
                    where: {
                        branchId_productId_batchId: {
                            branchId: toBranchId,
                            productId: item.productId,
                            batchId: item.batchId
                        }
                    }
                });

                if (destInventory) {
                    await tx.inventoryNonVat.update({
                        where: { id: destInventory.id },
                        data: { quantity: { increment: item.quantity } }
                    });
                } else {
                    await tx.inventoryNonVat.create({
                        data: {
                            branchId: toBranchId,
                            productId: item.productId,
                            batchId: item.batchId,
                            quantity: item.quantity,
                            costPrice: sourceInventory.costPrice,
                            sellingPrice: sourceInventory.sellingPrice,
                            location: sourceInventory.location
                        }
                    });
                }
            }

            // Create stock movements
            await tx.stockMovement.createMany({
                data: [
                    {
                        branchId: fromBranchId,
                        batchId: item.batchId,
                        movementType: 'TRANSFER_OUT',
                        quantity: item.quantity,
                        referenceType: 'TRANSFER',
                        notes: `โอนไปยังสาขา ${toBranchId}`,
                        createdBy: req.user!.id
                    },
                    {
                        branchId: toBranchId,
                        batchId: item.batchId,
                        movementType: 'TRANSFER_IN',
                        quantity: item.quantity,
                        referenceType: 'TRANSFER',
                        notes: `รับโอนจากสาขา ${fromBranchId}`,
                        createdBy: req.user!.id
                    }
                ]
            });
        }
    });

    res.json({
        success: true,
        message: 'โอนสินค้าระหว่างสาขาสำเร็จ'
    });
});

// GET /api/inventory/movements - Get stock movement history
router.get('/movements', async (req: AuthRequest, res) => {
    const {
        branchId,
        productId,
        batchId,
        movementType,
        startDate,
        endDate,
        page = '1',
        limit = '50'
    } = req.query;

    const where: any = {};

    if (branchId) {
        where.branchId = branchId;
    } else if (req.user!.branchId) {
        where.branchId = req.user!.branchId;
    }

    if (productId) where.batch = { productId };
    if (batchId) where.batchId = batchId;
    if (movementType) where.movementType = movementType;

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
            where,
            include: {
                branch: true,
                batch: {
                    include: { product: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take
        }),
        prisma.stockMovement.count({ where })
    ]);

    res.json({
        success: true,
        data: movements,
        pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages: Math.ceil(total / take)
        }
    });
});

export default router;
