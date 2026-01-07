import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /api/organizations - List organizations (CEO only)
router.get('/', authorize('CEO'), async (req: AuthRequest, res) => {
    const organizations = await prisma.organization.findMany({
        include: {
            _count: {
                select: { branches: true, users: true }
            }
        }
    });

    res.json({ success: true, data: organizations });
});

// GET /api/organizations/current - Get current organization
router.get('/current', async (req: AuthRequest, res) => {
    const organization = await prisma.organization.findUnique({
        where: { id: req.user!.organizationId },
        include: {
            branches: { where: { isActive: true } },
            _count: { select: { users: true, products: true } }
        }
    });

    res.json({ success: true, data: organization });
});

// PUT /api/organizations/current - Update current organization
router.put('/current', authorize('CEO'), async (req: AuthRequest, res) => {
    const { name, address, phone, email, logo, settings } = req.body;

    const organization = await prisma.organization.update({
        where: { id: req.user!.organizationId },
        data: { name, address, phone, email, logo, settings }
    });

    res.json({ success: true, data: organization, message: 'อัพเดตข้อมูลองค์กรสำเร็จ' });
});

export default router;
