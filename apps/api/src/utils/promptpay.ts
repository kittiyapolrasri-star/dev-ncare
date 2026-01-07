import { crc16 } from './crc16.js';

/**
 * Generate PromptPay QR Payload (EMVCo)
 * @param target Mobile Number (08x) or TaxID/NationalID
 * @param amount Amount (optional)
 * @returns string Payload for QR Code
 */
export function generatePromptPayPayload(target: string, amount?: number): string {
    // 1. Sanitize Target
    let targetType = '01'; // 01 = Mobile, 02 = Tax/National ID
    let sanitizedTarget = target.replace(/[^0-9]/g, '');

    if (sanitizedTarget.length === 10 && sanitizedTarget.startsWith('0')) {
        // Mobile: 0812345678 -> 66812345678
        targetType = '01';
        sanitizedTarget = '66' + sanitizedTarget.substring(1);
    } else if (sanitizedTarget.length >= 13) {
        // ID Card
        targetType = '02';
    }

    // 2. Build Data Objects
    const pFI = formatField('00', '01'); // Format Indicator
    const pPointMethod = formatField('01', '11'); // 11 = Dynamic, 12 = Static. Use 11 for transaction.

    // Merchant Information (AID + Biller ID)
    // AID: A000000677010111 (PromptPay)
    // 00: AID
    // 01: Mobile/ID Type
    // 02: Target
    const merchantInfoContent =
        formatField('00', 'A000000677010111') +
        formatField('01', targetType) +
        formatField('02', sanitizedTarget);

    const pMerchantInfo = formatField('29', merchantInfoContent);
    const pCurrency = formatField('53', '764'); // THB

    let pAmount = '';
    if (amount) {
        pAmount = formatField('54', amount.toFixed(2));
    }

    const pCountry = formatField('58', 'TH');

    // 3. Assemble without CRC
    let rawData =
        pFI +
        pPointMethod +
        pMerchantInfo +
        pCurrency +
        pAmount +
        pCountry +
        '6304'; // CRC ID + Length

    // 4. Calculate CRC
    const crcVal = crc16(rawData);

    return rawData + crcVal;
}

function formatField(id: string, value: string): string {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
}
