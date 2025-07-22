// routes/dashboard.js
const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    // Fetch all users, tasks, and projects in parallel
    const [users, rawProjects, tasks] = await Promise.all([
      User.find(),
      Project.find().populate('assignedTo', 'name avatar role'),
      Task.find().populate('project', 'name').populate('assignedTo', 'name avatar role')
    ]);

    const notifications = await Notification.find()
  .sort({ createdAt: -1 })
  .limit(10);

    // Map to hold projectId => { totalTasks, doneTasks }
    const projectProgressMap = {};

    tasks.forEach(task => {
      const projId = task.project?._id?.toString();
      if (!projId) return;

      if (!projectProgressMap[projId]) {
        projectProgressMap[projId] = { total: 0, done: 0 };
      }

      projectProgressMap[projId].total++;
      if (task.status === 'done') {
        projectProgressMap[projId].done++;
      }
    });

    // Add progress % to each project
    const projects = rawProjects.map(project => {
      const p = project.toObject(); // convert to plain object
      const stats = projectProgressMap[project._id.toString()] || { total: 0, done: 0 };
      p.progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

       // Ensure all assigned users are full objects (in case populate missed any)
      p.assignedTo = (p.assignedTo || []).map(u => {
        if (typeof u === 'object') return u;
        const fullUser = users.find(user => user._id.toString() === u.toString());
        return fullUser || { _id: u, name: 'Unknown', avatar: '', role: '' };
      });
      return p;
    });

    // Attach stats + badge to each user
    users.forEach(user => {
      const userId = user._id.toString();
      const projectCount = projects.filter(p =>
        (p.assignedTo || []).some(u => u._id?.toString() === userId)
      ).length;
      const taskCount = tasks.filter(t =>
        (t.assignedTo?._id?.toString() || t.assignedTo?.toString()) === userId
      ).length;

      user._doc.stats = {
        projects: projectCount,
        tasks: taskCount
      };
      user._doc.badge = user.role === 'admin' ? 'admin' : (user.role === 'manager' ? 'manager' : 'member');
    });

    // Global completion rate for dashboard card
    const completionRate = tasks.length
      ? Math.round(tasks.filter(t => t.status === 'done').length / tasks.length * 100)
      : 0;



    res.json({
      users,
      projects,
      tasks,
      notifications,
      stats: {
        totalProjects: projects.length,
        totalTasks: tasks.length,
        totalUsers: users.length,
        completionRate
      }
    });
  } catch (err) {
    console.error('[Dashboard Error]', err);
    res.status(500).json({ error: 'Dashboard load failed' });
  }
});

module.exports = router;
