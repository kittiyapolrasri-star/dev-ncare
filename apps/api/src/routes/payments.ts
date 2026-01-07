import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { generatePromptPayPayload } from '../utils/promptpay.js';
import { prisma } from '../lib/prisma.js';

const router = Router();
router.use(authenticate);

// POST /api/payments/generate-qr
// Generate PromptPay QR Payload
router.post('/generate-qr', async (req, res) => {
    try {
        const { amount } = req.body;

        // 1. Get Organization/Branch PromptPay ID from Settings
        // Fallback: Use a default ID if not set (Sandbox/Demo)
        const organizationId = req.user!.organizationId;
        const org = await prisma.organization.findUnique({
            where: { id: organizationId }
        });

        const settings = org?.settings as any;
        const promptPayId = settings?.promptPayId || '0812345678'; // Default/Demo ID

        if (!amount) {
            return res.status(400).json({ success: false, message: 'Amount is required' });
        }

        const payload = generatePromptPayPayload(promptPayId, parseFloat(amount));

        res.json({
            success: true,
            data: {
                payload,
                amount,
                target: promptPayId
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
