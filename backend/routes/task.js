// routes/task.js
const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const isAdminOrManager = (role) => ['admin', 'manager'].includes(role);

// Create a new task
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, priority, project, assignedTo } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const task = new Task({
      title,
      description,
      priority: priority || 'low',
      assignedTo,
      project: project || null,
      status: 'todo',
      createdBy: req.user._id
    });

    await task.save();
    await Notification.create({
  message: `New task "${task.title}" created.`,
  link: `/tasks/${task._id}`
});
    res.status(201).json(task);
  } catch (err) {
    console.error('Task creation failed:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// 🔹 Get all tasks (admin sees all, others see only their assigned ones)
router.get('/', auth, async (req, res) => {
  try {
    const filter = isAdminOrManager(req.user.role) ? {} : { assignedTo: req.user._id };
    const tasks = await Task.find(filter)
      .populate('project', 'name')
      .populate('assignedTo', 'name avatar');
    
    res.json(tasks);
  } catch (err) {
    console.error('Fetching tasks failed:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// 🔹 Update a task (only admin or assigned user)
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Authorization check
    const isAdmin = isAdminOrManager(req.user.role);
    const isAssigned = task.assignedTo.toString() === req.user._id.toString();

    if (!isAdmin && !isAssigned) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    Object.assign(task, req.body);
    await task.save();

    res.json(task);
  } catch (err) {
    console.error('Task update failed:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});


// Patch only task status (for Kanban updates)
// PATCH only task status (used in Kanban drag-drop)
router.patch('/:id', auth, async (req, res) => {
  try {
    console.log('PATCH hit for task', req.params.id);
  console.log('User:', req.user);
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Auth: admin or assigned user
    const isAdmin = isAdminOrManager(req.user.role);
    const isAssigned = task.assignedTo?.toString() === req.user._id.toString();

    if (!isAdmin && !isAssigned) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    task.status = status;
    await task.save();

    res.json(task);
   await Notification.create({
      message: `Task "${task.title}" status changed to "${status}".`,
       user: req.user._id,
      link: `/tasks/${task._id}`
    });



  } catch (err) {
    console.error('PATCH status update failed:', err);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});


// Delete a task (only admin or creator)
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isAdmin = isAdminOrManager(req.user.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to delete this task' });
    }

    await task.deleteOne();
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});


module.exports = router;
