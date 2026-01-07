import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

router.use(authenticate);

const branchSchema = z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    type: z.enum(['RETAIL', 'WAREHOUSE', 'DISTRIBUTION']).default('RETAIL'),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    isHeadquarter: z.boolean().default(false)
});

// GET /api/branches - List all branches
router.get('/', async (req: AuthRequest, res) => {
    const branches = await prisma.branch.findMany({
        where: { organizationId: req.user!.organizationId, isActive: true },
        include: {
            _count: { select: { users: true, sales: true } }
        },
        orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: branches });
});

// GET /api/branches/:id - Get branch by ID
router.get('/:id', async (req: AuthRequest, res) => {
    const branch = await prisma.branch.findFirst({
        where: { id: req.params.id, organizationId: req.user!.organizationId },
        include: {
            users: { select: { id: true, firstName: true, lastName: true, role: true } }
        }
    });

    if (!branch) throw ApiError.notFound('ไม่พบสาขา');
    res.json({ success: true, data: branch });
});

// POST /api/branches - Create new branch
router.post('/', authorize('CEO'), async (req: AuthRequest, res) => {
    const validation = branchSchema.safeParse(req.body);
    if (!validation.success) {
        throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);
    }

    const existingCode = await prisma.branch.findFirst({
        where: { organizationId: req.user!.organizationId, code: validation.data.code }
    });
    if (existingCode) throw ApiError.conflict('รหัสสาขานี้มีอยู่แล้ว');

    const branch = await prisma.branch.create({
        data: { ...validation.data, organizationId: req.user!.organizationId }
    });

    res.status(201).json({ success: true, data: branch, message: 'สร้างสาขาสำเร็จ' });
});

// PUT /api/branches/:id - Update branch
router.put('/:id', authorize('CEO', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    const branch = await prisma.branch.findFirst({
        where: { id: req.params.id, organizationId: req.user!.organizationId }
    });
    if (!branch) throw ApiError.notFound('ไม่พบสาขา');

    const updated = await prisma.branch.update({
        where: { id: branch.id },
        data: req.body
    });

    res.json({ success: true, data: updated, message: 'อัพเดตสาขาสำเร็จ' });
});

// DELETE /api/branches/:id - Soft delete branch
router.delete('/:id', authorize('CEO'), async (req: AuthRequest, res) => {
    await prisma.branch.update({
        where: { id: req.params.id },
        data: { isActive: false }
    });

    res.json({ success: true, message: 'ลบสาขาสำเร็จ' });
});

export default router;
