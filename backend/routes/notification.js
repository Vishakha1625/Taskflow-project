// routes/notification.js
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

// Get recent notifications (latest 10)
router.get('/', auth, async (req, res) => {
   console.log('[GET] /api/notification hit');
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});
router.patch('/mark-read', auth, async (req, res) => {
  try {
    await Notification.updateMany({ read: false }, { $set: { read: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

module.exports = router;
