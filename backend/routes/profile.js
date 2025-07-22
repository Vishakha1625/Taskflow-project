const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const router = express.Router();


// GET /api/profile → user info
router.get('/', auth, async (req, res) => {
  const { name, email, role, avatar } = req.user;
  res.json({ name, email, role, avatar });
});

// GET /api/profile/stats → dashboard stats
router.get('/stats', auth, async (req, res) => {
  try {
    const completedTasks = await Task.countDocuments({ assignedTo: req.user._id, status: 'done' });
    const completedProjects = await Project.countDocuments({ assignedTo: req.user._id });
    const rating = Math.min((completedTasks + completedProjects) / 10, 5).toFixed(1); // adjust if needed

    res.json({
      completedTasks,
      completedProjects,
      rating
    });
  } catch (err) {
    console.error('Profile stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// PUT /api/profile → update user
router.put('/', auth, async (req, res) => {
  const { name, email, avatar } = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name, email, avatar },
      { new: true }
    ).select('-password');

    res.json({ message: 'Profile updated', user: updatedUser });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

module.exports = router;