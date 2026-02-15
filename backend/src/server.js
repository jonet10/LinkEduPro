require('dotenv').config();
const app = require('./app');
const prisma = require('./config/prisma');

const port = process.env.PORT || 5000;

async function start() {
  try {
    await prisma.$connect();
    app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
