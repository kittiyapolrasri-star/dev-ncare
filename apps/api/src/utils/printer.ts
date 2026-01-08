/**
 * ESC/POS Thermal Printer Commands
 * Compatible with 58mm/80mm thermal printers
 */

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';

export const PrinterCommands = {
    // Initialize printer
    INIT: `${ESC}@`,

    // Text alignment
    ALIGN_LEFT: `${ESC}a\x00`,
    ALIGN_CENTER: `${ESC}a\x01`,
    ALIGN_RIGHT: `${ESC}a\x02`,

    // Text size
    SIZE_NORMAL: `${GS}!\x00`,
    SIZE_DOUBLE_HEIGHT: `${GS}!\x01`,
    SIZE_DOUBLE_WIDTH: `${GS}!\x10`,
    SIZE_DOUBLE: `${GS}!\x11`,

    // Text style
    BOLD_ON: `${ESC}E\x01`,
    BOLD_OFF: `${ESC}E\x00`,
    UNDERLINE_ON: `${ESC}-\x01`,
    UNDERLINE_OFF: `${ESC}-\x00`,

    // Feed and Cut
    LINE_FEED: LF,
    FEED_3: `${ESC}d\x03`,
    FEED_5: `${ESC}d\x05`,
    CUT_PAPER: `${GS}V\x41\x03`,

    // Cash drawer
    OPEN_DRAWER: `${ESC}p\x00\x19\xFA`,

    // Thai encoding
    SET_THAI: `${ESC}t\x1E`, // Code page 874 (Thai)
};

export interface ReceiptData {
    shopName: string;
    shopAddress?: string;
    shopPhone?: string;
    taxId?: string;
    receiptNo: string;
    date: string;
    cashier: string;
    items: {
        name: string;
        qty: number;
        price: number;
        total: number;
    }[];
    subtotal: number;
    discount?: number;
    vat?: number;
    total: number;
    paymentMethod: string;
    amountPaid?: number;
    change?: number;
    pointsEarned?: number;
    memberPoints?: number;
}

export function generateReceipt(data: ReceiptData): string {
    const {
        INIT, ALIGN_CENTER, ALIGN_LEFT, ALIGN_RIGHT,
        SIZE_DOUBLE, SIZE_NORMAL, BOLD_ON, BOLD_OFF,
        LINE_FEED, FEED_3, CUT_PAPER, SET_THAI
    } = PrinterCommands;

    const LINE = '='.repeat(32);
    const DASHED = '-'.repeat(32);

    let receipt = '';

    // Initialize
    receipt += INIT + SET_THAI;

    // Header
    receipt += ALIGN_CENTER;
    receipt += SIZE_DOUBLE + data.shopName + LINE_FEED;
    receipt += SIZE_NORMAL;
    if (data.shopAddress) receipt += data.shopAddress + LINE_FEED;
    if (data.shopPhone) receipt += `Tel: ${data.shopPhone}` + LINE_FEED;
    if (data.taxId) receipt += `Tax ID: ${data.taxId}` + LINE_FEED;

    receipt += LINE_FEED + LINE + LINE_FEED;

    // Receipt info
    receipt += ALIGN_LEFT;
    receipt += `เลขที่: ${data.receiptNo}` + LINE_FEED;
    receipt += `วันที่: ${data.date}` + LINE_FEED;
    receipt += `พนักงาน: ${data.cashier}` + LINE_FEED;

    receipt += DASHED + LINE_FEED;

    // Items header
    receipt += BOLD_ON;
    receipt += padRight('รายการ', 16) + padLeft('จำนวน', 8) + padLeft('รวม', 8) + LINE_FEED;
    receipt += BOLD_OFF;
    receipt += DASHED + LINE_FEED;

    // Items
    for (const item of data.items) {
        receipt += padRight(truncate(item.name, 16), 16);
        receipt += padLeft(`${item.qty}x${item.price}`, 8);
        receipt += padLeft(item.total.toFixed(2), 8);
        receipt += LINE_FEED;
    }

    receipt += DASHED + LINE_FEED;

    // Totals
    receipt += padRight('รวมสินค้า', 24) + padLeft(data.subtotal.toFixed(2), 8) + LINE_FEED;
    if (data.discount && data.discount > 0) {
        receipt += padRight('ส่วนลด', 24) + padLeft(`-${data.discount.toFixed(2)}`, 8) + LINE_FEED;
    }
    if (data.vat) {
        receipt += padRight('VAT 7%', 24) + padLeft(data.vat.toFixed(2), 8) + LINE_FEED;
    }

    receipt += BOLD_ON + SIZE_DOUBLE;
    receipt += padRight('รวมทั้งสิ้น', 16) + padLeft(data.total.toFixed(2), 16) + LINE_FEED;
    receipt += SIZE_NORMAL + BOLD_OFF;

    receipt += DASHED + LINE_FEED;

    // Payment
    receipt += `ชำระโดย: ${data.paymentMethod}` + LINE_FEED;
    if (data.amountPaid) {
        receipt += padRight('รับเงิน', 24) + padLeft(data.amountPaid.toFixed(2), 8) + LINE_FEED;
    }
    if (data.change && data.change > 0) {
        receipt += padRight('เงินทอน', 24) + padLeft(data.change.toFixed(2), 8) + LINE_FEED;
    }

    // Points
    if (data.pointsEarned) {
        receipt += LINE_FEED;
        receipt += `แต้มที่ได้รับ: +${data.pointsEarned}` + LINE_FEED;
        if (data.memberPoints !== undefined) {
            receipt += `แต้มสะสม: ${data.memberPoints}` + LINE_FEED;
        }
    }

    // Footer
    receipt += LINE_FEED;
    receipt += ALIGN_CENTER;
    receipt += 'ขอบคุณที่ใช้บริการ' + LINE_FEED;
    receipt += LINE_FEED;

    // Feed and cut
    receipt += FEED_3 + CUT_PAPER;

    return receipt;
}

// Helper functions
function padRight(str: string, len: number): string {
    return str.padEnd(len, ' ').slice(0, len);
}

function padLeft(str: string, len: number): string {
    return str.padStart(len, ' ').slice(-len);
}

function truncate(str: string, len: number): string {
    return str.length > len ? str.slice(0, len - 2) + '..' : str;
}
