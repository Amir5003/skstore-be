const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
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

// Index for better query performance
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
