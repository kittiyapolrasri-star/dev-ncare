import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';


const router = Router();

router.use(authenticate);

// GET /api/settings
router.get('/', async (req: AuthRequest, res) => {
    try {
        const organization = await prisma.organization.findUnique({
            where: { id: req.user!.organizationId },
            select: { settings: true }
        });

        res.json({ success: true, data: organization?.settings || {} });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
});

// PUT /api/settings
router.put('/', authorize('CEO', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    try {
        const { lineNotifyToken, lowStockAlert, dailyReportTime }: any = req.body;

        // Merge with existing settings or replace? merging is safer usually, but JSON update in Prisma replaces.
        // So we should fetch first or use update with merge if supported (Prisma handles JSON merge depending on DB, 
        // but for safety let's read first or just assume body is partial update and we need to merge in code if we want deep merge)
        // For simplicity, we assume the frontend sends the relevant keys to update.

        // Fetch current settings to merge
        const currentOrg = await prisma.organization.findUnique({
            where: { id: req.user!.organizationId },
            select: { settings: true }
        });

        const currentSettings = (currentOrg?.settings as any) || {};
        const newSettings = {
            ...currentSettings,
            ...req.body
        };

        const updated = await prisma.organization.update({
            where: { id: req.user!.organizationId },
            data: { settings: newSettings },
            select: { settings: true }
        });

        res.json({ success: true, data: updated.settings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
});

// POST /api/settings/test-line
router.post('/test-line', authorize('CEO', 'BRANCH_MANAGER'), async (req: AuthRequest, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Token is required' });
        }

        const response = await fetch('https://notify-api.line.me/api/notify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${token}`
            },
            body: new URLSearchParams({
                message: 'ทดสอบการแจ้งเตือนจาก PharmaCare ERP ✅\nระบบเชื่อมต่อสำเร็จแล้ว!'
            })
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        res.json({ success: true, message: 'Test message sent' });
    } catch (error: any) {
        console.error('LINE Notify Error:', error.message);
        res.status(400).json({
            success: false,
            message: 'Failed to send LINE notification. Please check your token.'
        });
    }
});

export default router;
