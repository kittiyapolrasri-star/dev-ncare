import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from './errorHandler.js';

// Sanitize string - remove potential XSS
const sanitizeString = (str: string): string => {
    if (typeof str !== 'string') return str;

    return str
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .replace(/\\/g, '&#x5C;')
        .replace(/`/g, '&#x60;');
};

// Deep sanitize object
const sanitizeObject = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    if (typeof obj === 'object') {
        const sanitized: any = {};
        for (const key of Object.keys(obj)) {
            sanitized[key] = sanitizeObject(obj[key]);
        }
        return sanitized;
    }

    return obj;
};

// Sanitize request body middleware
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    next();
};

// Validate request with Zod schema
export const validate = (schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
            const result = schema.safeParse(data);

            if (!result.success) {
                const errors = result.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));

                throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', errors);
            }

            // Replace with validated data
            if (source === 'body') {
                req.body = result.data;
            } else if (source === 'query') {
                (req as any).validatedQuery = result.data;
            } else {
                (req as any).validatedParams = result.data;
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

// Common validation schemas
export const schemas = {
    // Pagination
    pagination: z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
    }),

    // UUID
    uuid: z.object({
        id: z.string().uuid('รหัสไม่ถูกต้อง'),
    }),

    // Date range
    dateRange: z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
    }),

    // Search
    search: z.object({
        search: z.string().max(100).optional(),
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
    }),

    // Login
    login: z.object({
        email: z.string().email('อีเมลไม่ถูกต้อง'),
        password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
    }),

    // Register
    register: z.object({
        organizationId: z.string().uuid(),
        email: z.string().email('อีเมลไม่ถูกต้อง'),
        password: z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
            .regex(/[A-Z]/, 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว')
            .regex(/[0-9]/, 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว'),
        firstName: z.string().min(1, 'กรุณากรอกชื่อ').max(100),
        lastName: z.string().min(1, 'กรุณากรอกนามสกุล').max(100),
        phone: z.string().regex(/^0[0-9]{8,9}$/, 'เบอร์โทรไม่ถูกต้อง').optional(),
    }),

    // Product
    product: z.object({
        sku: z.string().min(1, 'กรุณากรอกรหัสสินค้า').max(50),
        barcode: z.string().max(50).optional(),
        name: z.string().min(1, 'กรุณากรอกชื่อสินค้า').max(255),
        genericName: z.string().max(255).optional(),
        drugType: z.enum(['GENERAL', 'DANGEROUS_DRUG', 'CONTROLLED_DRUG', 'NARCOTIC', 'SUPPLEMENT', 'MEDICAL_DEVICE', 'COSMETIC']).default('GENERAL'),
        dosageForm: z.string().max(100).optional(),
        strength: z.string().max(100).optional(),
        unit: z.string().min(1).max(50),
        packSize: z.number().int().positive().default(1),
        costPrice: z.number().nonnegative(),
        sellingPrice: z.number().nonnegative(),
        isVatExempt: z.boolean().default(false),
        vatRate: z.number().min(0).max(100).default(7),
        reorderPoint: z.number().int().nonnegative().default(10),
        reorderQty: z.number().int().nonnegative().default(100),
        isOemProduct: z.boolean().default(false),
        categoryId: z.string().uuid().optional(),
        supplierId: z.string().uuid().optional(),
    }),

    // Sale
    sale: z.object({
        branchId: z.string().uuid(),
        customerId: z.string().uuid().optional(),
        distributorId: z.string().uuid().optional(),
        saleType: z.enum(['RETAIL', 'WHOLESALE', 'B2B', 'DISTRIBUTOR']).default('RETAIL'),
        items: z.array(z.object({
            productId: z.string().uuid(),
            quantity: z.number().int().positive(),
            unitPrice: z.number().nonnegative(),
            discount: z.number().nonnegative().default(0),
            isVat: z.boolean(),
            vatRate: z.number().min(0).max(100).default(7),
        })).min(1, 'กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ'),
        discountAmount: z.number().nonnegative().default(0),
        discountPercent: z.number().min(0).max(100).default(0),
        paymentMethod: z.enum(['CASH', 'CREDIT_CARD', 'QR_PAYMENT', 'TRANSFER', 'CREDIT']).default('CASH'),
        amountPaid: z.number().nonnegative(),
        isVatInvoice: z.boolean().default(false),
        notes: z.string().max(500).optional(),
    }),

    // Inventory receive
    inventoryReceive: z.object({
        branchId: z.string().uuid(),
        supplierId: z.string().uuid().optional(),
        purchaseId: z.string().uuid().optional(),
        items: z.array(z.object({
            productId: z.string().uuid(),
            batchNumber: z.string().min(1).max(100),
            lotNumber: z.string().max(100).optional(),
            expiryDate: z.string().datetime(),
            quantity: z.number().int().positive(),
            costPrice: z.number().nonnegative(),
            isVat: z.boolean().default(true),
            vatRate: z.number().min(0).max(100).default(7),
        })).min(1),
        notes: z.string().max(500).optional(),
    }),

    // Stock adjustment
    stockAdjust: z.object({
        branchId: z.string().uuid(),
        batchId: z.string().uuid(),
        adjustmentType: z.enum(['IN', 'OUT', 'DAMAGED', 'EXPIRED', 'RETURNED', 'CORRECTION']),
        quantity: z.number().int(),
        reason: z.string().min(1).max(500),
    }),
};
