import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

router.use(authenticate);

// Helper to calculate aging buckets
const calculateAging = (dueDate: Date | null, amount: number) => {
    if (!dueDate) return { bucket: 'current', amount };

    const today = new Date();
    const diffTime = Math.abs(today.getTime() - new Date(dueDate).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (new Date(dueDate) > today) return { bucket: 'not_due', amount };
    if (diffDays <= 30) return { bucket: '0-30', amount };
    if (diffDays <= 60) return { bucket: '31-60', amount };
    if (diffDays <= 90) return { bucket: '61-90', amount };
    return { bucket: '>90', amount };
};

// GET /api/finance/aging/ar - Accounts Receivable (ลูกหนี้การค้า)
router.get('/aging/ar', authorize('CEO', 'ACCOUNTANT', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    const { branchId, customerId } = req.query;

    const where: any = {
        paymentStatus: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        paymentMethod: 'CREDIT',
        status: { not: 'CANCELLED' }
    };

    if (branchId) where.branchId = branchId;
    if (customerId) where.customerId = customerId;

    // Get unpaid sales
    const unpaidSales = await prisma.sale.findMany({
        where,
        include: {
            customer: {
                select: { id: true, name: true, code: true, creditLimit: true, paymentTerms: true }
            }
        },
        orderBy: { saleDate: 'asc' }
    });

    // Group by customer and aging buckets
    const agingReport: Record<string, any> = {};
    const summary = {
        totalReceivable: 0,
        notDue: 0,
        overdue30: 0,
        overdue60: 0,
        overdue90: 0,
        overdueMore: 0
    };

    for (const sale of unpaidSales) {
        const customerId = sale.customerId || 'unknown';
        const customerName = sale.customer?.name || 'ลูกค้าทั่วไป';

        if (!agingReport[customerId]) {
            agingReport[customerId] = {
                customerId,
                customerName,
                totalAmount: 0,
                buckets: {
                    not_due: 0,
                    '0-30': 0,
                    '31-60': 0,
                    '61-90': 0,
                    '>90': 0
                },
                invoices: []
            };
        }

        const outstandingAmount = Number(sale.totalAmount) - Number(sale.amountPaid);
        if (outstandingAmount <= 0) continue;

        // Determine bucket
        let bucket = 'not_due';
        const today = new Date();
        const saleDate = new Date(sale.saleDate);

        // Calculate due date if not present
        let dueDate = sale.dueDate ? new Date(sale.dueDate) : null;
        if (!dueDate && sale.customer?.paymentTerms) {
            dueDate = new Date(saleDate);
            dueDate.setDate(dueDate.getDate() + sale.customer.paymentTerms);
        }

        if (dueDate && dueDate < today) {
            const diffTime = Math.abs(today.getTime() - dueDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 30) bucket = '0-30';
            else if (diffDays <= 60) bucket = '31-60';
            else if (diffDays <= 90) bucket = '61-90';
            else bucket = '>90';
        }

        // Add to customer totals
        agingReport[customerId].totalAmount += outstandingAmount;
        agingReport[customerId].buckets[bucket] += outstandingAmount;

        agingReport[customerId].invoices.push({
            id: sale.id,
            invoiceNumber: sale.invoiceNumber,
            date: sale.saleDate,
            dueDate,
            amount: Number(sale.totalAmount),
            paid: Number(sale.amountPaid),
            outstanding: outstandingAmount,
            bucket
        });

        // Add to summary
        summary.totalReceivable += outstandingAmount;
        if (bucket === 'not_due') summary.notDue += outstandingAmount;
        else if (bucket === '0-30') summary.overdue30 += outstandingAmount;
        else if (bucket === '31-60') summary.overdue60 += outstandingAmount;
        else if (bucket === '61-90') summary.overdue90 += outstandingAmount;
        else if (bucket === '>90') summary.overdueMore += outstandingAmount;
    }

    res.json({
        success: true,
        data: {
            summary,
            details: Object.values(agingReport)
        }
    });
});

// GET /api/finance/aging/ap - Accounts Payable (เจ้าหนี้การค้า)
router.get('/aging/ap', authorize('CEO', 'ACCOUNTANT', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    const { branchId, supplierId } = req.query;

    // In schema, Purchase model needs paymentStatus
    const where: any = {
        paymentStatus: { in: ['PENDING', 'PARTIAL'] }, // Assuming PENDING/PARTIAL means unpaid
        status: { in: ['RECEIVED', 'ORDERED'] } // Only confirmed orders
    };

    if (branchId) where.branchId = branchId;
    if (supplierId) where.supplierId = supplierId;

    const unpaidPurchases = await prisma.purchase.findMany({
        where,
        include: {
            supplier: {
                select: { id: true, name: true, code: true, paymentTerms: true }
            }
        },
        orderBy: { orderDate: 'asc' }
    });

    const agingReport: Record<string, any> = {};
    const summary = {
        totalPayable: 0,
        notDue: 0,
        overdue30: 0,
        overdue60: 0,
        overdue90: 0,
        overdueMore: 0
    };

    for (const po of unpaidPurchases) {
        const supplierId = po.supplierId;
        const supplierName = po.supplier.name;

        if (!agingReport[supplierId]) {
            agingReport[supplierId] = {
                supplierId,
                supplierName,
                totalAmount: 0,
                buckets: {
                    not_due: 0,
                    '0-30': 0,
                    '31-60': 0,
                    '61-90': 0,
                    '>90': 0
                },
                documents: []
            };
        }

        // Need amountPaid in Purchase model (added in schema update)
        const totalAmount = Number(po.totalAmount);
        const amountPaid = Number((po as any).amountPaid || 0);
        const outstandingAmount = totalAmount - amountPaid;

        if (outstandingAmount <= 0) continue;

        let bucket = 'not_due';
        const today = new Date();
        const poDate = new Date(po.orderDate);

        let dueDate = (po as any).dueDate ? new Date((po as any).dueDate) : null;
        if (!dueDate && po.supplier.paymentTerms) {
            dueDate = new Date(poDate);
            dueDate.setDate(dueDate.getDate() + po.supplier.paymentTerms);
        }

        if (dueDate && dueDate < today) {
            const diffTime = Math.abs(today.getTime() - dueDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 30) bucket = '0-30';
            else if (diffDays <= 60) bucket = '31-60';
            else if (diffDays <= 90) bucket = '61-90';
            else bucket = '>90';
        }

        agingReport[supplierId].totalAmount += outstandingAmount;
        agingReport[supplierId].buckets[bucket] += outstandingAmount;

        agingReport[supplierId].documents.push({
            id: po.id,
            poNumber: po.poNumber,
            date: po.orderDate,
            dueDate,
            amount: totalAmount,
            paid: amountPaid,
            outstanding: outstandingAmount,
            bucket
        });

        summary.totalPayable += outstandingAmount;
        if (bucket === 'not_due') summary.notDue += outstandingAmount;
        else if (bucket === '0-30') summary.overdue30 += outstandingAmount;
        else if (bucket === '31-60') summary.overdue60 += outstandingAmount;
        else if (bucket === '61-90') summary.overdue90 += outstandingAmount;
        else if (bucket === '>90') summary.overdueMore += outstandingAmount;
    }

    res.json({
        success: true,
        data: {
            summary,
            details: Object.values(agingReport)
        }
    });
});

// POST /api/finance/payments - Record Payment (Receipt or Payment Voucher)
router.post('/payments', authorize('AO', 'ACCOUNTANT', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    try {
        const {
            type, // 'AR' (Receive) or 'AP' (Pay)
            documentId, // Sale ID or Purchase ID
            amount,
            paymentMethod,
            reference,
            notes
        } = req.body;

        const paymentAmount = Number(amount);
        const paymentNumber = `PAY-${Date.now()}`; // Simple generation

        const result = await prisma.$transaction(async (tx) => {
            // Create Payment Record
            const payment = await tx.payment.create({
                data: {
                    paymentNumber,
                    amount: paymentAmount,
                    paymentMethod,
                    reference,
                    notes,
                    type: type === 'AR' ? 'INCOME' : 'EXPENSE',
                    saleId: type === 'AR' ? documentId : undefined,
                    purchaseId: type === 'AP' ? documentId : undefined,
                }
            });

            // Update Status
            if (type === 'AR') {
                const sale = await tx.sale.findUnique({ where: { id: documentId } });
                if (!sale) throw new Error('Sale not found');

                const newAmountPaid = Number(sale.amountPaid) + paymentAmount;
                const status = newAmountPaid >= Number(sale.totalAmount) ? 'PAID' : 'PARTIAL';

                await tx.sale.update({
                    where: { id: documentId },
                    data: {
                        amountPaid: newAmountPaid,
                        paymentStatus: status
                    }
                });
            } else {
                const purchase = await tx.purchase.findUnique({ where: { id: documentId } });
                if (!purchase) throw new Error('Purchase not found');

                // Cast to any because fields might be missing in older generated client
                const currentPaid = Number((purchase as any).amountPaid || 0);
                const newAmountPaid = currentPaid + paymentAmount;
                const status = newAmountPaid >= Number(purchase.totalAmount) ? 'PAID' : 'PARTIAL';

                await tx.purchase.update({
                    where: { id: documentId },
                    data: {
                        amountPaid: newAmountPaid, // schema updated
                        paymentStatus: status as any // schema updated
                    }
                });
            }

            return payment;
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to record payment' });
    }
});

export default router;
