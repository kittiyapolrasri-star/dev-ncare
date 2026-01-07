import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const loginSchema = z.object({
    email: z.string().email('อีเมลไม่ถูกต้อง'),
    password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
});

const registerSchema = z.object({
    email: z.string().email('อีเมลไม่ถูกต้อง'),
    password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
    firstName: z.string().min(1, 'กรุณากรอกชื่อ'),
    lastName: z.string().min(1, 'กรุณากรอกนามสกุล'),
    phone: z.string().optional(),
    organizationId: z.string().uuid(),
    branchId: z.string().uuid().optional(),
    role: z.enum(['CEO', 'ACCOUNTANT', 'BRANCH_MANAGER', 'PHARMACIST', 'STAFF']).default('STAFF')
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
        throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);
    }

    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            organization: true,
            branch: true
        }
    });

    if (!user) {
        throw ApiError.unauthorized('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    if (!user.isActive) {
        throw ApiError.unauthorized('บัญชีผู้ใช้ถูกระงับ');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        throw ApiError.unauthorized('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            branchId: user.branchId
        },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Update last login
    await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
    });

    res.json({
        success: true,
        data: {
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                avatar: user.avatar,
                organization: {
                    id: user.organization.id,
                    name: user.organization.name,
                    code: user.organization.code
                },
                branch: user.branch ? {
                    id: user.branch.id,
                    name: user.branch.name,
                    code: user.branch.code
                } : null
            }
        }
    });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
        throw ApiError.badRequest('ข้อมูลไม่ถูกต้อง', validation.error.errors);
    }

    const { email, password, firstName, lastName, phone, organizationId, branchId, role } = validation.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        throw ApiError.conflict('อีเมลนี้ถูกใช้งานแล้ว');
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
    });

    if (!organization) {
        throw ApiError.notFound('ไม่พบองค์กร');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phone,
            organizationId,
            branchId,
            role: role as any
        },
        include: {
            organization: true,
            branch: true
        }
    });

    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            branchId: user.branchId
        },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
        success: true,
        data: {
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                organization: {
                    id: user.organization.id,
                    name: user.organization.name,
                    code: user.organization.code
                },
                branch: user.branch ? {
                    id: user.branch.id,
                    name: user.branch.name,
                    code: user.branch.code
                } : null
            }
        }
    });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: {
            organization: true,
            branch: true
        }
    });

    if (!user) {
        throw ApiError.notFound('ไม่พบผู้ใช้');
    }

    res.json({
        success: true,
        data: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role,
            avatar: user.avatar,
            organization: {
                id: user.organization.id,
                name: user.organization.name,
                code: user.organization.code,
                logo: user.organization.logo
            },
            branch: user.branch ? {
                id: user.branch.id,
                name: user.branch.name,
                code: user.branch.code
            } : null
        }
    });
});

// PUT /api/auth/password
router.put('/password', authenticate, async (req: AuthRequest, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw ApiError.badRequest('กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่');
    }

    if (newPassword.length < 6) {
        throw ApiError.badRequest('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
    }

    const user = await prisma.user.findUnique({
        where: { id: req.user!.id }
    });

    if (!user) {
        throw ApiError.notFound('ไม่พบผู้ใช้');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
        throw ApiError.unauthorized('รหัสผ่านปัจจุบันไม่ถูกต้อง');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
    });

    res.json({
        success: true,
        message: 'เปลี่ยนรหัสผ่านสำเร็จ'
    });
});

export default router;
