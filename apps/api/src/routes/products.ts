import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation schemas
const productSchema = z.object({
    categoryId: z.string().uuid().optional().nullable(),
    supplierId: z.string().uuid().optional().nullable(),
    sku: z.string().min(1, 'กรุณากรอกรหัสสินค้า'),
    barcode: z.string().optional().nullable(),
    name: z.string().min(1, 'กรุณากรอกชื่อสินค้า'),
    genericName: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    drugType: z.enum(['GENERAL', 'DANGEROUS_DRUG', 'CONTROLLED_DRUG', 'NARCOTIC', 'SUPPLEMENT', 'MEDICAL_DEVICE', 'COSMETIC']).default('GENERAL'),
    dosageForm: z.string().optional().nullable(),
    strength: z.string().optional().nullable(),
    unit: z.string().default('ชิ้น'),
    packSize: z.number().int().positive().default(1),
    costPrice: z.number().nonnegative().default(0),
    sellingPrice: z.number().nonnegative().default(0),
    isVatExempt: z.boolean().default(false),
    vatRate: z.number().min(0).max(100).default(7),
    reorderPoint: z.number().int().nonnegative().default(10),
    reorderQty: z.number().int().positive().default(100),
    maxStock: z.number().int().positive().optional().nullable(),
    isOemProduct: z.boolean().default(false),
    oemLeadDays: z.number().int().positive().optional().nullable(),
    isControlled: z.boolean().default(false),
    requiresRx: z.boolean().default(false),
    images: z.array(z.string()).default([])
});

// GET /api/products - List all products
router.get('/', async (req: AuthRequest, res) => {
    const {
        search,
        categoryId,
        supplierId,
        drugType,
        isVatExempt,
        isOemProduct,
        isActive = 'true',
        page = '1',
        limit = '20',
        sortBy = 'name',
        sortOrder = 'asc'
    } = req.query;

    const where: any = {
        organizationId: req.user!.organizationId
    };

    if (search) {
        where.OR = [
            { name: { contains: search as string, mode: 'insensitive' } },
            { sku: { contains: search as string, mode: 'insensitive' } },
            { barcode: { contains: search as string, mode: 'insensitive' } },
            { genericName: { contains: search as string, mode: 'insensitive' } }
        ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (supplierId) where.supplierId = supplierId;
    if (drugType) where.drugType = drugType;
    if (isVatExempt !== undefined) where.isVatExempt = isVatExempt === 'true';
    if (isOemProduct !== undefined) where.isOemProduct = isOemProduct === 'true';
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where,
            include: {
                category: true,
                supplier: true,
                _count: {
                    select: { batches: true }
                }
            },
            orderBy: { [sortBy as string]: sortOrder },
            skip,
            take
        }),
        prisma.product.count({ where })
    ]);

    res.json({
        success: true,
        data: products,
        pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages: Math.ceil(total / take)
        }
    });
});

// GET /api/products/:id - Get product by ID
router.get('/:id', async (req: AuthRequest, res) => {
    const product = await prisma.product.findFirst({
        where: {
            id: req.params.id,
            organizationId: req.user!.organizationId
        },
        include: {
            category: true,
            supplier: true,
            batches: {
                where: { isActive: true },
                orderBy: { expiryDate: 'asc' }
            }
        }
    });

    if (!product) {
        throw ApiError.notFound('ไม่พบสินค้า');
    }

    res.json({
        success: true,
        data: product
    });
});

// POST /api/products - Create new product
router.post('/', authorize('CEO', 'BRANCH_MANAGER', 'PHARMACIST'), async (req: AuthRequest, res) => {
    const validation = productSchema.safeParse(req.body);

    if (!validation.success) {
        throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);
    }

    const data = validation.data;

    // Check if SKU already exists
    const existingProduct = await prisma.product.findFirst({
        where: {
            organizationId: req.user!.organizationId,
            sku: data.sku
        }
    });

    if (existingProduct) {
        throw ApiError.conflict('รหัสสินค้านี้มีอยู่แล้ว');
    }

    const product = await prisma.product.create({
        data: {
            ...data,
            organizationId: req.user!.organizationId,
            costPrice: data.costPrice,
            sellingPrice: data.sellingPrice,
            vatRate: data.vatRate
        },
        include: {
            category: true,
            supplier: true
        }
    });

    res.status(201).json({
        success: true,
        data: product,
        message: 'สร้างสินค้าสำเร็จ'
    });
});

// PUT /api/products/:id - Update product
router.put('/:id', authorize('CEO', 'BRANCH_MANAGER', 'PHARMACIST'), async (req: AuthRequest, res) => {
    const validation = productSchema.partial().safeParse(req.body);

    if (!validation.success) {
        throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);
    }

    const product = await prisma.product.findFirst({
        where: {
            id: req.params.id,
            organizationId: req.user!.organizationId
        }
    });

    if (!product) {
        throw ApiError.notFound('ไม่พบสินค้า');
    }

    // Check SKU uniqueness if updating
    if (validation.data.sku && validation.data.sku !== product.sku) {
        const existingSku = await prisma.product.findFirst({
            where: {
                organizationId: req.user!.organizationId,
                sku: validation.data.sku,
                id: { not: product.id }
            }
        });

        if (existingSku) {
            throw ApiError.conflict('รหัสสินค้านี้มีอยู่แล้ว');
        }
    }

    const updatedProduct = await prisma.product.update({
        where: { id: product.id },
        data: validation.data as any,
        include: {
            category: true,
            supplier: true
        }
    });

    res.json({
        success: true,
        data: updatedProduct,
        message: 'อัพเดตสินค้าสำเร็จ'
    });
});

// DELETE /api/products/:id - Soft delete product
router.delete('/:id', authorize('CEO', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    const product = await prisma.product.findFirst({
        where: {
            id: req.params.id,
            organizationId: req.user!.organizationId
        }
    });

    if (!product) {
        throw ApiError.notFound('ไม่พบสินค้า');
    }

    await prisma.product.update({
        where: { id: product.id },
        data: { isActive: false }
    });

    res.json({
        success: true,
        message: 'ลบสินค้าสำเร็จ'
    });
});

// GET /api/products/:id/stock - Get stock levels across branches
router.get('/:id/stock', async (req: AuthRequest, res) => {
    const product = await prisma.product.findFirst({
        where: {
            id: req.params.id,
            organizationId: req.user!.organizationId
        }
    });

    if (!product) {
        throw ApiError.notFound('ไม่พบสินค้า');
    }

    const [vatStock, nonVatStock] = await Promise.all([
        prisma.inventoryVat.findMany({
            where: { productId: product.id },
            include: {
                branch: true,
                batch: true
            }
        }),
        prisma.inventoryNonVat.findMany({
            where: { productId: product.id },
            include: {
                branch: true,
                batch: true
            }
        })
    ]);

    res.json({
        success: true,
        data: {
            product: {
                id: product.id,
                sku: product.sku,
                name: product.name,
                isVatExempt: product.isVatExempt
            },
            vatInventory: vatStock,
            nonVatInventory: nonVatStock,
            totalVatQty: vatStock.reduce((sum, i) => sum + i.quantity, 0),
            totalNonVatQty: nonVatStock.reduce((sum, i) => sum + i.quantity, 0)
        }
    });
});

export default router;
