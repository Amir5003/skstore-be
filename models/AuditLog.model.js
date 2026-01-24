const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE_PRODUCT',
      'UPDATE_PRODUCT',
      'DELETE_PRODUCT',
      'ACTIVATE_PRODUCT',
      'DEACTIVATE_PRODUCT',
      'UPDATE_ORDER_STATUS',
      'CREATE_USER',
      'UPDATE_USER',
      'DELETE_USER',
      'BLOCK_USER',
      'UNBLOCK_USER',
      'UPDATE_USER_STATUS',
      'UPDATE_USER_ROLE',
      'OTHER'
    ]
  },
  entity: {
    type: String,
    required: true,
    enum: ['USER', 'PRODUCT', 'ORDER', 'SYSTEM']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Index for better query performance with shop isolation
auditLogSchema.index({ shopId: 1, createdAt: -1 });
auditLogSchema.index({ shopId: 1, user: 1, createdAt: -1 });
auditLogSchema.index({ shopId: 1, entity: 1, entityId: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
