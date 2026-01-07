import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /api/dashboard - Get dashboard data
router.get('/', async (req: AuthRequest, res) => {
    const { branchId, period = 'today' } = req.query;

    const targetBranchId = branchId as string || req.user!.branchId;

    // Date ranges
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const branchFilter = targetBranchId ? { branchId: targetBranchId } : {};

    // Get today's sales
    const todaySales = await prisma.sale.aggregate({
        where: {
            ...branchFilter,
            saleDate: { gte: today, lt: tomorrow },
            status: { not: 'CANCELLED' }
        },
        _sum: { totalAmount: true, vatAmount: true },
        _count: true
    });

    // Get this month's sales
    const monthSales = await prisma.sale.aggregate({
        where: {
            ...branchFilter,
            saleDate: { gte: thisMonthStart },
            status: { not: 'CANCELLED' }
        },
        _sum: { totalAmount: true, vatAmount: true },
        _count: true
    });

    // Get last month's sales for comparison
    const lastMonthSales = await prisma.sale.aggregate({
        where: {
            ...branchFilter,
            saleDate: { gte: lastMonthStart, lte: lastMonthEnd },
            status: { not: 'CANCELLED' }
        },
        _sum: { totalAmount: true }
    });

    // Get inventory counts
    const [vatInventory, nonVatInventory] = await Promise.all([
        prisma.inventoryVat.aggregate({
            where: targetBranchId ? { branchId: targetBranchId } : {},
            _sum: { quantity: true },
            _count: true
        }),
        prisma.inventoryNonVat.aggregate({
            where: targetBranchId ? { branchId: targetBranchId } : {},
            _sum: { quantity: true },
            _count: true
        })
    ]);

    // Get low stock alerts
    const lowStockItems = await prisma.product.findMany({
        where: {
            organizationId: req.user!.organizationId,
            isActive: true
        },
        include: {
            batches: {
                where: { isActive: true }
            }
        }
    });

    const lowStockCount = lowStockItems.filter(p => {
        const totalQty = p.batches.reduce((sum, b) => sum + b.quantity, 0);
        return totalQty <= p.reorderPoint;
    }).length;

    // Get expiring soon (30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringBatches = await prisma.productBatch.count({
        where: {
            expiryDate: { lte: thirtyDaysFromNow },
            isActive: true,
            quantity: { gt: 0 }
        }
    });

    // Get pending OEM orders
    const pendingOemOrders = await prisma.oemOrder.count({
        where: {
            status: { in: ['SENT', 'CONFIRMED', 'IN_PRODUCTION'] }
        }
    });

    // Get recent sales for activity feed
    const recentSales = await prisma.sale.findMany({
        where: {
            ...branchFilter,
            status: { not: 'CANCELLED' }
        },
        include: {
            user: { select: { firstName: true, lastName: true } },
            branch: { select: { name: true } }
        },
        orderBy: { saleDate: 'desc' },
        take: 5
    });

    // Get recent goods receiving
    const recentReceiving = await prisma.goodsReceiving.findMany({
        where: targetBranchId ? { branchId: targetBranchId } : {},
        include: {
            branch: { select: { name: true } }
        },
        orderBy: { receivingDate: 'desc' },
        take: 5
    });

    // Calculate growth
    const lastMonthTotal = parseFloat(lastMonthSales._sum.totalAmount?.toString() || '0');
    const thisMonthTotal = parseFloat(monthSales._sum.totalAmount?.toString() || '0');
    const growthPercent = lastMonthTotal > 0
        ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1)
        : '0';

    res.json({
        success: true,
        data: {
            sales: {
                today: {
                    count: todaySales._count,
                    amount: parseFloat(todaySales._sum.totalAmount?.toString() || '0'),
                    vat: parseFloat(todaySales._sum.vatAmount?.toString() || '0')
                },
                thisMonth: {
                    count: monthSales._count,
                    amount: parseFloat(monthSales._sum.totalAmount?.toString() || '0'),
                    vat: parseFloat(monthSales._sum.vatAmount?.toString() || '0')
                },
                growthPercent: parseFloat(growthPercent)
            },
            inventory: {
                vatItems: vatInventory._count,
                vatQuantity: vatInventory._sum.quantity || 0,
                nonVatItems: nonVatInventory._count,
                nonVatQuantity: nonVatInventory._sum.quantity || 0,
                totalItems: (vatInventory._count || 0) + (nonVatInventory._count || 0),
                totalQuantity: (vatInventory._sum.quantity || 0) + (nonVatInventory._sum.quantity || 0)
            },
            alerts: {
                lowStock: lowStockCount,
                expiringSoon: expiringBatches,
                pendingOem: pendingOemOrders
            },
            recentActivity: {
                sales: recentSales.map(s => ({
                    id: s.id,
                    invoiceNumber: s.invoiceNumber,
                    amount: parseFloat(s.totalAmount.toString()),
                    date: s.saleDate,
                    user: `${s.user.firstName} ${s.user.lastName}`,
                    branch: s.branch.name
                })),
                receiving: recentReceiving.map(r => ({
                    id: r.id,
                    grNumber: r.grNumber,
                    date: r.receivingDate,
                    status: r.status,
                    branch: r.branch.name
                }))
            }
        }
    });
});

