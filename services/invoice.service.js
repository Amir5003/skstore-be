const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF invoice
 */
const generateInvoice = async (order, user) => {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });

      // Create invoices directory if it doesn't exist
      const invoicesDir = path.join(__dirname, '../invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      // Generate invoice filename
      const invoiceNumber = `INV-${order.orderNumber}-${Date.now()}`;
      const filename = `${invoiceNumber}.pdf`;
      const filepath = path.join(invoicesDir, filename);

      // Pipe PDF to file
      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      // Add header
      doc
        .fontSize(20)
        .text('INVOICE', 50, 50, { align: 'center' })
        .fontSize(10)
        .text('SKStore E-commerce', 50, 80, { align: 'center' })
        .moveDown();

      // Add invoice details
      doc
        .fontSize(12)
        .text(`Invoice Number: ${invoiceNumber}`, 50, 120)
        .text(`Order Number: ${order.orderNumber}`, 50, 140)
        .text(`Invoice Date: ${new Date().toLocaleDateString()}`, 50, 160)
        .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, 180)
        .moveDown();

      // Add customer details
      doc
        .fontSize(14)
        .text('Bill To:', 50, 220)
        .fontSize(11)
        .text(user.name, 50, 240)
        .text(user.email, 50, 255)
        .text(user.phone, 50, 270)
        .moveDown();

      // Add shipping address
      const address = order.shippingAddress;
      doc
        .fontSize(14)
        .text('Ship To:', 50, 310)
        .fontSize(11)
        .text(address.fullName, 50, 330)
        .text(address.addressLine1, 50, 345)
        .text(address.addressLine2 || '', 50, 360)
        .text(`${address.city}, ${address.state} - ${address.pincode}`, 50, 375)
        .text(address.country, 50, 390)
        .moveDown();

      // Add items table header
      const tableTop = 430;
      doc
        .fontSize(11)
        .text('Item', 50, tableTop, { bold: true })
        .text('Qty', 300, tableTop)
        .text('Price', 370, tableTop)
        .text('Total', 450, tableTop);

      // Draw line
      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

      // Add items
      let yPosition = tableTop + 25;
      order.items.forEach((item) => {
        doc
          .fontSize(10)
          .text(item.name, 50, yPosition, { width: 220 })
          .text(item.quantity, 300, yPosition)
          .text(`₹${item.finalPrice}`, 370, yPosition)
          .text(`₹${item.subtotal}`, 450, yPosition);
        
        yPosition += 25;
      });

      // Draw line before totals
      yPosition += 10;
      doc
        .moveTo(350, yPosition)
        .lineTo(550, yPosition)
        .stroke();

      // Add totals
      yPosition += 15;
      doc
        .fontSize(11)
        .text('Subtotal:', 370, yPosition)
        .text(`₹${order.subtotal}`, 450, yPosition);

      if (order.discount > 0) {
        yPosition += 20;
        doc
          .text('Discount:', 370, yPosition)
          .text(`-₹${order.discount}`, 450, yPosition);
      }

      if (order.shippingCharges > 0) {
        yPosition += 20;
        doc
          .text('Shipping:', 370, yPosition)
          .text(`₹${order.shippingCharges}`, 450, yPosition);
      }

      if (order.tax > 0) {
        yPosition += 20;
        doc
          .text('Tax:', 370, yPosition)
          .text(`₹${order.tax}`, 450, yPosition);
      }

      yPosition += 20;
      doc
        .fontSize(13)
        .text('Total:', 370, yPosition, { bold: true })
        .text(`₹${order.totalAmount}`, 450, yPosition);

      // Add payment method
      yPosition += 40;
      doc
        .fontSize(11)
        .text(`Payment Method: ${order.paymentMethod}`, 50, yPosition)
        .text(`Payment Status: ${order.paymentStatus}`, 50, yPosition + 20);

      // Add footer
      doc
        .fontSize(10)
        .text('Thank you for shopping with SKStore!', 50, 700, { align: 'center' })
        .text('For any queries, contact us at support@skstore.com', 50, 720, { align: 'center' });

      // Finalize PDF
      doc.end();

      // Wait for file to be written
      writeStream.on('finish', () => {
        resolve({
          filename,
          filepath,
          invoiceNumber
        });
      });

      writeStream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateInvoice };
