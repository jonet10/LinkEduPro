const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const { generateTemporaryPassword } = require('../utils/password');
const { createSchoolLog } = require('../services/school-log.service');

async function createSchool(req, res, next) {
  try {
    const user = req.schoolUser;
    const {
      name,
      type,
      phone,
      email,
      address,
      city,
      country,
      logo,
      adminFirstName,
      adminLastName,
      adminPhone
    } = req.body;

    const tempPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const created = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: { name, type, phone, email, address, city, country, logo: logo || null }
      });

      const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, '.');
      const adminEmail = `${normalizedName}.${school.id}@school-admin.local`;

      const admin = await tx.schoolAdmin.create({
        data: {
          schoolId: school.id,
          firstName: adminFirstName,
          lastName: adminLastName,
          email: adminEmail,
          phone: adminPhone || null,
          passwordHash,
          role: 'SCHOOL_ADMIN',
          mustChangePassword: true,
          createdBySuperAdmin: user.id
        }
      });

      await tx.schoolPaymentType.createMany({
        data: [
          { schoolId: school.id, name: 'Tuition', description: 'Frais de scolarite' },
          { schoolId: school.id, name: 'Exam', description: 'Frais d examen' }
        ]
      });

      return { school, admin };
    });

    await createSchoolLog({
      schoolId: created.school.id,
      actorId: user.id,
      actorRole: user.role,
      action: 'SCHOOL_CREATED',
      entityType: 'School',
      entityId: String(created.school.id),
      metadata: { schoolName: created.school.name, adminEmail: created.admin.email }
    });

    return res.status(201).json({
      school: created.school,
      schoolAdmin: {
        id: created.admin.id,
        email: created.admin.email,
        temporaryPassword: tempPassword,
        mustChangePassword: true
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function listSchools(req, res, next) {
  try {
    const schools = await prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { students: true, classes: true, payments: true } }
      }
    });
    return res.json({ schools });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createSchool, listSchools };
