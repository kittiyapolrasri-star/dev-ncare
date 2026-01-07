import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { startOfDay, endOfDay, subDays } from 'date-fns';

// Helper to send LINE Notify
async function sendLineNotify(token: string, message: string) {
    try {
        const response = await fetch('https://notify-api.line.me/api/notify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${token}`
            },
            body: new URLSearchParams({
                message: message
            })
        });

        if (!response.ok) {
            console.error('Failed to send LINE notification:', await response.text());
        }
    } catch (error) {
        console.error('Error sending LINE notify:', error);
    }
}

// Job: Low Stock Alert (Runs every morning at 09:00)
async function checkLowStock() {
    console.log('[Scheduler] Running Low Stock Check...');
    const organizations = await prisma.organization.findMany({
        where: { isActive: true }
    });

    for (const org of organizations) {
        const settings = org.settings as any;
        if (!settings?.lineNotify || !settings?.lineNotifyToken || !settings?.lowStock) continue;

        // Find products below reorder point
        const lowStockProducts = await prisma.product.findMany({
            where: {
                organizationId: org.id,
                isActive: true,
                // Simple check: This relies on batches, so we need to aggregate. 
                // Creating a complex query inside loop might be heavy, but fine for prototype.
                // We'll fetch all and filter in memory for now or use raw query for performance later.
            },
            include: {
                batches: {
                    where: { quantity: { gt: 0 } }
                }
            }
        });

        const alerts = [];
        for (const p of lowStockProducts) {
            const totalStock = p.batches.reduce((sum, b) => sum + b.quantity, 0);
            if (totalStock <= p.reorderPoint) {
                alerts.push(`${p.name} (เหลือ ${totalStock} ${p.unit})`);
            }
        }

        if (alerts.length > 0) {
            const message = `\n⚠️ แจ้งเตือนสินค้าใกล้หมด\n----------------\n${alerts.slice(0, 10).join('\n')}${alerts.length > 10 ? `\n\nและอีก ${alerts.length - 10} รายการ...` : ''}\n\nโปรดตรวจสอบและสั่งซื้อเพิ่ม`;
            await sendLineNotify(settings.lineNotifyToken, message);
        }
    }
}

// Job: Daily Summary (Runs every evening at 18:00)
async function sendDailySummary() {
    console.log('[Scheduler] Running Daily Summary...');
    const organizations = await prisma.organization.findMany({
        where: { isActive: true }
    });

    for (const org of organizations) {
        const settings = org.settings as any;
        if (!settings?.lineNotify || !settings?.lineNotifyToken || !settings?.dailySummary) continue;

        const today = new Date();
        const start = startOfDay(today);
        const end = endOfDay(today);

        // Calculate Daily Sales
        const sales = await prisma.sale.aggregate({
            where: {
                organizationId: org.id,
                saleDate: { gte: start, lte: end },
                status: 'COMPLETED'
            },
            _count: { id: true },
            _sum: { totalAmount: true }
        });

        const totalSales = sales._sum.totalAmount || 0;
        const totalOrders = sales._count.id || 0;

        const message = `\n📊 สรุปยอดขายรายวัน\n📅 ${today.toLocaleDateString('th-TH')}\n----------------\n💰 ยอดขายรวม: ฿${Number(totalSales).toLocaleString()}\n🧾 จำนวนบิล: ${totalOrders} บิล\n\nตรวจสอบรายละเอียดเพิ่มเติมได้ที่ Dashboard`;
        await sendLineNotify(settings.lineNotifyToken, message);
    }
}

export function initScheduler() {
    console.log(' initializing Scheduler...');

    // Schedule Low Stock Check at 09:00 AM
    cron.schedule('0 9 * * *', () => {
        checkLowStock();
    });

    // Schedule Daily Summary at 18:00 PM
    cron.schedule('0 18 * * *', () => {
        sendDailySummary();
    });

    console.log('✅ Scheduler Service Started');
}
