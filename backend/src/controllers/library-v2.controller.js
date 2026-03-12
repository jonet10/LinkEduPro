const path = require('path');
const prisma = require('../config/prisma');
const { resolveStudentLevel, toApiLevel, normalizeLevelInput } = require('../v2/utils/level');

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function getPagination(query) {
  const page = clampInt(query.page, 1, 100000, 1);
  const pageSize = clampInt(query.pageSize || query.limit, 1, 50, 12);
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, take: pageSize };
}

function mapResource(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    fileType: row.fileType,
    author: row.author,
    publicationDate: row.publicationDate,
    fileUrl: row.fileUrl,
    createdAt: row.createdAt
  };
}

function mapDictionaryTerm(row) {
  return {
    id: row.id,
    term: row.term,
    kind: row.kind,
    definition: row.definition,
    example: row.example,
    letterIndex: row.letterIndex,
    createdAt: row.createdAt
  };
}

function mapBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    subject: row.subject,
    level: row.level,
    description: row.description,
    coverImageUrl: row.coverImageUrl,
    fileUrl: row.fileUrl,
    isPaid: row.isPaid,
    price: row.price,
    status: row.status,
    createdAt: row.createdAt
  };
}

function mapExam(row) {
  return {
    id: row.id,
    level: row.level,
    subject: row.subject,
    topic: row.topic,
    fileName: row.file_name,
    year: row.exam_year || null,
    createdAt: row.created_at
  };
}

function tokenizeForRecommendations(text) {
  const normalized = normalizeText(text);
  return Array.from(new Set(normalized.split(/[^a-z0-9]+/g).filter((t) => t.length >= 4))).slice(0, 6);
}

function mapCategoryToIndexType(category) {
  const normalized = normalizeText(category);
  if (normalized.includes('article')) return 'ARTICLE';
  if (normalized.includes('examen') || normalized.includes('travaux')) return 'EXAMEN';
  return 'DOCUMENT';
}

async function upsertSearchIndex({ title, type, category, referenceId }) {
  if (!title || !type || !referenceId) return;
  await prisma.searchIndex.create({
    data: {
      title,
      type,
      category: category || null,
      referenceId
    }
  }).catch(() => {
    // Best effort: avoid breaking user flows if search index insert fails.
  });
}

async function deleteSearchIndex(type, referenceId) {
  if (!type || !referenceId) return;
  await prisma.searchIndex.deleteMany({ where: { type, referenceId } }).catch(() => {});
}

async function listResources(req, res, next) {
  try {
    const { page, pageSize, skip, take } = getPagination(req.query);
    const category = String(req.query.category || '').trim();
    const fileType = String(req.query.fileType || '').trim().toLowerCase();
    const q = String(req.query.q || '').trim();

    const where = {};
    if (category) where.category = category;
    if (fileType) where.fileType = fileType.toUpperCase();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { author: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } }
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.libraryResource.count({ where }),
      prisma.libraryResource.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    return res.json({
      page,
      pageSize,
      total,
      items: rows.map(mapResource)
    });
  } catch (error) {
    return next(error);
  }
}

