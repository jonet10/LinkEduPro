const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

async function generateReceiptPdf(payment, outputDir) {
  await fs.promises.mkdir(outputDir, { recursive: true });
  const fileName = `receipt-${payment.receiptNumber}.pdf`;
  const absolutePath = path.join(outputDir, fileName);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(absolutePath);

    stream.on('finish', resolve);
    stream.on('error', reject);

    doc.pipe(stream);
    doc.fontSize(18).text('School Payment Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Receipt: ${payment.receiptNumber}`);
    doc.text(`Date: ${new Date(payment.paymentDate).toISOString()}`);
    doc.text(`School: ${payment.school.name}`);
    doc.text(`Student: ${payment.student.firstName} ${payment.student.lastName}`);
    doc.text(`Class: ${payment.schoolClass.name}`);
    doc.text(`Academic year: ${payment.academicYear.label}`);
    doc.text(`Payment type: ${payment.paymentType.name}`);
    doc.text(`Amount due: ${payment.amountDue}`);
    doc.text(`Amount paid: ${payment.amountPaid}`);
    doc.text(`Status: ${payment.status}`);
    doc.text(`Recorded by: ${payment.recordedBy.firstName} ${payment.recordedBy.lastName}`);
    if (payment.notes) {
      doc.moveDown();
      doc.text(`Notes: ${payment.notes}`);
    }
    doc.end();
  });

  return { fileName, absolutePath };
}

module.exports = { generateReceiptPdf };
