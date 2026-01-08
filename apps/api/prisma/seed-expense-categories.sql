-- Seed default expense categories
INSERT INTO expense_categories (id, organization_id, code, name, description, is_system, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    o.id,
    cat.code,
    cat.name,
    cat.description,
    true,
    true,
    NOW(),
    NOW()
FROM organizations o
CROSS JOIN (VALUES 
    ('RENT', 'ค่าเช่า', 'ค่าเช่าสถานที่'),
    ('SALARY', 'เงินเดือน', 'เงินเดือนพนักงาน'),
    ('UTILITIES_ELEC', 'ค่าไฟ', 'ค่าไฟฟ้า'),
    ('UTILITIES_WATER', 'ค่าน้ำ', 'ค่าน้ำประปา'),
    ('UTILITIES_PHONE', 'ค่าโทรศัพท์/Internet', 'ค่าโทรศัพท์และอินเทอร์เน็ต'),
    ('SUPPLIES', 'วัสดุสิ้นเปลือง', 'กระดาษ, หมึก, อุปกรณ์สำนักงาน'),
    ('MAINTENANCE', 'ค่าซ่อมบำรุง', 'ค่าซ่อมแซมอุปกรณ์'),
    ('TRANSPORT', 'ค่าขนส่ง', 'ค่าจัดส่งสินค้า'),
    ('MARKETING', 'ค่าการตลาด', 'ค่าโฆษณาและโปรโมชั่น'),
    ('INSURANCE', 'ค่าประกัน', 'เบี้ยประกันภัย'),
    ('TAX', 'ค่าภาษี', 'ภาษีและค่าธรรมเนียม'),
    ('OTHER', 'อื่นๆ', 'ค่าใช้จ่ายอื่นๆ')
) AS cat(code, name, description)
WHERE NOT EXISTS (
    SELECT 1 FROM expense_categories ec 
    WHERE ec.organization_id = o.id AND ec.code = cat.code
);
