import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/reports/sales - Sales report
router.get('/sales', async (req: AuthRequest, res) => {
    const { branchId, startDate, endDate, groupBy = 'day' } = req.query;

    const where: any = { status: { not: 'CANCELLED' } };
    if (branchId) where.branchId = branchId;
    else if (req.user!.branchId) where.branchId = req.user!.branchId;

    if (startDate || endDate) {
        where.saleDate = {};
        if (startDate) where.saleDate.gte = new Date(startDate as string);
        if (endDate) where.saleDate.lte = new Date(endDate as string);
    }

    const sales = await prisma.sale.findMany({
        where,
        include: { branch: true, items: { include: { product: true } } },
        orderBy: { saleDate: 'asc' }
    });

    // Group sales by date
    const groupedData: Record<string, any> = {};

    sales.forEach(sale => {
        let key: string;
        const date = new Date(sale.saleDate);

        if (groupBy === 'month') {
            key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        } else if (groupBy === 'week') {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().slice(0, 10);
        } else {
            key = date.toISOString().slice(0, 10);
        }

        if (!groupedData[key]) {
            groupedData[key] = { date: key, count: 0, subtotal: 0, vat: 0, total: 0, discount: 0 };
        }

        groupedData[key].count++;
        groupedData[key].subtotal += parseFloat(sale.subtotal.toString());
        groupedData[key].vat += parseFloat(sale.vatAmount.toString());
        groupedData[key].total += parseFloat(sale.totalAmount.toString());
        groupedData[key].discount += parseFloat(sale.discountAmount.toString());
    });

    const summary = {
        totalSales: sales.length,
        totalAmount: sales.reduce((sum, s) => sum + parseFloat(s.totalAmount.toString()), 0),
        totalVat: sales.reduce((sum, s) => sum + parseFloat(s.vatAmount.toString()), 0),
        totalDiscount: sales.reduce((sum, s) => sum + parseFloat(s.discountAmount.toString()), 0),
        // Breakdown by payment method
        byPaymentMethod: {
            cash: sales.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + parseFloat(s.totalAmount.toString()), 0),
            transfer: sales.filter(s => ['BANK_TRANSFER', 'QR_PAYMENT'].includes(s.paymentMethod)).reduce((sum, s) => sum + parseFloat(s.totalAmount.toString()), 0),
            credit: sales.filter(s => s.paymentMethod === 'CREDIT').reduce((sum, s) => sum + parseFloat(s.totalAmount.toString()), 0),
        }
    };

    res.json({ success: true, data: { summary, byPeriod: Object.values(groupedData) } });
});

// GET /api/reports/inventory/movement - Stock Card (Movement History)
router.get('/inventory/movement', async (req: AuthRequest, res) => {
    const { branchId, productId, startDate, endDate, limit = '50' } = req.query;

    if (!productId) {
        return res.status(400).json({ success: false, message: 'Product ID is required for Stock Card' });
    }

    const where: any = { productId: productId as string };

    if (branchId) where.branchId = branchId;
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const movements = await prisma.stockMovement.findMany({
        where,
        include: {
            batch: {
                include: {
                    product: {
                        select: { name: true, sku: true, unit: true }
                    }
                }
            },
            branch: {
                select: { name: true }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string)
    });

    const result = movements.map((m: any) => ({
        id: m.id,
        date: m.createdAt,
        type: m.movementType,
        product: m.batch.product.name,
        sku: m.batch.product.sku,
        batch: m.batch.batchNumber,
        quantity: m.quantity,
        reference: m.referenceType ? `${m.referenceType}: ${m.referenceId || '-'}` : m.notes || '-',
        branch: m.branch.name
    }));

    res.json({ success: true, data: result });
});

// GET /api/reports/inventory - Inventory report
router.get('/inventory', async (req: AuthRequest, res) => {
    const { branchId, categoryId, lowStock, expiringSoon } = req.query;

    const branchFilter = branchId ? { branchId: branchId as string } : {};

    // Get VAT inventory
    const vatInventory = await prisma.inventoryVat.findMany({
        where: branchFilter,
        include: { product: { include: { category: true } }, batch: true, branch: true }
    });

    // Get Non-VAT inventory  
    const nonVatInventory = await prisma.inventoryNonVat.findMany({
        where: branchFilter,
        include: { product: { include: { category: true } }, batch: true, branch: true }
    });

    // Calculate values
    const vatValue = vatInventory.reduce((sum, i) => sum + (i.quantity * parseFloat(i.costWithVat.toString())), 0);
    const nonVatValue = nonVatInventory.reduce((sum, i) => sum + (i.quantity * parseFloat(i.costPrice.toString())), 0);

    // Get low stock items
    const products = await prisma.product.findMany({
        where: { organizationId: req.user!.organizationId, isActive: true },
        include: { batches: { where: { isActive: true } } }
    });

    const lowStockItems = products.filter(p => {
        const totalQty = p.batches.reduce((sum, b) => sum + b.quantity, 0);
        return totalQty <= p.reorderPoint;
    });

    // Get expiring soon (30 days)
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const expiringItems = await prisma.productBatch.findMany({
        where: { expiryDate: { lte: thirtyDays }, isActive: true, quantity: { gt: 0 } },
        include: { product: true },
        orderBy: { expiryDate: 'asc' }
    });

    res.json({
        success: true,
        data: {
            summary: {
                vatItems: vatInventory.length,
                vatTotalQuantity: vatInventory.reduce((sum, i) => sum + i.quantity, 0),
                vatTotalValue: vatValue,
                nonVatItems: nonVatInventory.length,
                nonVatTotalQuantity: nonVatInventory.reduce((sum, i) => sum + i.quantity, 0),
                nonVatTotalValue: nonVatValue,
                totalValue: vatValue + nonVatValue
            },
            alerts: {
                lowStock: lowStockItems.map(p => ({ id: p.id, sku: p.sku, name: p.name, reorderPoint: p.reorderPoint, currentStock: p.batches.reduce((s, b) => s + b.quantity, 0) })),
                expiringSoon: expiringItems.map(b => ({ batchId: b.id, productId: b.productId, productName: b.product.name, expiryDate: b.expiryDate, quantity: b.quantity }))
            }
        }
    });
});

// GET /api/reports/tax - VAT/Tax report
router.get('/tax', authorize('CEO', 'ACCOUNTANT'), async (req: AuthRequest, res) => {
    const { startDate, endDate, branchId } = req.query;

    const where: any = { status: { not: 'CANCELLED' } };
    if (branchId) where.branchId = branchId;
    if (startDate || endDate) {
        where.saleDate = {};
        if (startDate) where.saleDate.gte = new Date(startDate as string);
        if (endDate) where.saleDate.lte = new Date(endDate as string);
    }

    const sales = await prisma.sale.findMany({
        where,
        include: { items: true, branch: true }
    });

    // Separate VAT and Non-VAT sales
    let vatSalesTotal = 0;
    let vatAmount = 0;
    let nonVatSalesTotal = 0;

    sales.forEach(sale => {
        sale.items.forEach(item => {
            if (item.isVat) {
                vatSalesTotal += parseFloat(item.totalPrice.toString()) - parseFloat(item.vatAmount.toString());
                vatAmount += parseFloat(item.vatAmount.toString());
            } else {
                nonVatSalesTotal += parseFloat(item.totalPrice.toString());
            }
        });
    });

    // VAT invoices
    const vatInvoices = sales.filter(s => s.isVatInvoice);

    res.json({
        success: true,
        data: {
            period: { startDate, endDate },
            summary: {
                totalSales: sales.length,
                vatSalesAmount: vatSalesTotal,
                outputVat: vatAmount,
                nonVatSalesAmount: nonVatSalesTotal,
                vatInvoiceCount: vatInvoices.length
            },
            vatInvoices: vatInvoices.map(s => ({
                id: s.id,
                invoiceNumber: s.vatInvoiceNumber || s.invoiceNumber,
                date: s.saleDate,
                amount: parseFloat(s.totalAmount.toString()),
                vat: parseFloat(s.vatAmount.toString()),
                branch: s.branch.name
            }))
        }
    });
});

// GET /api/reports/products - Product performance report
router.get('/products', async (req: AuthRequest, res) => {
    const { startDate, endDate, limit = '20' } = req.query;

    const where: any = { sale: { status: { not: 'CANCELLED' } } };
    if (startDate || endDate) {
        where.sale = { ...where.sale, saleDate: {} };
        if (startDate) where.sale.saleDate.gte = new Date(startDate as string);
        if (endDate) where.sale.saleDate.lte = new Date(endDate as string);
    }

    const topProducts = await prisma.saleItem.groupBy({
        by: ['productId'],
        where,
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: parseInt(limit as string)
    });

    const productsWithDetails = await Promise.all(
        topProducts.map(async (p) => {
            const product = await prisma.product.findUnique({ where: { id: p.productId }, include: { category: true } });
            return {
                id: p.productId,
                sku: product?.sku,
                name: product?.name,
                category: product?.category?.name,
                quantitySold: p._sum.quantity,
                totalRevenue: parseFloat(p._sum.totalPrice?.toString() || '0')
            };
        })
    );

    res.json({ success: true, data: productsWithDetails });
});

// GET /api/reports/distributors - Distributor performance
router.get('/distributors', authorize('CEO', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    const { startDate, endDate } = req.query;

    const where: any = { distributorId: { not: null }, status: { not: 'CANCELLED' } };
    if (startDate || endDate) {
        where.saleDate = {};
        if (startDate) where.saleDate.gte = new Date(startDate as string);
        if (endDate) where.saleDate.lte = new Date(endDate as string);
    }

    const sales = await prisma.sale.groupBy({
        by: ['distributorId'],
        where,
        _sum: { totalAmount: true },
        _count: true
    });

    const distributorsWithDetails = await Promise.all(
        sales.map(async (s) => {
            if (!s.distributorId) return null;
            const distributor = await prisma.distributor.findUnique({ where: { id: s.distributorId } });
            const totalSales = parseFloat(s._sum.totalAmount?.toString() || '0');
            const commission = totalSales * (parseFloat(distributor?.commissionRate.toString() || '0') / 100);
            return {
                id: s.distributorId,
                name: distributor?.name,
                territory: distributor?.territory,
                salesCount: s._count,
                totalSales,
                commissionRate: distributor?.commissionRate,
                commission
            };
        })
    );

    res.json({ success: true, data: distributorsWithDetails.filter(Boolean) });
});

// GET /api/reports/profit-loss - Basic Profit & Loss (Revenue vs COGS)
router.get('/profit-loss', authorize('CEO', 'ACCOUNTANT'), async (req: AuthRequest, res) => {
    try {
        const { startDate, endDate, branchId } = req.query;

        const where: any = { status: 'COMPLETED' };
        if (branchId) where.branchId = branchId;

        // Date filter
        if (startDate || endDate) {
            where.saleDate = {};
            if (startDate) where.saleDate.gte = new Date(startDate as string);
            if (endDate) where.saleDate.lte = new Date(endDate as string);
        } else {
            // Default to current month
            const start = startOfMonth(new Date());
            where.saleDate = { gte: start };
        }

        const sales = await prisma.sale.findMany({
            where,
            include: {
                items: {
                    include: {
                        batch: true,
                        product: true
                    }
                }
            }
        });

        let totalRevenue = 0;
        let totalCost = 0;

        sales.forEach(sale => {
            // Revenue (excluding VAT is better for P&L, but simplify to totalAmount - vatAmount)
            // Or use subtotal (which is usually ex-vat or inc-vat depending on logic, let's use logic: price - vat)

            sale.items.forEach(item => {
                const itemTotal = Number(item.totalPrice);
                const itemVat = Number(item.vatAmount);
                const netSales = itemTotal - itemVat;

                totalRevenue += netSales;

                // Cost
                const quantity = item.quantity;
                // Prefer batch cost, fallback to current product cost
                const unitCost = Number(item.batch?.costPrice || item.product.costPrice || 0);
                totalCost += (quantity * unitCost);
            });
        });

        const grossProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        res.json({
            success: true,
            data: {
                period: { startDate, endDate },
                revenue: totalRevenue,
                cogs: totalCost,
                grossProfit: grossProfit,
                profitMargin: profitMargin.toFixed(2)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to generate P&L report' });
    }
});

export default router;