// GET /api/dashboard/ceo - CEO specific dashboard
router.get('/ceo', authorize('CEO'), async (req: AuthRequest, res) => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get all branches performance
    const branches = await prisma.branch.findMany({
        where: { organizationId: req.user!.organizationId, isActive: true },
        include: {
            sales: {
                where: {
                    saleDate: { gte: thisMonthStart },
                    status: { not: 'CANCELLED' }
                }
            }
        }
    });

    const branchPerformance = branches.map(b => ({
        id: b.id,
        name: b.name,
        code: b.code,
        salesCount: b.sales.length,
        totalSales: b.sales.reduce((sum, s) => sum + parseFloat(s.totalAmount.toString()), 0)
    })).sort((a, b) => b.totalSales - a.totalSales);

    // Get top products
    const topProducts = await prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
            sale: {
                saleDate: { gte: thisMonthStart },
                status: { not: 'CANCELLED' }
            }
        },
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 10
    });

    const topProductsWithDetails = await Promise.all(
        topProducts.map(async (p) => {
            const product = await prisma.product.findUnique({
                where: { id: p.productId }
            });
            return {
                id: p.productId,
                name: product?.name || 'Unknown',
                sku: product?.sku || '',
                quantitySold: p._sum.quantity || 0,
                totalSales: parseFloat(p._sum.totalPrice?.toString() || '0')
            };
        })
    );

    // Revenue by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailySales = await prisma.sale.findMany({
        where: {
            saleDate: { gte: thirtyDaysAgo },
            status: { not: 'CANCELLED' }
        },
        select: {
            saleDate: true,
            totalAmount: true
        }
    });

    // Group by date
    const revenueByDay: Record<string, number> = {};
    dailySales.forEach(s => {
        const dateKey = s.saleDate.toISOString().slice(0, 10);
        revenueByDay[dateKey] = (revenueByDay[dateKey] || 0) + parseFloat(s.totalAmount.toString());
    });

    // Get distributor performance
    const distributorSales = await prisma.sale.groupBy({
        by: ['distributorId'],
        where: {
            distributorId: { not: null },
            saleDate: { gte: thisMonthStart },
            status: { not: 'CANCELLED' }
        },
        _sum: { totalAmount: true },
        _count: true
    });

    const distributorPerformance = await Promise.all(
        distributorSales.map(async (d) => {
            if (!d.distributorId) return null;
            const distributor = await prisma.distributor.findUnique({
                where: { id: d.distributorId }
            });
            return {
                id: d.distributorId,
                name: distributor?.name || 'Unknown',
                salesCount: d._count,
                totalSales: parseFloat(d._sum.totalAmount?.toString() || '0')
            };
        })
    );

    res.json({
        success: true,
        data: {
            branchPerformance,
            topProducts: topProductsWithDetails,
            revenueByDay,
            distributorPerformance: distributorPerformance.filter(Boolean),
            summary: {
                totalBranches: branches.length,
                activeBranches: branches.filter(b => b.sales.length > 0).length,
                totalRevenue: branchPerformance.reduce((sum, b) => sum + b.totalSales, 0),
                totalTransactions: branchPerformance.reduce((sum, b) => sum + b.salesCount, 0)
            }
        }
    });
});

export default router;
