import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create organization
    const organization = await prisma.organization.upsert({
        where: { code: 'PHARMA001' },
        update: {},
        create: {
            name: 'PharmaCare Co., Ltd.',
            code: 'PHARMA001',
            taxId: '0123456789012',
            address: '123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
            phone: '02-123-4567',
            email: 'info@pharmacare.co.th'
        }
    });

    console.log('✅ Organization created:', organization.name);

    // Create branches
    const headquarters = await prisma.branch.upsert({
        where: { organizationId_code: { organizationId: organization.id, code: 'HQ' } },
        update: {},
        create: {
            organizationId: organization.id,
            name: 'สำนักงานใหญ่',
            code: 'HQ',
            type: 'WAREHOUSE',
            address: '123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
            phone: '02-123-4567',
            isHeadquarter: true
        }
    });

    const branch1 = await prisma.branch.upsert({
        where: { organizationId_code: { organizationId: organization.id, code: 'BR001' } },
        update: {},
        create: {
            organizationId: organization.id,
            name: 'สาขาสยามสแควร์',
            code: 'BR001',
            type: 'RETAIL',
            address: 'ศูนย์การค้าสยามสแควร์ ชั้น 1 ปทุมวัน กรุงเทพฯ',
            phone: '02-234-5678'
        }
    });

    const branch2 = await prisma.branch.upsert({
        where: { organizationId_code: { organizationId: organization.id, code: 'BR002' } },
        update: {},
        create: {
            organizationId: organization.id,
            name: 'สาขาเซ็นทรัลลาดพร้าว',
            code: 'BR002',
            type: 'RETAIL',
            address: 'เซ็นทรัลพลาซา ลาดพร้าว ชั้น G จตุจักร กรุงเทพฯ',
            phone: '02-345-6789'
        }
    });

    console.log('✅ Branches created');

    // Create users
    const hashedPassword = await bcrypt.hash('password123', 10);

    const ceo = await prisma.user.upsert({
        where: { email: 'ceo@pharmacare.co.th' },
        update: {},
        create: {
            organizationId: organization.id,
            email: 'ceo@pharmacare.co.th',
            password: hashedPassword,
            firstName: 'สมชาย',
            lastName: 'ผู้บริหาร',
            phone: '081-234-5678',
            role: 'CEO'
        }
    });

    const accountant = await prisma.user.upsert({
        where: { email: 'accountant@pharmacare.co.th' },
        update: {},
        create: {
            organizationId: organization.id,
            email: 'accountant@pharmacare.co.th',
            password: hashedPassword,
            firstName: 'สุดา',
            lastName: 'บัญชี',
            phone: '081-345-6789',
            role: 'ACCOUNTANT'
        }
    });

    const manager = await prisma.user.upsert({
        where: { email: 'manager@pharmacare.co.th' },
        update: {},
        create: {
            organizationId: organization.id,
            branchId: branch1.id,
            email: 'manager@pharmacare.co.th',
            password: hashedPassword,
            firstName: 'วิชัย',
            lastName: 'ผู้จัดการ',
            phone: '081-456-7890',
            role: 'BRANCH_MANAGER'
        }
    });

    const staff = await prisma.user.upsert({
        where: { email: 'staff@pharmacare.co.th' },
        update: {},
        create: {
            organizationId: organization.id,
            branchId: branch1.id,
            email: 'staff@pharmacare.co.th',
            password: hashedPassword,
            firstName: 'พนักงาน',
            lastName: 'ร้านยา',
            phone: '081-567-8901',
            role: 'STAFF'
        }
    });

    console.log('✅ Users created');

    // Create categories
    const categories = [
        { name: 'ยาแก้ปวด-ลดไข้', code: 'PAIN' },
        { name: 'ยาแก้ไอ-เจ็บคอ', code: 'COUGH' },
        { name: 'ยาแก้แพ้', code: 'ALLERGY' },
        { name: 'วิตามิน-อาหารเสริม', code: 'VITAMIN' },
        { name: 'เครื่องมือแพทย์', code: 'DEVICE' },
        { name: 'เครื่องสำอาง', code: 'COSMETIC' }
    ];

    for (const cat of categories) {
        await prisma.productCategory.upsert({
            where: { code: cat.code },
            update: {},
            create: cat
        });
    }

    console.log('✅ Categories created');

    // Create suppliers
    const supplier1 = await prisma.supplier.upsert({
        where: { organizationId_code: { organizationId: organization.id, code: 'SUP001' } },
        update: {},
        create: {
            organizationId: organization.id,
            code: 'SUP001',
            name: 'บริษัท ยาไทย จำกัด',
            taxId: '0123456789001',
            contactPerson: 'คุณสมศรี',
            phone: '02-111-1111',
            email: 'contact@yathai.co.th',
            supplierType: 'GENERAL',
            paymentTerms: 30,
            isVatRegistered: true
        }
    });

    const oemSupplier = await prisma.supplier.upsert({
        where: { organizationId_code: { organizationId: organization.id, code: 'OEM001' } },
        update: {},
        create: {
            organizationId: organization.id,
            code: 'OEM001',
            name: 'โรงงานผลิตยา ABC',
            taxId: '0123456789002',
            contactPerson: 'คุณอมร',
            phone: '02-222-2222',
            email: 'oem@abc-pharma.co.th',
            supplierType: 'OEM',
            paymentTerms: 45,
            isVatRegistered: true
        }
    });

    console.log('✅ Suppliers created');

    // Create products
    const painCategory = await prisma.productCategory.findUnique({ where: { code: 'PAIN' } });
    const vitaminCategory = await prisma.productCategory.findUnique({ where: { code: 'VITAMIN' } });

    const products = [
        {
            sku: 'PARA500',
            name: 'พาราเซตามอล 500 มก.',
            genericName: 'Paracetamol',
            drugType: 'GENERAL' as const,
            dosageForm: 'เม็ด',
            strength: '500 มก.',
            unit: 'เม็ด',
            packSize: 100,
            costPrice: 0.50,
            sellingPrice: 1.00,
            isVatExempt: false,
            categoryId: painCategory?.id,
            supplierId: supplier1.id,
            reorderPoint: 500,
            reorderQty: 5000
        },
        {
            sku: 'IBUP400',
            name: 'ไอบูโปรเฟน 400 มก.',
            genericName: 'Ibuprofen',
            drugType: 'DANGEROUS_DRUG' as const,
            dosageForm: 'เม็ด',
            strength: '400 มก.',
            unit: 'เม็ด',
            packSize: 100,
            costPrice: 1.00,
            sellingPrice: 2.50,
            isVatExempt: false,
            categoryId: painCategory?.id,
            supplierId: supplier1.id,
            reorderPoint: 300,
            reorderQty: 3000
        },
        {
            sku: 'VITC1000',
            name: 'วิตามินซี 1000 มก.',
            genericName: 'Vitamin C',
            drugType: 'SUPPLEMENT' as const,
            dosageForm: 'เม็ดฟองฟู่',
            strength: '1000 มก.',
            unit: 'เม็ด',
            packSize: 20,
            costPrice: 5.00,
            sellingPrice: 12.00,
            isVatExempt: true,
            categoryId: vitaminCategory?.id,
            supplierId: supplier1.id,
            reorderPoint: 100,
            reorderQty: 500
        },
        {
            sku: 'OEM-MULTI',
            name: 'มัลติวิตามิน PharmaCare',
            genericName: 'Multivitamin',
            drugType: 'SUPPLEMENT' as const,
            dosageForm: 'แคปซูล',
            strength: '',
            unit: 'แคปซูล',
            packSize: 60,
            costPrice: 150.00,
            sellingPrice: 350.00,
            isVatExempt: true,
            categoryId: vitaminCategory?.id,
            supplierId: oemSupplier.id,
            isOemProduct: true,
            oemLeadDays: 30,
            reorderPoint: 50,
            reorderQty: 200
        }
    ];

    for (const prod of products) {
        await prisma.product.upsert({
            where: { organizationId_sku: { organizationId: organization.id, sku: prod.sku } },
            update: {},
            create: { ...prod, organizationId: organization.id }
        });
    }

    console.log('✅ Products created');

    // Create sample inventory
    const para = await prisma.product.findFirst({ where: { sku: 'PARA500' } });
    if (para) {
        const batch = await prisma.productBatch.upsert({
            where: { productId_batchNumber: { productId: para.id, batchNumber: 'LOT-2024-001' } },
            update: {},
            create: {
                productId: para.id,
                batchNumber: 'LOT-2024-001',
                lotNumber: 'L001',
                manufacturingDate: new Date('2024-01-01'),
                expiryDate: new Date('2026-01-01'),
                quantity: 5000,
                costPrice: 0.50
            }
        });

        await prisma.inventoryVat.upsert({
            where: { branchId_productId_batchId: { branchId: branch1.id, productId: para.id, batchId: batch.id } },
            update: {},
            create: {
                branchId: branch1.id,
                productId: para.id,
                batchId: batch.id,
                quantity: 5000,
                costBeforeVat: 0.50,
                vatRate: 7,
                vatAmount: 0.035,
                costWithVat: 0.535
            }
        });
    }

    console.log('✅ Sample inventory created');

    // Create distributor
    await prisma.distributor.upsert({
        where: { organizationId_code: { organizationId: organization.id, code: 'DIST001' } },
        update: {},
        create: {
            organizationId: organization.id,
            code: 'DIST001',
            name: 'ห้างหุ้นส่วนจำกัด ยาดี',
            contactPerson: 'คุณมานะ',
            phone: '081-999-9999',
            email: 'manit@yadee.co.th',
            territory: 'กรุงเทพฯ เขตเหนือ',
            commissionRate: 5.00,
            creditLimit: 100000
        }
    });

    console.log('✅ Distributor created');

    // Create accounts for accounting
    const accounts = [
        { code: '1100', name: 'เงินสด', accountType: 'ASSET' as const },
        { code: '1200', name: 'ลูกหนี้การค้า', accountType: 'ASSET' as const },
        { code: '1300', name: 'สินค้าคงเหลือ', accountType: 'ASSET' as const },
        { code: '2100', name: 'เจ้าหนี้การค้า', accountType: 'LIABILITY' as const },
        { code: '2200', name: 'ภาษีขายค้างจ่าย', accountType: 'LIABILITY' as const },
        { code: '4100', name: 'รายได้จากการขาย', accountType: 'REVENUE' as const },
        { code: '5100', name: 'ต้นทุนขาย', accountType: 'EXPENSE' as const }
    ];

    for (const acc of accounts) {
        await prisma.account.upsert({
            where: { code: acc.code },
            update: {},
            create: acc
        });
    }

    console.log('✅ Accounts created');

    console.log(`
╔══════════════════════════════════════════════════════════╗
║           🌱 Database Seeded Successfully!               ║
╠══════════════════════════════════════════════════════════╣
║  Test Accounts:                                          ║
║  CEO:      ceo@pharmacare.co.th / password123            ║
║  Account:  accountant@pharmacare.co.th / password123     ║
║  Manager:  manager@pharmacare.co.th / password123        ║
║  Staff:    staff@pharmacare.co.th / password123          ║
╚══════════════════════════════════════════════════════════╝
  `);
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
