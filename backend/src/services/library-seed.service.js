const fs = require('fs');
const prisma = require('../config/prisma');
const { resolveStoragePath } = require('../config/storage');

const DEFAULT_LIBRARY_BOOKS = [
  {
    title: 'Zophysique 2021',
    subject: 'Physique',
    level: 'NSIV',
    description: 'Recueil Zophysique 2021.',
    fileUrl: '/storage/library-books/pdfs/zophysique-2021.pdf',
    coverImageUrl: '/storage/library-books/covers/zophysique-2021-cover.jpg',
    isPaid: true,
    price: 500
  }
];

async function seedDefaultLibraryBooks() {
  const uploader = await prisma.student.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { id: 'asc' },
    select: { id: true }
  });

  if (!uploader) {
    console.warn('[library-seed] skipped: no ADMIN user found');
    return;
  }

  for (const book of DEFAULT_LIBRARY_BOOKS) {
    const pdfPath = resolveStoragePath('library-books', 'pdfs', book.fileUrl.split('/').pop());
    const coverPath = resolveStoragePath('library-books', 'covers', book.coverImageUrl.split('/').pop());

    if (!fs.existsSync(pdfPath)) {
      console.warn(`[library-seed] skipped: missing PDF for "${book.title}"`);
      continue;
    }
    if (!fs.existsSync(coverPath)) {
      console.warn(`[library-seed] skipped: missing cover for "${book.title}"`);
      continue;
    }

    const existing = await prisma.libraryBook.findFirst({
      where: {
        isDeleted: false,
        OR: [{ title: book.title }, { fileUrl: book.fileUrl }]
      },
      select: { id: true }
    });

    if (existing) {
      await prisma.libraryBook.update({
        where: { id: existing.id },
        data: {
          subject: book.subject,
          level: book.level,
          description: book.description,
          coverImageUrl: book.coverImageUrl,
          fileUrl: book.fileUrl,
          isPaid: Boolean(book.isPaid),
          price: Number(book.price || 0),
          status: 'APPROVED',
          reviewedBy: uploader.id,
          reviewedAt: new Date()
        }
      });
      console.log(`[library-seed] updated "${book.title}"`);
      continue;
    }

    await prisma.libraryBook.create({
      data: {
        title: book.title,
        subject: book.subject,
        level: book.level,
        description: book.description,
        coverImageUrl: book.coverImageUrl,
        fileUrl: book.fileUrl,
        isPaid: Boolean(book.isPaid),
        price: Number(book.price || 0),
        status: 'APPROVED',
        uploadedBy: uploader.id,
        reviewedBy: uploader.id,
        reviewedAt: new Date()
      }
    });

    console.log(`[library-seed] created "${book.title}"`);
  }
}

module.exports = {
  seedDefaultLibraryBooks
};