async function getResource(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Identifiant invalide.' });

    const resource = await prisma.libraryResource.findUnique({ where: { id } });
    if (!resource) return res.status(404).json({ message: 'Ressource introuvable.' });

    const favorite = await prisma.favorite.findFirst({
      where: {
        userId: req.user.id,
        type: 'RESOURCE',
        referenceId: id
      }
    });

    const tokens = tokenizeForRecommendations(resource.title);
    const seeAlsoResources = tokens.length
      ? await prisma.libraryResource.findMany({
        where: {
          id: { not: id },
          OR: tokens.map((t) => ({ title: { contains: t, mode: 'insensitive' } }))
        },
        take: 6,
        orderBy: { createdAt: 'desc' }
      })
      : [];

    const seeAlsoTerms = tokens.length
      ? await prisma.informaticsDictionaryTerm.findMany({
        where: {
          OR: tokens.map((t) => ({ term: { contains: t, mode: 'insensitive' } }))
        },
        take: 6,
        orderBy: { createdAt: 'desc' }
      })
      : [];

    const seeAlsoVideos = tokens.length
      ? await prisma.content.findMany({
        where: {
          type: 'VIDEO',
          status: 'APPROVED',
          OR: tokens.map((t) => ({ title: { contains: t, mode: 'insensitive' } }))
        },
        take: 6,
        orderBy: { createdAt: 'desc' }
      })
      : [];

    return res.json({
      item: mapResource(resource),
      isFavorite: Boolean(favorite),
      seeAlso: {
        resources: seeAlsoResources.map(mapResource),
        terms: seeAlsoTerms.map(mapDictionaryTerm),
        videos: seeAlsoVideos.map((row) => ({
          id: row.id,
          title: row.title,
          type: row.type.toLowerCase(),
          status: row.status.toLowerCase()
        }))
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function createResource(req, res, next) {
  try {
    const { title, description, category, fileType, author, datePublication, fileUrl } = req.body;
    const uploadedFile = req.file;

    const finalFileUrl = uploadedFile
      ? `/storage/library-resources/${path.basename(uploadedFile.path)}`
      : String(fileUrl || '').trim();
    if (!finalFileUrl) {
      return res.status(400).json({ message: 'Merci de fournir un fichier ou un lien.' });
    }

    const normalizedFileType = String(fileType || req.libraryResourceFileType || 'other').toUpperCase();
    const publicationDate = datePublication ? new Date(datePublication) : null;

    const created = await prisma.libraryResource.create({
      data: {
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        category: String(category).trim(),
        fileType: normalizedFileType,
        author: author ? String(author).trim() : null,
        publicationDate: publicationDate && !Number.isNaN(publicationDate.getTime()) ? publicationDate : null,
        fileUrl: finalFileUrl,
        createdById: req.user.id
      }
    });

    await upsertSearchIndex({
      title: created.title,
      type: mapCategoryToIndexType(created.category),
      category: created.category,
      referenceId: created.id
    });

    return res.status(201).json({ item: mapResource(created) });
  } catch (error) {
    return next(error);
  }
}

async function updateResource(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Identifiant invalide.' });

    const existing = await prisma.libraryResource.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Ressource introuvable.' });

    const isAdmin = req.user.role === 'ADMIN';
    if (!isAdmin && existing.createdById !== req.user.id) {
      return res.status(403).json({ message: 'Permissions insuffisantes.' });
    }

    const uploadedFile = req.file;
    const patch = {};
    if (req.body.title !== undefined) patch.title = String(req.body.title).trim();
    if (req.body.description !== undefined) patch.description = req.body.description ? String(req.body.description).trim() : null;
    if (req.body.category !== undefined) patch.category = String(req.body.category).trim();
    if (req.body.author !== undefined) patch.author = req.body.author ? String(req.body.author).trim() : null;
    if (req.body.fileType !== undefined) patch.fileType = String(req.body.fileType).trim().toUpperCase();
    if (req.body.datePublication !== undefined) {
      const dt = req.body.datePublication ? new Date(req.body.datePublication) : null;
      patch.publicationDate = dt && !Number.isNaN(dt.getTime()) ? dt : null;
    }
    if (uploadedFile) {
      patch.fileUrl = `/storage/library-resources/${path.basename(uploadedFile.path)}`;
      if (!patch.fileType) patch.fileType = String(req.libraryResourceFileType || 'other').toUpperCase();
    } else if (req.body.fileUrl !== undefined) {
      patch.fileUrl = String(req.body.fileUrl || '').trim();
    }

    const updated = await prisma.libraryResource.update({ where: { id }, data: patch });

    await deleteSearchIndex(mapCategoryToIndexType(existing.category), id);
    await upsertSearchIndex({
      title: updated.title,
      type: mapCategoryToIndexType(updated.category),
      category: updated.category,
      referenceId: updated.id
    });

    return res.json({ item: mapResource(updated) });
  } catch (error) {
    return next(error);
  }
}

async function deleteResource(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Identifiant invalide.' });

    const existing = await prisma.libraryResource.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Ressource introuvable.' });

    const isAdmin = req.user.role === 'ADMIN';
    if (!isAdmin && existing.createdById !== req.user.id) {
      return res.status(403).json({ message: 'Permissions insuffisantes.' });
    }

    await prisma.libraryResource.delete({ where: { id } });
    await deleteSearchIndex(mapCategoryToIndexType(existing.category), id);

    return res.json({ message: 'Ressource supprimée.', id });
  } catch (error) {
    return next(error);
  }
}

async function listDictionaryTerms(req, res, next) {
  try {
    const { page, pageSize, skip, take } = getPagination(req.query);
    const q = String(req.query.q || '').trim();
    const letter = String(req.query.letter || '').trim().toUpperCase();

    const where = {};
    if (letter && /^[A-Z]$/.test(letter)) where.letterIndex = letter;
    if (q) {
      where.OR = [
        { term: { contains: q, mode: 'insensitive' } },
        { definition: { contains: q, mode: 'insensitive' } }
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.informaticsDictionaryTerm.count({ where }),
      prisma.informaticsDictionaryTerm.findMany({
        where,
        orderBy: [{ letterIndex: 'asc' }, { term: 'asc' }],
        skip,
        take
      })
    ]);

    return res.json({ page, pageSize, total, items: rows.map(mapDictionaryTerm) });
  } catch (error) {
    return next(error);
  }
}

async function suggestDictionaryTerms(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const normalized = normalizeText(q);
    if (!normalized || normalized.length < 2) return res.json({ items: [] });

    const rows = await prisma.informaticsDictionaryTerm.findMany({
      where: { term: { startsWith: q, mode: 'insensitive' } },
      orderBy: { term: 'asc' },
      take: 8
    });
    return res.json({ items: rows.map((row) => ({ id: row.id, term: row.term })) });
  } catch (error) {
    return next(error);
  }
}

async function getDictionaryTerm(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Identifiant invalide.' });

    const term = await prisma.informaticsDictionaryTerm.findUnique({ where: { id } });
    if (!term) return res.status(404).json({ message: 'Terme introuvable.' });

    const favorite = await prisma.favorite.findFirst({
      where: {
        userId: req.user.id,
        type: 'DICTIONARY',
        referenceId: id
      }
    });

    const tokens = tokenizeForRecommendations(term.term);
    const seeAlsoTerms = tokens.length
      ? await prisma.informaticsDictionaryTerm.findMany({
        where: {
          id: { not: id },
          OR: tokens.map((t) => ({ term: { contains: t, mode: 'insensitive' } }))
        },
        take: 8,
        orderBy: { term: 'asc' }
      })
      : [];

    const seeAlsoResources = tokens.length
      ? await prisma.libraryResource.findMany({
        where: {
          OR: tokens.map((t) => ({ title: { contains: t, mode: 'insensitive' } }))
        },
        take: 8,
        orderBy: { createdAt: 'desc' }
      })
      : [];

    return res.json({
      item: mapDictionaryTerm(term),
      isFavorite: Boolean(favorite),
      seeAlso: {
        terms: seeAlsoTerms.map(mapDictionaryTerm),
        resources: seeAlsoResources.map(mapResource)
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function createDictionaryTerm(req, res, next) {
  try {
    const term = String(req.body.term || '').trim();
    const kind = String(req.body.kind || 'TERME').trim().toUpperCase();
    const definition = String(req.body.definition || '').trim();
    const example = req.body.example ? String(req.body.example).trim() : null;

    if (!term || !definition) return res.status(400).json({ message: 'Terme et définition requis.' });
    const letterIndex = normalizeText(term).slice(0, 1).toUpperCase();

    const created = await prisma.informaticsDictionaryTerm.create({
      data: {
        term,
        kind,
        definition,
        example,
        letterIndex: /^[A-Z]$/.test(letterIndex) ? letterIndex : '#',
        createdById: req.user.id
      }
    });

    await upsertSearchIndex({
      title: created.term,
      type: 'DICTIONNAIRE',
      category: 'Dictionnaire Informatique',
      referenceId: created.id
    });

    return res.status(201).json({ item: mapDictionaryTerm(created) });
  } catch (error) {
    return next(error);
  }
}

async function listFavorites(req, res, next) {
  try {
    const { page, pageSize, skip, take } = getPagination(req.query);
    const type = String(req.query.type || '').trim().toUpperCase();

    const where = { userId: req.user.id };
    if (type) where.type = type;

    const [total, rows] = await Promise.all([
      prisma.favorite.count({ where }),
      prisma.favorite.findMany({
        where,
        include: { resource: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    return res.json({
      page,
      pageSize,
      total,
      items: rows.map((row) => ({
        id: row.id,
        type: row.type,
        referenceId: row.referenceId,
        createdAt: row.createdAt,
        resource: row.resource ? mapResource(row.resource) : null
      }))
    });
  } catch (error) {
    return next(error);
  }
}

async function addFavorite(req, res, next) {
  try {
    const type = String(req.body.type || 'RESOURCE').trim().toUpperCase();
    const resourceId = req.body.resourceId ? Number(req.body.resourceId) : null;
    const referenceId = req.body.referenceId ? Number(req.body.referenceId) : null;

    let finalReferenceId = referenceId;
    let finalResourceId = null;

    if (type === 'RESOURCE') {
      const id = resourceId || referenceId;
      if (!id || !Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'resourceId requis.' });
      const resource = await prisma.libraryResource.findUnique({ where: { id } });
      if (!resource) return res.status(404).json({ message: 'Ressource introuvable.' });
      finalReferenceId = id;
      finalResourceId = id;
    } else {
      if (!finalReferenceId || !Number.isInteger(finalReferenceId) || finalReferenceId <= 0) {
        return res.status(400).json({ message: 'referenceId requis.' });
      }
    }

    const created = await prisma.favorite.upsert({
      where: {
        userId_type_referenceId: {
          userId: req.user.id,
          type,
          referenceId: finalReferenceId
        }
      },
      create: {
        userId: req.user.id,
        type,
        referenceId: finalReferenceId,
        resourceId: finalResourceId
      },
      update: {}
    });

    return res.status(201).json({ item: { id: created.id, type: created.type, referenceId: created.referenceId } });
  } catch (error) {
    return next(error);
  }
}

async function removeFavorite(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Identifiant invalide.' });
    const existing = await prisma.favorite.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) return res.status(404).json({ message: 'Favori introuvable.' });

    await prisma.favorite.delete({ where: { id } });
    return res.json({ message: 'Favori supprimé.', id });
  } catch (error) {
    return next(error);
  }
}

async function librarySearch(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ query: '', groups: {} });

    const tokens = tokenizeForRecommendations(q);
    const like = q;

    const isStudent = req.user.role === 'STUDENT';
    let examLevel = null;
    if (isStudent) {
      const student = await prisma.student.findUnique({ where: { id: req.user.id } });
      examLevel = student ? resolveStudentLevel(student) : null;
    }
    const examWhere = examLevel ? { level: examLevel } : {};

    const [terms, resources, books, exams] = await Promise.all([
      prisma.informaticsDictionaryTerm.findMany({
        where: {
          OR: [
            { term: { contains: like, mode: 'insensitive' } },
            { definition: { contains: like, mode: 'insensitive' } }
          ]
        },
        take: 10,
        orderBy: { term: 'asc' }
      }),
      prisma.libraryResource.findMany({
        where: {
          OR: [
            { title: { contains: like, mode: 'insensitive' } },
            { author: { contains: like, mode: 'insensitive' } },
            { description: { contains: like, mode: 'insensitive' } }
          ]
        },
        take: 12,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.libraryBook.findMany({
        where: {
          isDeleted: false,
          ...(isStudent ? { status: 'APPROVED' } : {}),
          OR: [
            { title: { contains: like, mode: 'insensitive' } },
            { author: { contains: like, mode: 'insensitive' } },
            { subject: { contains: like, mode: 'insensitive' } }
          ]
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.probable_exercise_sources.findMany({
        where: {
          ...examWhere,
          OR: [
            { subject: { contains: like, mode: 'insensitive' } },
            { topic: { contains: like, mode: 'insensitive' } },
            { file_name: { contains: like, mode: 'insensitive' } }
          ]
        },
        take: 12,
        orderBy: { created_at: 'desc' }
      })
    ]);

    const groups = {
      dictionnaire: terms.map((row) => ({ id: row.id, term: row.term, kind: row.kind })),
      livres: books.map((row) => ({ id: row.id, title: row.title, author: row.author, coverImageUrl: row.coverImageUrl })),
      supports: resources
        .filter((row) => normalizeText(row.category).includes('support'))
        .map(mapResource),
      examens: exams.map(mapExam),
      ressources: resources.map(mapResource)
    };

    // lightweight additional suggestions: similar videos
    const videoSuggestions = tokens.length
      ? await prisma.content.findMany({
        where: {
          type: 'VIDEO',
          status: 'APPROVED',
          OR: tokens.map((t) => ({ title: { contains: t, mode: 'insensitive' } }))
        },
        take: 6,
        orderBy: { createdAt: 'desc' }
      })
      : [];

    return res.json({
      query: q,
      groups,
      suggestions: {
        videos: videoSuggestions.map((row) => ({
          id: row.id,
          title: row.title,
          type: row.type.toLowerCase(),
          status: row.status.toLowerCase()
        }))
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function reindexLibrary(req, res, next) {
  try {
    // Admin-only maintenance endpoint.
    await prisma.searchIndex.deleteMany({});

    const [resources, terms, books, exams] = await Promise.all([
      prisma.libraryResource.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.informaticsDictionaryTerm.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.libraryBook.findMany({ where: { isDeleted: false }, orderBy: { createdAt: 'desc' } }),
      prisma.probable_exercise_sources.findMany({ orderBy: { created_at: 'desc' } })
    ]);

    const rows = [];
    resources.forEach((r) => rows.push({
      title: r.title,
      type: mapCategoryToIndexType(r.category),
      category: r.category,
      referenceId: r.id
    }));
    terms.forEach((t) => rows.push({
      title: t.term,
      type: 'DICTIONNAIRE',
      category: 'Dictionnaire Informatique',
      referenceId: t.id
    }));
    books.forEach((b) => rows.push({
      title: b.title,
      type: 'LIVRE',
      category: b.subject,
      referenceId: b.id
    }));
    exams.forEach((e) => rows.push({
      title: `${e.subject} - ${e.topic}`,
      type: 'EXAMEN',
      category: `${toApiLevel(normalizeLevelInput(e.level) || e.level) || e.level}`,
      referenceId: e.id
    }));

    for (const row of rows) {
      await upsertSearchIndex(row);
    }

    return res.json({ message: 'Index reconstruit.', count: rows.length });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
  listDictionaryTerms,
  suggestDictionaryTerms,
  getDictionaryTerm,
  createDictionaryTerm,
  listFavorites,
  addFavorite,
  removeFavorite,
  librarySearch,
  reindexLibrary
};

