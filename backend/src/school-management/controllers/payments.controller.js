const path = require('path');
const prisma = require('../../config/prisma');
const { computePaymentStatus } = require('../utils/payment');
const { createSchoolLog } = require('../services/school-log.service');
const { generateReceiptPdf } = require('../utils/receipt');

function makeReceiptNumber(schoolId) {
  const d = new Date();
  const stamp = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  return `R-${schoolId}-${stamp}-${Date.now()}`;
}

async function createPaymentType(req, res, next) {
  try {
    const user = req.schoolUser;
    const { schoolId, name, description } = req.body;

    const paymentType = await prisma.schoolPaymentType.create({
      data: {
        schoolId: Number(schoolId),
        name,
        description: description || null
      }
    });

    await createSchoolLog({
      schoolId: Number(schoolId),
      actorId: user.id,
      actorRole: user.role,
      action: 'PAYMENT_TYPE_CREATED',
      entityType: 'SchoolPaymentType',
      entityId: String(paymentType.id)
    });

    return res.status(201).json({ paymentType });
  } catch (error) {
    return next(error);
  }
}

async function listPaymentTypes(req, res, next) {
  try {
    const schoolId = Number(req.params.schoolId);
    const paymentTypes = await prisma.schoolPaymentType.findMany({
      where: { schoolId, isActive: true },
      orderBy: { name: 'asc' }
    });
    return res.json({ paymentTypes });
  } catch (error) {
    return next(error);
  }
}

async function createPayment(req, res, next) {
  try {
    const user = req.schoolUser;
    const { schoolId, studentId, classId, academicYearId, paymentTypeId, amountDue, amountPaid, notes, isInstallment } = req.body;
    const numericSchoolId = Number(schoolId);

    const [student, schoolClass, academicYear, paymentType] = await Promise.all([
      prisma.schoolStudent.findFirst({ where: { id: Number(studentId), schoolId: numericSchoolId, isActive: true } }),
      prisma.schoolClass.findFirst({ where: { id: Number(classId), schoolId: numericSchoolId } }),
      prisma.schoolAcademicYear.findFirst({ where: { id: Number(academicYearId), schoolId: numericSchoolId } }),
      prisma.schoolPaymentType.findFirst({ where: { id: Number(paymentTypeId), schoolId: numericSchoolId, isActive: true } })
    ]);

    if (!student || !schoolClass || !academicYear || !paymentType) {
      return res.status(400).json({ message: 'References paiement invalides pour cette ecole.' });
    }

    if (student.classId !== schoolClass.id || student.academicYearId !== academicYear.id) {
      return res.status(400).json({ message: 'Eleve, classe et annee academique incompatibles.' });
    }

    const numericAmountPaid = Number(amountPaid);
    let numericAmountDue = Number(amountDue);
    let status;

    if (Boolean(isInstallment)) {
      const [sumPaid, existingPayment] = await Promise.all([
        prisma.schoolPayment.aggregate({
          where: {
            schoolId: numericSchoolId,
            studentId: Number(studentId),
            classId: Number(classId),
            academicYearId: Number(academicYearId),
            paymentTypeId: Number(paymentTypeId),
            deletedAt: null
          },
          _sum: { amountPaid: true }
        }),
        prisma.schoolPayment.findFirst({
          where: {
            schoolId: numericSchoolId,
            studentId: Number(studentId),
            classId: Number(classId),
            academicYearId: Number(academicYearId),
            paymentTypeId: Number(paymentTypeId),
            deletedAt: null
          },
          orderBy: { createdAt: 'asc' }
        })
      ]);

      if (existingPayment) {
        // Keep a consistent total due across installments for the same fee.
        numericAmountDue = Number(existingPayment.amountDue);
      }

      const alreadyPaid = Number(sumPaid?._sum?.amountPaid || 0);
      const cumulativePaid = alreadyPaid + numericAmountPaid;
      status = computePaymentStatus(numericAmountDue, cumulativePaid);
    } else {
      status = computePaymentStatus(numericAmountDue, numericAmountPaid);
    }

    const receiptNumber = makeReceiptNumber(numericSchoolId);

    const payment = await prisma.schoolPayment.create({
      data: {
        schoolId: numericSchoolId,
        studentId: Number(studentId),
        classId: Number(classId),
        academicYearId: Number(academicYearId),
        paymentTypeId: Number(paymentTypeId),
        amountDue: numericAmountDue,
        amountPaid: numericAmountPaid,
        status,
        receiptNumber,
        notes: notes || null,
        recordedById: user.id
      },
      include: {
        school: true,
        student: true,
        schoolClass: true,
        academicYear: true,
        paymentType: true,
        recordedBy: true
      }
    });

    if (Boolean(isInstallment)) {
      await prisma.schoolPayment.updateMany({
        where: {
          schoolId: numericSchoolId,
          studentId: Number(studentId),
          classId: Number(classId),
          academicYearId: Number(academicYearId),
          paymentTypeId: Number(paymentTypeId),
          deletedAt: null
        },
        data: { status }
      });
    }

    const receipt = await generateReceiptPdf(payment, path.resolve(__dirname, '../../../storage/school-receipts'));

    const updated = await prisma.schoolPayment.update({
      where: { id: payment.id },
      data: { receiptPath: receipt.absolutePath },
      include: {
        student: { select: { id: true, studentId: true, firstName: true, lastName: true } },
        paymentType: { select: { id: true, name: true } },
        schoolClass: { select: { id: true, name: true } },
        academicYear: { select: { id: true, label: true } }
      }
    });

    await createSchoolLog({
      schoolId: numericSchoolId,
      actorId: user.id,
      actorRole: user.role,
      action: 'PAYMENT_RECORDED',
      entityType: 'SchoolPayment',
      entityId: String(payment.id),
      metadata: { amountDue: numericAmountDue, amountPaid: numericAmountPaid, status, receiptNumber, isInstallment: Boolean(isInstallment) }
    });

    return res.status(201).json({ payment: updated, receiptFile: receipt.fileName });
  } catch (error) {
    return next(error);
  }
}

