import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

const router = Router();
router.use(authenticate);

// ============================================
// EXPENSE CATEGORIES
// ============================================

// GET /api/expenses/categories
router.get('/categories', async (req: AuthRequest, res) => {
    const categories = await prisma.expenseCategory.findMany({
        where: { organizationId: req.user!.organizationId, isActive: true },
        include: { _count: { select: { expenses: true } } },
        orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: categories });
});

// POST /api/expenses/categories
router.post('/categories', authorize('CEO', 'ACCOUNTANT'), async (req: AuthRequest, res) => {
    const schema = z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional()
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
        throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);
    }

    const category = await prisma.expenseCategory.create({
        data: {
            ...validation.data,
            organizationId: req.user!.organizationId
        }
    });

    res.status(201).json({ success: true, data: category, message: 'สร้างหมวดหมู่ค่าใช้จ่ายสำเร็จ' });
});

// ============================================
// EXPENSES CRUD
// ============================================

const expenseSchema = z.object({
    branchId: z.string().uuid().optional().nullable(),
    categoryId: z.string().uuid(),
    expenseDate: z.string().datetime(),
    amount: z.number().positive(),
    description: z.string().optional(),
    reference: z.string().optional(),
    paymentMethod: z.enum(['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'QR_PAYMENT']).optional()
});

// GET /api/expenses
router.get('/', async (req: AuthRequest, res) => {
    const { branchId, categoryId, startDate, endDate, page = '1', limit = '20' } = req.query;

    const where: any = { organizationId: req.user!.organizationId };

    if (branchId) where.branchId = branchId;
    if (categoryId) where.categoryId = categoryId;

    if (startDate || endDate) {
        where.expenseDate = {};
        if (startDate) where.expenseDate.gte = new Date(startDate as string);
        if (endDate) where.expenseDate.lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [expenses, total] = await Promise.all([
        prisma.expense.findMany({
            where,
            include: {
                category: true,
                branch: true,
                user: { select: { id: true, firstName: true, lastName: true } }
            },
            orderBy: { expenseDate: 'desc' },
            skip,
            take
        }),
        prisma.expense.count({ where })
    ]);

    res.json({
        success: true,
        data: expenses,
        pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages: Math.ceil(total / take)
        }
    });
});

// POST /api/expenses
router.post('/', authorize('CEO', 'ACCOUNTANT', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    const validation = expenseSchema.safeParse(req.body);
    if (!validation.success) {
        throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);
    }

    const expense = await prisma.expense.create({
        data: {
            ...validation.data,
            expenseDate: new Date(validation.data.expenseDate),
            organizationId: req.user!.organizationId,
            createdBy: req.user!.id
        },
        include: { category: true, branch: true }
    });

    res.status(201).json({ success: true, data: expense, message: 'บันทึกค่าใช้จ่ายสำเร็จ' });
});

// PUT /api/expenses/:id
router.put('/:id', authorize('CEO', 'ACCOUNTANT', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    const expense = await prisma.expense.findFirst({
        where: { id: req.params.id, organizationId: req.user!.organizationId }
    });

    if (!expense) throw ApiError.notFound('ไม่พบรายการค่าใช้จ่าย');

    const validation = expenseSchema.partial().safeParse(req.body);
    if (!validation.success) {
        throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);
    }

    const updated = await prisma.expense.update({
        where: { id: expense.id },
        data: {
            ...validation.data,
            expenseDate: validation.data.expenseDate ? new Date(validation.data.expenseDate) : undefined
        },
        include: { category: true, branch: true }
    });

    res.json({ success: true, data: updated, message: 'อัพเดตค่าใช้จ่ายสำเร็จ' });
});

// DELETE /api/expenses/:id
router.delete('/:id', authorize('CEO', 'ACCOUNTANT'), async (req: AuthRequest, res) => {
    const expense = await prisma.expense.findFirst({
        where: { id: req.params.id, organizationId: req.user!.organizationId }
    });

    if (!expense) throw ApiError.notFound('ไม่พบรายการค่าใช้จ่าย');

    await prisma.expense.delete({ where: { id: expense.id } });

    res.json({ success: true, message: 'ลบค่าใช้จ่ายสำเร็จ' });
});

// ============================================
// EXPENSE REPORTS
// ============================================

// GET /api/expenses/summary - Monthly summary by category
router.get('/summary', async (req: AuthRequest, res) => {
    const { branchId, months = '6' } = req.query;

    const monthsBack = parseInt(months as string);
    const summaryData = [];

    for (let i = 0; i < monthsBack; i++) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date);
        const end = endOfMonth(date);

        const where: any = {
            organizationId: req.user!.organizationId,
            expenseDate: { gte: start, lte: end }
        };
        if (branchId) where.branchId = branchId;

        const expenses = await prisma.expense.groupBy({
            by: ['categoryId'],
            where,
            _sum: { amount: true }
        });

        const categories = await prisma.expenseCategory.findMany({
            where: { organizationId: req.user!.organizationId }
        });

        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        const breakdown = expenses.map(e => ({
            categoryId: e.categoryId,
            categoryName: categoryMap.get(e.categoryId) || 'Unknown',
            amount: Number(e._sum.amount || 0)
        }));

        summaryData.push({
            month: format(date, 'yyyy-MM'),
            monthName: format(date, 'MMMM yyyy'),
            total: breakdown.reduce((sum, b) => sum + b.amount, 0),
            breakdown
        });
    }

    res.json({ success: true, data: summaryData.reverse() });
});

// GET /api/expenses/profit-loss - True P&L Report
router.get('/profit-loss', authorize('CEO', 'ACCOUNTANT'), async (req: AuthRequest, res) => {
    const { branchId, startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : startOfMonth(new Date());
    const end = endDate ? new Date(endDate as string) : endOfMonth(new Date());

    const baseWhere: any = { organizationId: req.user!.organizationId };
    if (branchId) baseWhere.branchId = branchId;

    // 1. Revenue (Sales)
    const sales = await prisma.sale.aggregate({
        where: {
            ...baseWhere,
            saleDate: { gte: start, lte: end },
            status: 'COMPLETED'
        },
        _sum: { totalAmount: true, vatAmount: true }
    });
    const revenue = Number(sales._sum.totalAmount || 0);
    const vatCollected = Number(sales._sum.vatAmount || 0);

    // 2. Cost of Goods Sold (COGS) - Estimate from sales items
    const saleItems = await prisma.saleItem.findMany({
        where: {
            sale: {
                ...baseWhere,
                saleDate: { gte: start, lte: end },
                status: 'COMPLETED'
            }
        },
        include: {
            batch: true
        }
    });

    let cogs = 0;
    for (const item of saleItems) {
        const costPrice = item.batch?.costPrice ? Number(item.batch.costPrice) : 0;
        cogs += costPrice * item.quantity;
    }

    // 3. Operating Expenses
    const expenses = await prisma.expense.aggregate({
        where: {
            organizationId: req.user!.organizationId,
            ...(branchId ? { branchId: branchId as string } : {}),
            expenseDate: { gte: start, lte: end }
        },
        _sum: { amount: true }
    });
    const opex = Number(expenses._sum.amount || 0);

    // 4. Calculate Profit
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - opex;

    res.json({
        success: true,
        data: {
            period: { start, end },
            revenue,
            vatCollected,
            cogs,
            grossProfit,
            grossMargin: revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(2) : 0,
            operatingExpenses: opex,
            netProfit,
            netMargin: revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0
        }
    });
});

export default router;
