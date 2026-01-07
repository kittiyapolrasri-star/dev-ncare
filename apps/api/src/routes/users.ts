import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = Router();

// Get all users (CEO, BRANCH_MANAGER only)
router.get('/', authenticate, authorize(['CEO', 'BRANCH_MANAGER']), async (req, res) => {
    try {
        const { branchId, role, search, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {
            organizationId: req.user!.organizationId,
        };

        // Branch managers can only see their branch users
        if (req.user!.role === 'BRANCH_MANAGER') {
            where.branchId = req.user!.branchId;
        } else if (branchId) {
            where.branchId = branchId;
        }

        if (role) where.role = role;
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    role: true,
                    isActive: true,
                    lastLoginAt: true,
                    createdAt: true,
                    branch: {
                        select: { id: true, name: true, code: true },
                    },
                },
            }),
            prisma.user.count({ where }),
        ]);

        res.json({
            success: true,
            data: users,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, error: { message: 'เกิดข้อผิดพลาด' } });
    }
});

// Get single user
router.get('/:id', authenticate, authorize(['CEO', 'BRANCH_MANAGER']), async (req, res) => {
    try {
        const user = await prisma.user.findFirst({
            where: {
                id: req.params.id,
                organizationId: req.user!.organizationId,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                isActive: true,
                branchId: true,
                lastLoginAt: true,
                createdAt: true,
                branch: {
                    select: { id: true, name: true, code: true },
                },
            },
        });

        if (!user) {
            return res.status(404).json({ success: false, error: { message: 'ไม่พบผู้ใช้งาน' } });
        }

        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, error: { message: 'เกิดข้อผิดพลาด' } });
    }
});

// Create user
router.post('/', authenticate, authorize(['CEO', 'BRANCH_MANAGER']), async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone, role, branchId, isActive } = req.body;

        // Check if email exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ success: false, error: { message: 'อีเมลนี้ถูกใช้งานแล้ว' } });
        }

        // Branch managers can only create for their branch
        const targetBranchId = req.user!.role === 'BRANCH_MANAGER' ? req.user!.branchId : branchId;

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                organizationId: req.user!.organizationId,
                branchId: targetBranchId,
                email,
                password: hashedPassword,
                firstName,
                lastName,
                phone,
                role: role || 'STAFF',
                isActive: isActive ?? true,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });

        res.status(201).json({ success: true, data: user });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ success: false, error: { message: 'เกิดข้อผิดพลาด' } });
    }
});

// Update user
router.put('/:id', authenticate, authorize(['CEO', 'BRANCH_MANAGER']), async (req, res) => {
    try {
        const { firstName, lastName, phone, role, branchId, isActive } = req.body;

        const existing = await prisma.user.findFirst({
            where: {
                id: req.params.id,
                organizationId: req.user!.organizationId,
            },
        });

        if (!existing) {
            return res.status(404).json({ success: false, error: { message: 'ไม่พบผู้ใช้งาน' } });
        }

        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: {
                firstName,
                lastName,
                phone,
                role,
                branchId,
                isActive,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });

        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, error: { message: 'เกิดข้อผิดพลาด' } });
    }
});

// Reset password
router.post('/:id/reset-password', authenticate, authorize(['CEO', 'BRANCH_MANAGER']), async (req, res) => {
    try {
        const { newPassword } = req.body;

        const existing = await prisma.user.findFirst({
            where: {
                id: req.params.id,
                organizationId: req.user!.organizationId,
            },
        });

        if (!existing) {
            return res.status(404).json({ success: false, error: { message: 'ไม่พบผู้ใช้งาน' } });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: req.params.id },
            data: { password: hashedPassword },
        });

        res.json({ success: true, message: 'รีเซ็ตรหัสผ่านสำเร็จ' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, error: { message: 'เกิดข้อผิดพลาด' } });
    }
});

// Delete user (soft delete)
router.delete('/:id', authenticate, authorize(['CEO']), async (req, res) => {
    try {
        const existing = await prisma.user.findFirst({
            where: {
                id: req.params.id,
                organizationId: req.user!.organizationId,
            },
        });

        if (!existing) {
            return res.status(404).json({ success: false, error: { message: 'ไม่พบผู้ใช้งาน' } });
        }

        // Cannot delete yourself
        if (existing.id === req.user!.id) {
            return res.status(400).json({ success: false, error: { message: 'ไม่สามารถลบตัวเองได้' } });
        }

        await prisma.user.update({
            where: { id: req.params.id },
            data: { isActive: false },
        });

        res.json({ success: true, message: 'ลบผู้ใช้งานสำเร็จ' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, error: { message: 'เกิดข้อผิดพลาด' } });
    }
});

export default router;
