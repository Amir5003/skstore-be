const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Send email
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send order placed email
 */
const sendOrderPlacedEmail = async (user, order) => {
  const subject = `Order Confirmed - ${order.orderNumber}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .order-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmed!</h1>
        </div>
        <div class="content">
          <p>Hi ${user.name},</p>
          <p>Thank you for your order! We're excited to confirm that we've received your order.</p>
          
          <div class="order-details">
            <h3>Order Details</h3>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
            <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
            <p><strong>Order Status:</strong> ${order.orderStatus}</p>
          </div>

          <p>We'll send you another email when your order ships.</p>
          
          <a href="${process.env.FRONTEND_URL}/orders/${order._id}" class="button">Track Your Order</a>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} SKStore. All rights reserved.</p>
          <p>If you have any questions, please contact us at ${process.env.EMAIL_FROM}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject,
    html
  });
};

/**
 * Send order status update email
 */
const sendOrderStatusEmail = async (user, order, status) => {
  const statusMessages = {
    CONFIRMED: 'Your order has been confirmed!',
    PACKED: 'Your order is being packed!',
    SHIPPED: 'Your order has been shipped!',
    DELIVERED: 'Your order has been delivered!',
    CANCELLED: 'Your order has been cancelled.'
  };

  const subject = `Order ${status} - ${order.orderNumber}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${statusMessages[status]}</h1>
        </div>
        <div class="content">
          <p>Hi ${user.name},</p>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Status:</strong> ${status}</p>
          ${status === 'DELIVERED' ? '<p>We hope you enjoy your purchase!</p>' : ''}
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} SKStore. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject,
    html
  });
};

/**
 * Send invoice email
 */
const sendInvoiceEmail = async (user, order, invoiceUrl) => {
  const subject = `Invoice for Order ${order.orderNumber}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Invoice</h1>
        </div>
        <div class="content">
          <p>Hi ${user.name},</p>
          <p>Your invoice for order <strong>${order.orderNumber}</strong> is ready.</p>
          <p>Click the button below to download your invoice:</p>
          <a href="${invoiceUrl}" class="button">Download Invoice</a>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} SKStore. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject,
    html
  });
};

module.exports = {
  sendEmail,
  sendOrderPlacedEmail,
  sendOrderStatusEmail,
  sendInvoiceEmail
};
