const path = require('path');
const prisma = require('../config/prisma');
const { isConfiguredSuperAdmin } = require('../services/access');
const { createNotification, notifyRole, notifyAdmins } = require('../services/notifications');
const { createLibraryCheckout } = require('../services/library-purchase.service');

function toClientBook(book, viewer) {
  const hasPaidPurchase = Array.isArray(book.purchases) && book.purchases.some((p) => p.status === 'PAID');
  const canAccess = !book.isPaid
    || viewer.role === 'ADMIN'
    || book.uploadedBy === viewer.id
    || hasPaidPurchase;

  return {
    id: book.id,
    title: book.title,
    subject: book.subject,
    level: book.level,
    description: book.description,
    coverImageUrl: book.coverImageUrl,
    fileUrl: book.fileUrl,
    isPaid: Boolean(book.isPaid),
    price: Number(book.price || 0),
    canAccess,
    hasPaidPurchase,
    status: book.status,
    uploadedBy: book.uploader
      ? {
          id: book.uploader.id,
          firstName: book.uploader.firstName,
          lastName: book.uploader.lastName,
          role: book.uploader.role
        }
      : null,
    reviewedBy: book.reviewer
      ? {
          id: book.reviewer.id,
          firstName: book.reviewer.firstName,
          lastName: book.reviewer.lastName
        }
      : null,
    reviewedAt: book.reviewedAt,
    createdAt: book.createdAt
  };
}

async function listBooks(req, res, next) {
  try {
    const whereBase = { isDeleted: false };
    let where = { ...whereBase, status: 'APPROVED' };

    if (req.user.role === 'ADMIN') {
      where = whereBase;
    }

    if (req.user.role === 'TEACHER') {
      where = {
        ...whereBase,
        OR: [{ status: 'APPROVED' }, { uploadedBy: req.user.id }]
      };
    }

    const books = await prisma.libraryBook.findMany({
      where,
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true, role: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
        purchases: {
          where: { buyerId: req.user.id },
          select: { status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const approved = books.filter((b) => b.status === 'APPROVED').map((b) => toClientBook(b, req.user));
    const pending = books.filter((b) => b.status === 'PENDING').map((b) => toClientBook(b, req.user));
    const rejected = books.filter((b) => b.status === 'REJECTED').map((b) => toClientBook(b, req.user));

    return res.json({ approved, pending, rejected });
  } catch (error) {
    return next(error);
  }
}

async function submitBook(req, res, next) {
  try {
    const pdfFile = req.files?.file?.[0];
    const coverFile = req.files?.coverImage?.[0];

    if (!pdfFile) {
      return res.status(400).json({ message: 'Fichier PDF requis.' });
    }

    const autoApprove = isConfiguredSuperAdmin(req.user);
    const fileUrl = `/storage/library-books/pdfs/${path.basename(pdfFile.path)}`;
    const coverImageUrl = coverFile ? `/storage/library-books/covers/${path.basename(coverFile.path)}` : null;
    const isPaid = String(req.body.isPaid || 'false').toLowerCase() === 'true';
    const price = isPaid ? Number(req.body.price || 0) : 0;

    const book = await prisma.libraryBook.create({
      data: {
        title: req.body.title,
        subject: req.body.subject,
        level: req.body.level,
        description: req.body.description || null,
        coverImageUrl,
        fileUrl,
        isPaid,
        price,
        status: autoApprove ? 'APPROVED' : 'PENDING',
        uploadedBy: req.user.id,
        reviewedBy: autoApprove ? req.user.id : null,
        reviewedAt: autoApprove ? new Date() : null
      },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true, role: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    if (autoApprove) {
      await Promise.all([
        notifyRole('STUDENT', {
          type: 'BOOK_PUBLISHED',
          title: 'Nouveau livre en bibliotheque',
          message: `${book.title} est maintenant disponible en PDF.`,
          entityType: 'LibraryBook',
          entityId: String(book.id)
        }),
        notifyRole('TEACHER', {
          type: 'BOOK_PUBLISHED',
          title: 'Nouveau livre en bibliotheque',
          message: `${book.title} est maintenant disponible en PDF.`,
          entityType: 'LibraryBook',
          entityId: String(book.id)
        })
      ]);
    } else {
      await notifyAdmins({
        type: 'BOOK_REVIEW_REQUIRED',
        title: 'Livre a valider',
        message: `${book.title} a été soumis et attend validation.`,
        entityType: 'LibraryBook',
        entityId: String(book.id)
      });
    }

    return res.status(201).json({ book: toClientBook(book, req.user) });
  } catch (error) {
    return next(error);
  }
}

async function reviewBook(req, res, next) {
  try {
    if (!isConfiguredSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Seul le super admin peut valider un livre.' });
    }

    const id = Number(req.params.id);
    const status = req.body.status;

    const book = await prisma.libraryBook.findFirst({ where: { id, isDeleted: false } });
    if (!book) {
      return res.status(404).json({ message: 'Livre introuvable.' });
    }

    const reviewed = await prisma.libraryBook.update({
      where: { id },
      data: {
        status,
        reviewedBy: req.user.id,
        reviewedAt: new Date()
      },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true, role: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    await createNotification({
      userId: reviewed.uploadedBy,
      type: 'BOOK_REVIEW_RESULT',
      title: status === 'APPROVED' ? 'Livre approuve' : 'Livre refuse',
      message: `${reviewed.title} a été ${status === 'APPROVED' ? 'approuve' : 'rejete'} par le super admin.`,
      entityType: 'LibraryBook',
      entityId: String(reviewed.id)
    });

    if (status === 'APPROVED') {
      await Promise.all([
        notifyRole('STUDENT', {
          type: 'BOOK_PUBLISHED',
          title: 'Nouveau livre en bibliotheque',
          message: `${reviewed.title} est maintenant disponible en PDF.`,
          entityType: 'LibraryBook',
          entityId: String(reviewed.id)
        }),
        notifyRole('TEACHER', {
          type: 'BOOK_PUBLISHED',
          title: 'Nouveau livre en bibliotheque',
          message: `${reviewed.title} est maintenant disponible en PDF.`,
          entityType: 'LibraryBook',
          entityId: String(reviewed.id)
        })
      ]);
    }

    return res.json({ book: toClientBook(reviewed, req.user) });
  } catch (error) {
    return next(error);
  }
}

async function purchaseBook(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Livre invalide.' });
    }

    const result = await createLibraryCheckout({
      buyer: req.user,
      bookId: id,
      paymentMethod: req.body.paymentMethod || 'MONCASH'
    });

    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    if (result.free || result.alreadyPaid) {
      return res.json({ message: result.message, canAccess: true });
    }

    return res.status(202).json({
      message: 'Redirection MonCash requise.',
      provider: result.provider,
      redirectUrl: result.redirectUrl,
      orderRef: result.orderRef
    });
  } catch (error) {
    return next(error);
  }
}

async function softDeleteBook(req, res, next) {
  try {
    const id = Number(req.params.id);
    const book = await prisma.libraryBook.findFirst({ where: { id, isDeleted: false } });

    if (!book) {
      return res.status(404).json({ message: 'Livre introuvable.' });
    }

    const owner = book.uploadedBy === req.user.id;
    const admin = req.user.role === 'ADMIN';

    if (!owner && !admin) {
      return res.status(403).json({ message: 'Action non autorisee.' });
    }

    await prisma.libraryBook.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });

    return res.json({ message: 'Livre supprime (soft delete).' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listBooks,
  submitBook,
  reviewBook,
  purchaseBook,
  softDeleteBook
};