async function listPayments(req, res, next) {
  try {
    const schoolId = Number(req.params.schoolId);
    const status = req.query.status || undefined;

    const payments = await prisma.schoolPayment.findMany({
      where: {
        schoolId,
        status,
        deletedAt: null
      },
      include: {
        student: { select: { id: true, studentId: true, firstName: true, lastName: true } },
        paymentType: { select: { id: true, name: true } },
        schoolClass: { select: { id: true, name: true } },
        academicYear: { select: { id: true, label: true } }
      },
      orderBy: { paymentDate: 'desc' }
    });

    return res.json({ payments });
  } catch (error) {
    return next(error);
  }
}

async function deletePayment(req, res, next) {
  try {
    const user = req.schoolUser;
    const schoolId = Number(req.params.schoolId);
    const paymentId = Number(req.params.paymentId);

    const payment = await prisma.schoolPayment.findFirst({ where: { id: paymentId, schoolId, deletedAt: null } });
    if (!payment) {
      return res.status(404).json({ message: 'Paiement introuvable.' });
    }

    await prisma.schoolPayment.update({ where: { id: paymentId }, data: { deletedAt: new Date() } });

    await createSchoolLog({
      schoolId,
      actorId: user.id,
      actorRole: user.role,
      action: 'PAYMENT_SOFT_DELETED',
      entityType: 'SchoolPayment',
      entityId: String(paymentId)
    });

    return res.json({ message: 'Paiement supprime (soft delete).' });
  } catch (error) {
    return next(error);
  }
}

async function downloadReceipt(req, res, next) {
  try {
    const schoolId = Number(req.params.schoolId);
    const paymentId = Number(req.params.paymentId);

    const payment = await prisma.schoolPayment.findFirst({ where: { id: paymentId, schoolId, deletedAt: null } });
    if (!payment || !payment.receiptPath) {
      return res.status(404).json({ message: 'Recu introuvable.' });
    }

    return res.download(payment.receiptPath);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createPaymentType,
  listPaymentTypes,
  createPayment,
  listPayments,
  deletePayment,
  downloadReceipt
};
