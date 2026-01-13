const axios = require('axios');

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Send WhatsApp message using Cloud API
 */
const sendWhatsAppMessage = async (to, message) => {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      console.warn('WhatsApp credentials not configured. Skipping WhatsApp notification.');
      return null;
    }

    // Remove + from phone number if present
    const cleanPhone = to.replace('+', '');

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('WhatsApp message sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Send order placed WhatsApp notification
 */
const sendOrderPlacedWhatsApp = async (user, order) => {
  const message = `🎉 Hi ${user.name}!\n\nYour order has been placed successfully!\n\n📦 Order Number: ${order.orderNumber}\n💰 Total Amount: ₹${order.totalAmount}\n📅 Date: ${new Date(order.createdAt).toLocaleDateString()}\n\nWe'll notify you when your order ships.\n\nThank you for shopping with SKStore! 🛒`;

  try {
    await sendWhatsAppMessage(user.phone, message);
  } catch (error) {
    console.error('Failed to send WhatsApp notification:', error);
    // Don't throw error - notification failure shouldn't break order flow
  }
};

/**
 * Send order status update WhatsApp notification
 */
const sendOrderStatusWhatsApp = async (user, order, status) => {
  const statusMessages = {
    CONFIRMED: '✅ Your order has been confirmed!',
    PACKED: '📦 Your order is being packed!',
    SHIPPED: '🚚 Your order has been shipped!',
    DELIVERED: '🎊 Your order has been delivered!',
    CANCELLED: '❌ Your order has been cancelled.'
  };

  const message = `Hi ${user.name},\n\n${statusMessages[status]}\n\n📦 Order Number: ${order.orderNumber}\n\nTrack your order: ${process.env.FRONTEND_URL}/orders/${order._id}\n\nThank you for shopping with SKStore! 🛒`;

  try {
    await sendWhatsAppMessage(user.phone, message);
  } catch (error) {
    console.error('Failed to send WhatsApp notification:', error);
  }
};

/**
 * Send invoice WhatsApp notification
 */
const sendInvoiceWhatsApp = async (user, order, invoiceUrl) => {
  const message = `Hi ${user.name},\n\n📄 Your invoice for order ${order.orderNumber} is ready!\n\nDownload your invoice: ${invoiceUrl}\n\nThank you for shopping with SKStore! 🛒`;

  try {
    await sendWhatsAppMessage(user.phone, message);
  } catch (error) {
    console.error('Failed to send WhatsApp notification:', error);
  }
};

/**
 * Send admin notification
 */
const sendAdminWhatsApp = async (message) => {
  const adminPhone = process.env.ADMIN_PHONE;
  
  if (!adminPhone) {
    console.warn('Admin phone not configured. Skipping admin WhatsApp notification.');
    return;
  }

  try {
    await sendWhatsAppMessage(adminPhone, message);
  } catch (error) {
    console.error('Failed to send admin WhatsApp notification:', error);
  }
};

/**
 * Notify admin about new order
 */
const notifyAdminNewOrder = async (order, user) => {
  const message = `🔔 NEW ORDER RECEIVED!\n\n📦 Order: ${order.orderNumber}\n👤 Customer: ${user.name}\n💰 Amount: ₹${order.totalAmount}\n📅 Date: ${new Date().toLocaleString()}\n\nView order: ${process.env.FRONTEND_URL}/admin/orders/${order._id}`;

  await sendAdminWhatsApp(message);
};

module.exports = {
  sendWhatsAppMessage,
  sendOrderPlacedWhatsApp,
  sendOrderStatusWhatsApp,
  sendInvoiceWhatsApp,
  sendAdminWhatsApp,
  notifyAdminNewOrder
};
