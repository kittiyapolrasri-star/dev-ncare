import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

// Point rate: 1 THB = 1 point (configurable)
const POINT_RATE = 1; // 1 บาท = 1 แต้ม
const POINTS_PER_REDEEM = 100; // 100 แต้ม = 1 บาท

// ============================================
// POINTS SETTINGS
// ============================================

// GET /api/points/settings
router.get('/settings', async (req: AuthRequest, res) => {
    res.json({
        success: true,
        data: {
            earnRate: POINT_RATE,
            redeemRate: POINTS_PER_REDEEM,
            tiers: {
                BRONZE: { minPoints: 0, discount: 0 },
                SILVER: { minPoints: 1000, discount: 3 },
                GOLD: { minPoints: 5000, discount: 5 },
                PLATINUM: { minPoints: 10000, discount: 10 }
            }
        }
    });
});

// ============================================
// CUSTOMER POINTS
// ============================================

// GET /api/points/customer/:id - Get customer points summary
router.get('/customer/:id', async (req: AuthRequest, res) => {
    const customer = await prisma.customer.findFirst({
        where: {
            id: req.params.id,
            organizationId: req.user!.organizationId
        },
        include: {
            pointTransactions: {
                orderBy: { createdAt: 'desc' },
                take: 20
            }
        }
    });

    if (!customer) throw ApiError.notFound('ไม่พบลูกค้า');

    const availablePoints = customer.totalPoints - customer.usedPoints;

    res.json({
        success: true,
        data: {
            customerId: customer.id,
            name: customer.name,
            phone: customer.phone,
            memberTier: customer.memberTier,
            totalPoints: customer.totalPoints,
            usedPoints: customer.usedPoints,
            availablePoints,
            transactions: customer.pointTransactions
        }
    });
});

// POST /api/points/earn - Award points from sale
router.post('/earn', async (req: AuthRequest, res) => {
    const schema = z.object({
        customerId: z.string().uuid(),
        saleId: z.string().uuid(),
        amount: z.number().positive()
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
        throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);
    }

    const { customerId, saleId, amount } = validation.data;
    const points = Math.floor(amount * POINT_RATE);

    const result = await prisma.$transaction(async (tx) => {
        // Create point transaction
        const transaction = await tx.pointTransaction.create({
            data: {
                customerId,
                saleId,
                type: 'EARN',
                points,
                description: `ได้รับแต้มจากการซื้อ ฿${amount.toFixed(2)}`
            }
        });

        // Update customer points
        const customer = await tx.customer.update({
            where: { id: customerId },
            data: {
                totalPoints: { increment: points },
                memberTier: getMemberTier(points)
            }
        });

        return { transaction, customer };
    });

    res.json({
        success: true,
        data: {
            pointsEarned: points,
            newTotalPoints: result.customer.totalPoints,
            memberTier: result.customer.memberTier
        },
        message: `ได้รับ ${points} แต้ม`
    });
});

// POST /api/points/redeem - Redeem points for discount
router.post('/redeem', async (req: AuthRequest, res) => {
    const schema = z.object({
        customerId: z.string().uuid(),
        points: z.number().int().positive(),
        saleId: z.string().uuid().optional()
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
        throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);
    }

    const { customerId, points, saleId } = validation.data;

    // Check customer has enough points
    const customer = await prisma.customer.findUnique({
        where: { id: customerId }
    });

    if (!customer) throw ApiError.notFound('ไม่พบลูกค้า');

    const available = customer.totalPoints - customer.usedPoints;
    if (available < points) {
        throw ApiError.badRequest(`แต้มไม่เพียงพอ (มี ${available} แต้ม)`);
    }

    const discountAmount = points / POINTS_PER_REDEEM;

    const result = await prisma.$transaction(async (tx) => {
        // Create redeem transaction
        const transaction = await tx.pointTransaction.create({
            data: {
                customerId,
                saleId,
                type: 'REDEEM',
                points: -points,
                description: `แลกแต้ม ${points} เป็นส่วนลด ฿${discountAmount.toFixed(2)}`
            }
        });

        // Update customer used points
        const updated = await tx.customer.update({
            where: { id: customerId },
            data: {
                usedPoints: { increment: points }
            }
        });

        return { transaction, customer: updated };
    });

    res.json({
        success: true,
        data: {
            pointsRedeemed: points,
            discountAmount,
            remainingPoints: result.customer.totalPoints - result.customer.usedPoints
        },
        message: `แลก ${points} แต้ม เป็นส่วนลด ฿${discountAmount.toFixed(2)}`
    });
});

// POST /api/points/adjust - Adjust points (admin)
router.post('/adjust', authorize('CEO', 'ACCOUNTANT'), async (req: AuthRequest, res) => {
    const schema = z.object({
        customerId: z.string().uuid(),
        points: z.number().int(),
        description: z.string().min(1)
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
        throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);
    }

    const { customerId, points, description } = validation.data;

    const result = await prisma.$transaction(async (tx) => {
        const transaction = await tx.pointTransaction.create({
            data: {
                customerId,
                type: 'ADJUST',
                points,
                description
            }
        });

        const customer = await tx.customer.update({
            where: { id: customerId },
            data: {
                totalPoints: { increment: points },
                memberTier: getMemberTier(points)
            }
        });

        return { transaction, customer };
    });

    res.json({
        success: true,
        data: result,
        message: `ปรับแต้ม ${points > 0 ? '+' : ''}${points} สำเร็จ`
    });
});

// Helper: Calculate member tier based on points
function getMemberTier(totalPoints: number): 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' {
    if (totalPoints >= 10000) return 'PLATINUM';
    if (totalPoints >= 5000) return 'GOLD';
    if (totalPoints >= 1000) return 'SILVER';
    return 'BRONZE';
}

export default router;
