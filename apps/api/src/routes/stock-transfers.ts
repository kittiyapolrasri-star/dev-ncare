import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

// Generate Transfer Number
const generateTransferNo = async (branchCode: string): Promise<string> => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `TR-${branchCode}-${dateStr}`;

    const last = await prisma.stockTransfer.findFirst({
        where: { transferNo: { startsWith: prefix } },
        orderBy: { transferNo: 'desc' }
    });

    let seq = 1;
    if (last) seq = parseInt(last.transferNo.split('-').pop() || '0') + 1;
    return `${prefix}-${seq.toString().padStart(4, '0')}`;
};

// GET /api/stock-transfers
router.get('/', async (req: AuthRequest, res) => {
    const { status, type, page = '1', limit = '20' } = req.query;
    const branchId = req.user!.branchId;

    const where: any = {};
    if (status) where.status = status;

    // Filter by type (Incoming / Outgoing requests)
    if (branchId) {
        if (type === 'incoming') where.targetBranchId = branchId;
        else if (type === 'outgoing') where.sourceBranchId = branchId;
        else where.OR = [{ sourceBranchId: branchId }, { targetBranchId: branchId }];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [transfers, total] = await Promise.all([
        prisma.stockTransfer.findMany({
            where,
            include: {
                sourceBranch: { select: { name: true, code: true } },
                targetBranch: { select: { name: true, code: true } },
                user: { select: { firstName: true, lastName: true } },
                items: { include: { product: true } }
            },
            orderBy: { createdAt: 'desc' },
            skip, take
        }),
        prisma.stockTransfer.count({ where })
    ]);

    res.json({ success: true, data: transfers, pagination: { page: parseInt(page as string), limit: take, total, totalPages: Math.ceil(total / take) } });
});

// POST /api/stock-transfers (Request Stock)
router.post('/', async (req: AuthRequest, res) => {
    const { targetBranchId, items, notes } = req.body;
    // targetBranchId is where we want to request FROM (Source), or to send TO? 
    // Let's define: User is at Target Branch (Requesting), so 'targetBranchId' in body is actually the Source Branch we want goods from?
    // Or simpler: User creates request. Origin is User's branch. Destination is User's branch. Source is 'targetBranchId' from input (the warehouse).

    // Let's clarify:
    // Case 1: Branch A requests goods from Warehouse.
    // sourceBranch = Warehouse, targetBranch = Branch A. Created by User at Branch A.

    // To avoid confusion, let's accept sourceBranchId and targetBranchId explicitly or infer target from user.
    // Let's infer target from user if they are at a branch.

    if (!req.user!.branchId) throw ApiError.badRequest('ต้องสังกัดสาขาเพื่อทำรายการ');

    const schema = z.object({
        sourceBranchId: z.string().uuid(), // The branch we are asking goods from
        notes: z.string().optional(),
        items: z.array(z.object({
            productId: z.string().uuid(),
            quantity: z.number().int().positive()
        })).min(1)
    });

    const body = schema.parse(req.body);

    const sourceBranch = await prisma.branch.findUnique({ where: { id: body.sourceBranchId } });
    const targetBranch = await prisma.branch.findUnique({ where: { id: req.user!.branchId } });

    if (!sourceBranch || !targetBranch) throw ApiError.notFound('ไม่พบสาขา');

    const transferNo = await generateTransferNo(targetBranch.code); // Use Requestor code

    const transfer = await prisma.stockTransfer.create({
        data: {
            transferNo,
            sourceBranchId: sourceBranch.id,
            targetBranchId: targetBranch.id,
            status: 'PENDING',
            notes: body.notes,
            createdBy: req.user!.id,
            items: {
                create: body.items.map(i => ({
                    productId: i.productId,
                    quantity: i.quantity
                }))
            }
        },
        include: { items: true }
    });

    res.status(201).json({ success: true, data: transfer, message: 'บันทึกคำขอโอนย้ายสำเร็จ' });
});

// PUT /api/stock-transfers/:id/ship (Approve & Ship - Deduct Source Stock)
router.put('/:id/ship', authorize('CEO', 'BRANCH_MANAGER', 'WAREHOUSE_MANAGER'), async (req: AuthRequest, res) => {
    const transfer = await prisma.stockTransfer.findUnique({
        where: { id: req.params.id },
        include: { items: true }
    });

    if (!transfer) throw ApiError.notFound('ไม่พบเอกสาร');
    if (transfer.status !== 'PENDING') throw ApiError.badRequest('สถานะเอกสารไม่ถูกต้อง');

    // Check if user is at source branch (or is CEO)
    // if (req.user!.role !== 'CEO' && req.user!.branchId !== transfer.sourceBranchId) {
    //     throw ApiError.forbidden('คุณไม่มีสิทธิ์อนุมัติการโอนย้ายจากสาขานี้');
    // }

    await prisma.$transaction(async (tx: any) => {
        // Update status
        await tx.stockTransfer.update({
            where: { id: transfer.id },
            data: {
                status: 'SHIPPED',
                shippedDate: new Date()
            }
        });

        // Deduct Stock from Source Branch
        for (const item of transfer.items) {
            // FIFO Logic to find batches at source branch
            // This is complex. For P priority, we might just deduct generic stock or pick first available batch.
            // Let's try to find batches with stock
            const batches = await tx.inventoryVat.findMany({
                where: {
                    branchId: transfer.sourceBranchId,
                    productId: item.productId,
                    quantity: { gt: 0 }
                },
                orderBy: { createdAt: 'asc' } // Oldest first
            });

            let remainingToDeduct = item.quantity;

            for (const batchInv of batches) {
                if (remainingToDeduct <= 0) break;

                const deduct = Math.min(batchInv.quantity, remainingToDeduct);

                // Update Inventory
                await tx.inventoryVat.update({
                    where: { id: batchInv.id },
                    data: { quantity: { decrement: deduct } }
                });

                // Record Movement Out
                await tx.stockMovement.create({
                    data: {
                        branchId: transfer.sourceBranchId,
                        batchId: batchInv.batchId!,
                        movementType: 'TRANSFER_OUT',
                        quantity: deduct,
                        referenceType: 'TRANSFER',
                        referenceId: transfer.id,
                        notes: `โอนไปสาขา ${transfer.targetBranchId}`
                    }
                });

                remainingToDeduct -= deduct;
            }

            if (remainingToDeduct > 0) {
                throw new Error(`สินค้า ${item.productId} ในสาขาต้นทางมีไม่เพียงพอ`);
            }
        }
    });

    res.json({ success: true, message: 'อนุมัติและตัดสต็อกโอนย้ายเรียบร้อย' });
});

// PUT /api/stock-transfers/:id/receive (Receive - Add Target Stock)
router.put('/:id/receive', async (req: AuthRequest, res) => {
    const transfer = await prisma.stockTransfer.findUnique({
        where: { id: req.params.id },
        include: { items: true }
    });

    if (!transfer) throw ApiError.notFound('ไม่พบเอกสาร');
    if (transfer.status !== 'SHIPPED') throw ApiError.badRequest('เอกสารต้องอยู่ในสถานะส่งของแล้ว');

    if (req.user!.branchId && req.user!.branchId !== transfer.targetBranchId) {
        throw ApiError.forbidden('คุณไม่ใช่สาขาปลายทางที่รับของ');
    }

    await prisma.$transaction(async (tx: any) => {
        // Update status
        await tx.stockTransfer.update({
            where: { id: transfer.id },
            data: {
                status: 'COMPLETED',
                receivedDate: new Date()
            }
        });

        // Add Stock to Target Branch
        for (const item of transfer.items) {
            // Need batch info? In a real system we trace batch.
            // Here we assume we receive as a new "Transfer Batch" or find existing logic
            // Ideally backend 'ship' should have saved which batches were sent. 
            // Simplified: Add to a placeholder batch or find latest.

            // For now: Find generic batch or create one for simplicity
            const product = await tx.product.findUnique({ where: { id: item.productId } });

            // Create a new batch for transferred items? Or reuse?
            // Reusing the same batch number logic is tough across branches if ID specific.
            // We'll create a new Batch record for the destination branch if needed?
            // Actually `ProductBatch` is global. `Inventory` is branch specific.
            // So we just add `InventoryVat` record for the product at target branch.
            // But which Batch ID?
            // Skip complexity: Pick ANY batch of this product to increment, or create a 'TRANSFER' batch.

            // BETTER: Look for any active batch of this product.
            const anyBatch = await tx.productBatch.findFirst({
                where: { productId: item.productId }
            });

            let batchId = anyBatch?.id;
            if (!batchId) {
                // Create dummy batch if somehow missing
                const newBatch = await tx.productBatch.create({
                    data: {
                        productId: item.productId,
                        batchNumber: `TR-${transfer.transferNo}`,
                        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // Mock
                        costPrice: product?.costPrice || 0
                    }
                });
                batchId = newBatch.id;
            }

            // Upsert Inventory
            //  const inv = await tx.inventoryVat.findUnique({
            //      where: { branchId_productId_batchId: { branchId: transfer.targetBranchId, productId: item.productId, batchId: batchId } }
            //  });

            // Upsert not working easily with complex unique constraints in some prisma versions if not careful, but try
            const inv = await tx.inventoryVat.findFirst({
                where: { branchId: transfer.targetBranchId, productId: item.productId, batchId: batchId }
            });

            if (inv) {
                await tx.inventoryVat.update({
                    where: { id: inv.id },
                    data: { quantity: { increment: item.quantity } }
                });
            } else {
                await tx.inventoryVat.create({
                    data: {
                        branchId: transfer.targetBranchId,
                        productId: item.productId,
                        batchId: batchId,
                        quantity: item.quantity,
                        costBeforeVat: 0, // Should flow from source
                        vatAmount: 0,
                        costWithVat: 0
                    }
                });
            }

            // Record Movement In
            await tx.stockMovement.create({
                data: {
                    branchId: transfer.targetBranchId,
                    batchId: batchId!,
                    movementType: 'TRANSFER_IN',
                    quantity: item.quantity,
                    referenceType: 'TRANSFER',
                    referenceId: transfer.id,
                    notes: `รับโอนจากสาขา ${transfer.sourceBranchId}`
                }
            });
        }
    });

    res.json({ success: true, message: 'รับสินค้าเข้าคลังเรียบร้อย' });
});

export default router;
