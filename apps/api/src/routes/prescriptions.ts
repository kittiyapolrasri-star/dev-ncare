import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Validation schema
const prescriptionSchema = z.object({
  patientName: z.string().min(1),
  patientPhone: z.string().optional(),
  doctorName: z.string().optional(),
  hospitalName: z.string().optional(),
  prescriptionDate: z.string().datetime().optional(),
  items: z.array(z.object({
    drugName: z.string().min(1),
    quantity: z.number().int().positive(),
    dosage: z.string().optional(),
    frequency: z.string().optional(),
    duration: z.string().optional(),
    notes: z.string().optional(),
  })).min(1),
});

// Get all prescriptions
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { prescriptionNo: { contains: search as string, mode: 'insensitive' } },
        { patientName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
        },
      }),
      prisma.prescription.count({ where }),
    ]);

    res.json({
      success: true,
      data: prescriptions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({ success: false, error: { message: 'เกิดข้อผิดพลาด' } });
  }
});

// Get single prescription
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!prescription) {
      return res.status(404).json({ success: false, error: { message: 'ไม่พบใบสั่งยา' } });
    }

    res.json({ success: true, data: prescription });
  } catch (error) {
    console.error('Get prescription error:', error);
    res.status(500).json({ success: false, error: { message: 'เกิดข้อผิดพลาด' } });
  }
});

// Create prescription
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const data = prescriptionSchema.parse(req.body);

    // Generate prescription number
    const today = new Date();
    const prefix = `RX${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    const lastRx = await prisma.prescription.findFirst({
      where: { prescriptionNo: { startsWith: prefix } },
      orderBy: { prescriptionNo: 'desc' },
    });
    const seq = lastRx
      ? String(parseInt(lastRx.prescriptionNo.slice(-4)) + 1).padStart(4, '0')
      : '0001';
    const prescriptionNo = `${prefix}${seq}`;

    const prescription = await prisma.prescription.create({
      data: {
        prescriptionNo,
        patientName: data.patientName,
        patientPhone: data.patientPhone,
        doctorName: data.doctorName,
        hospitalName: data.hospitalName,
        prescriptionDate: data.prescriptionDate ? new Date(data.prescriptionDate) : new Date(),
        status: 'PENDING',
        items: {
          create: data.items,
        },
      },
      include: { items: true },
    });

    res.status(201).json({ success: true, data: prescription });
  } catch (error) {
    console.error('Create prescription error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { message: 'ข้อมูลไม่ถูกต้อง', details: error.errors } });
    }
    res.status(500).json({ success: false, error: { message: 'เกิดข้อผิดพลาด' } });
  }
});

// Update status (Dispense)
router.post('/:id/dispense', authenticate, async (req: Request, res: Response) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: req.params.id },
    });

    if (!prescription) {
      return res.status(404).json({ success: false, error: { message: 'ไม่พบใบสั่งยา' } });
    }

    if (prescription.status === 'DISPENSED') {
      return res.status(400).json({ success: false, error: { message: 'ใบสั่งยานี้จ่ายยาไปแล้ว' } });
    }

    const updated = await prisma.prescription.update({
      where: { id: req.params.id },
      data: { status: 'DISPENSED' },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Dispense prescription error:', error);
    res.status(500).json({ success: false, error: { message: 'เกิดข้อผิดพลาด' } });
  }
});

export default router;
