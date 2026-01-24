const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF invoice
 */
const generateInvoice = async (order, user, shop, shopOwner) => {
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

      // Add header with Shop details
      doc
        .fontSize(20)
        .text('INVOICE', 50, 50, { align: 'center' })
        .fontSize(14)
        .text(shop.name, 50, 80, { align: 'center' })
        .fontSize(10);
      
      // Add shop contact details (use shop contact or fallback to owner)
      let headerY = 100;
      const contactEmail = shop.contact?.email || shopOwner?.email;
      const contactPhone = shop.contact?.phone || shopOwner?.phone;
      const contactWhatsapp = shop.contact?.whatsapp || contactPhone;
      
      if (contactEmail) {
        doc.text(`Email: ${contactEmail}`, 50, headerY, { align: 'center' });
        headerY += 15;
      }
      if (contactPhone) {
        doc.text(`Phone: ${contactPhone}`, 50, headerY, { align: 'center' });
        headerY += 15;
      }
      if (contactWhatsapp && contactWhatsapp !== contactPhone) {
        doc.text(`WhatsApp: ${contactWhatsapp}`, 50, headerY, { align: 'center' });
        headerY += 15;
      }
      if (shop.address) {
        const address = shop.address;
        let addressText = '';
        if (address.addressLine1) addressText += address.addressLine1 + ', ';
        if (address.addressLine2) addressText += address.addressLine2 + ', ';
        if (address.city) addressText += address.city + ', ';
        if (address.state) addressText += address.state + ' ';
        if (address.pincode) addressText += '- ' + address.pincode;
        if (addressText) {
          doc.text(addressText, 50, headerY, { align: 'center' });
          headerY += 15;
        }
      }
      
      doc.moveDown();

      // Add invoice details
      const invoiceDetailsY = headerY + 20;
      doc
        .fontSize(12)
        .text(`Invoice Number: ${invoiceNumber}`, 50, invoiceDetailsY)
        .text(`Order Number: ${order.orderNumber}`, 50, invoiceDetailsY + 20)
        .text(`Invoice Date: ${new Date().toLocaleDateString()}`, 50, invoiceDetailsY + 40)
        .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, invoiceDetailsY + 60)
        .moveDown();

      // Add customer details
      const customerY = invoiceDetailsY + 100;
      doc
        .fontSize(14)
        .text('Bill To:', 50, customerY)
        .fontSize(11)
        .text(user.name, 50, customerY + 20)
        .text(user.email, 50, customerY + 35)
        .text(user.phone, 50, customerY + 50)
        .moveDown();

      // Add shipping address
      const shippingY = customerY + 90;
      const shippingAddress = order.shippingAddress;
      doc
        .fontSize(14)
        .text('Ship To:', 50, shippingY)
        .fontSize(11)
        .text(shippingAddress.fullName, 50, shippingY + 20)
        .text(shippingAddress.addressLine1, 50, shippingY + 35)
        .text(shippingAddress.addressLine2 || '', 50, shippingY + 50)
        .text(`${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}`, 50, shippingY + 65)
        .text(shippingAddress.country, 50, shippingY + 80)
        .moveDown();

      // Add items table header
      const tableTop = shippingY + 120;
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
          .text(`Rs.${item.finalPrice}`, 370, yPosition)
          .text(`Rs.${item.subtotal}`, 450, yPosition);
        
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
        .text(`Rs.${order.subtotal}`, 450, yPosition);

      if (order.discount > 0) {
        yPosition += 20;
        doc
          .text('Discount:', 370, yPosition)
          .text(`-Rs.${order.discount}`, 450, yPosition);
      }

      if (order.shippingCharges > 0) {
        yPosition += 20;
        doc
          .text('Shipping:', 370, yPosition)
          .text(`Rs.${order.shippingCharges}`, 450, yPosition);
      }

      if (order.tax > 0) {
        yPosition += 20;
        doc
          .text('Tax:', 370, yPosition)
          .text(`Rs.${order.tax}`, 450, yPosition);
      }

      yPosition += 20;
      doc
        .fontSize(13)
        .text('Total:', 370, yPosition, { bold: true })
        .text(`Rs.${order.totalAmount}`, 450, yPosition);

      // Add payment method
      yPosition += 40;
      doc
        .fontSize(11)
        .text(`Payment Method: ${order.paymentMethod}`, 50, yPosition)
        .text(`Payment Status: ${order.paymentStatus}`, 50, yPosition + 20);

      // Add footer with shop details
      yPosition += 60;
      doc
        .fontSize(10)
        .text(`Thank you for shopping with ${shop.name}!`, 50, yPosition, { align: 'center' });
      
      const footerEmail = shop.contact?.email || shopOwner?.email;
      const footerPhone = shop.contact?.phone || shopOwner?.phone;
      
      if (footerEmail || footerPhone) {
        yPosition += 15;
        let contactText = 'For any queries, contact us';
        if (footerEmail && footerPhone) {
          contactText += ` at ${footerEmail} or call ${footerPhone}`;
        } else if (footerEmail) {
          contactText += ` at ${footerEmail}`;
        } else if (footerPhone) {
          contactText += ` at ${footerPhone}`;
        }
        doc.text(contactText, 50, yPosition, { align: 'center' });
      }

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
