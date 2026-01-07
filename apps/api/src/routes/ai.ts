import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { subDays, addDays, format, startOfDay, endOfDay } from 'date-fns';

const router = Router();

router.use(authenticate);

// Simple Linear Regression for Forecasting
function calculateTrend(data: number[]) {
    const n = data.length;
    if (n === 0) return { slope: 0, intercept: 0 };

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
}

// GET /api/ai/forecast/sales - Sales Forecast
router.get('/forecast/sales', authorize('CEO', 'ACCOUNTANT', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    try {
        const { days = 7, branchId } = req.query;
        const historyDays = 30; // Look back 30 days
        const forecastDays = Number(days);

        const startDate = subDays(new Date(), historyDays);

        const where: any = {
            saleDate: { gte: startDate },
            status: 'COMPLETED'
        };
        if (branchId) where.branchId = branchId;

        const sales = await prisma.sale.groupBy({
            by: ['saleDate'],
            where,
            _sum: { totalAmount: true },
            orderBy: { saleDate: 'asc' }
        });

        // Prepare data for regression
        // Map sales to a full 30-day array (filling missing days with 0)
        const dailySales: number[] = [];
        const dateMap = new Map<string, number>();

        sales.forEach(s => {
            const dateStr = format(new Date(s.saleDate), 'yyyy-MM-dd');
            dateMap.set(dateStr, Number(s._sum.totalAmount));
        });

        for (let i = 0; i < historyDays; i++) {
            const d = addDays(startDate, i);
            const key = format(d, 'yyyy-MM-dd');
            dailySales.push(dateMap.get(key) || 0);
        }

        // Calculate Trend
        const { slope, intercept } = calculateTrend(dailySales);

        // Generate Forecast
        const forecastData = [];
        const today = new Date();

        for (let i = 1; i <= forecastDays; i++) {
            const predictedValue = slope * (historyDays + i) + intercept;
            // Ensure no negative sales forecast
            const value = Math.max(0, predictedValue);

            forecastData.push({
                date: format(addDays(today, i), 'yyyy-MM-dd'),
                amount: Math.round(value * 100) / 100,
                isForecast: true
            });
        }

        res.json({
            success: true,
            data: {
                history: sales.map(s => ({
                    date: format(new Date(s.saleDate), 'yyyy-MM-dd'),
                    amount: Number(s._sum.totalAmount),
                    isForecast: false
                })),
                forecast: forecastData,
                trend: slope > 0 ? 'up' : slope < 0 ? 'down' : 'stable',
                confidence: 85 // Mock confidence for now
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to generate forecast' });
    }
});

// GET /api/ai/reorder-suggestions - Smart Reorder
router.get('/reorder-suggestions', authorize('CEO', 'PHARMACIST', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    try {
        const { branchId } = req.query;

        // 1. Get Low Stock Items
        const products = await prisma.product.findMany({
            where: {
                isActive: true,
                organizationId: req.user!.organizationId
            },
            include: {
                batches: {
                    where: {
                        isActive: true,
                        quantity: { gt: 0 }
                    }
                }
            }
        });

        // 2. Fetch Sales History for each product (Last 30 days) to calculate average daily usage
        const thirtyDaysAgo = subDays(new Date(), 30);

        const suggestions = [];

        for (const product of products) {
            const currentStock = product.batches.reduce((sum, b) => sum + b.quantity, 0);

            // Only analyze if stock is below reorder point or relatively low
            if (currentStock <= product.reorderPoint) {

                // Calculate average daily consumption
                const sales = await prisma.saleItem.aggregate({
                    where: {
                        productId: product.id,
                        sale: {
                            saleDate: { gte: thirtyDaysAgo },
                            status: 'COMPLETED'
                        }
                    },
                    _sum: { quantity: true }
                });

                const totalSold = Number(sales._sum.quantity || 0);
                const avgDailyUsage = totalSold / 30;

                // If item is moving, suggest reorder
                if (avgDailyUsage > 0 || currentStock < product.reorderPoint) {
                    // Lead time assumption: 7 days (or user setting)
                    const leadTime = 7;
                    const safetyStock = Math.ceil(avgDailyUsage * 3); // 3 days safety buffer

                    // Suggested Order = (AvgUsage * LeadTime) + SafetyStock - CurrentStock
                    let suggestion = Math.ceil((avgDailyUsage * leadTime) + safetyStock - currentStock);

                    // Respect Reorder Qty (Minimum order quantity)
                    suggestion = Math.max(suggestion, product.reorderQty);

                    suggestions.push({
                        productId: product.id,
                        name: product.name,
                        sku: product.sku,
                        currentStock,
                        reorderPoint: product.reorderPoint,
                        avgDailyUsage: avgDailyUsage.toFixed(2),
                        suggestedQuantity: suggestion,
                        reason: currentStock === 0 ? 'Out of Stock' : 'Below Safety Level'
                    });
                }
            }
        }

        res.json({ success: true, data: suggestions });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to generate reorder suggestions' });
    }
});

export default router;
