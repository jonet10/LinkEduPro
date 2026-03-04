require('dotenv').config();
const app = require('./app');
const prisma = require('./config/prisma');
const { seedDefaultLibraryBooks } = require('./services/library-seed.service');

const port = process.env.PORT || 5000;

async function start() {
  try {
    await prisma.$connect();
    if (String(process.env.LIBRARY_SEED_ENABLED || '').toLowerCase() === 'true') {
      await seedDefaultLibraryBooks();
    }
    app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
