import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

// Customer routes
const customerSchema = z.object({
    code: z.string().optional(),
    name: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    taxId: z.string().optional(),
    customerType: z.enum(['RETAIL', 'WHOLESALE', 'HOSPITAL', 'CLINIC', 'PHARMACY']).default('RETAIL'),
    creditLimit: z.number().optional()
});

router.get('/', async (req: AuthRequest, res) => {
    const { search, type, isActive = 'true' } = req.query;
    const where: any = { organizationId: req.user!.organizationId };

    if (search) {
        where.OR = [
            { name: { contains: search as string, mode: 'insensitive' } },
            { phone: { contains: search as string, mode: 'insensitive' } }
        ];
    }
    if (type) where.customerType = type;
    if (isActive) where.isActive = isActive === 'true';

    const customers = await prisma.customer.findMany({
        where,
        include: { _count: { select: { sales: true } } },
        orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: customers });
});

router.get('/:id', async (req: AuthRequest, res) => {
    const customer = await prisma.customer.findFirst({
        where: { id: req.params.id, organizationId: req.user!.organizationId },
        include: { sales: { take: 10, orderBy: { saleDate: 'desc' } } }
    });
    if (!customer) throw ApiError.notFound('ไม่พบลูกค้า');
    res.json({ success: true, data: customer });
});

router.post('/', async (req: AuthRequest, res) => {
    const validation = customerSchema.safeParse(req.body);
    if (!validation.success) throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);

    const customer = await prisma.customer.create({
        data: { ...validation.data, organizationId: req.user!.organizationId }
    });

    res.status(201).json({ success: true, data: customer, message: 'สร้างลูกค้าสำเร็จ' });
});

router.put('/:id', async (req: AuthRequest, res) => {
    const customer = await prisma.customer.findFirst({
        where: { id: req.params.id, organizationId: req.user!.organizationId }
    });
    if (!customer) throw ApiError.notFound('ไม่พบลูกค้า');

    const updated = await prisma.customer.update({
        where: { id: customer.id },
        data: req.body
    });

    res.json({ success: true, data: updated, message: 'อัพเดตลูกค้าสำเร็จ' });
});

router.delete('/:id', authorize('CEO', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    await prisma.customer.update({
        where: { id: req.params.id },
        data: { isActive: false }
    });
    res.json({ success: true, message: 'ลบลูกค้าสำเร็จ' });
});

export default router;
