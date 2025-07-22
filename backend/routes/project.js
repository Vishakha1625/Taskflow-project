const express = require('express');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { auth } = require('../middleware/auth');
const Notification = require('../models/Notification');
const router = express.Router();

const isAdminOrManager = (role) => ['admin', 'manager'].includes(role);
// Create project (Admin only)
router.post('/', auth, async (req, res) => {
  if (!isAdminOrManager(req.user.role)) {
    return res.status(403).json({ error: 'Only admins can create projects' });
  }

  const { name, description, budget, deadline, assignedTo } = req.body;
  if (!name || !assignedTo || !Array.isArray(assignedTo) || assignedTo.length === 0) {
    return res.status(400).json({ error: 'Project must have a name and at least one assigned user' });
  }

  const project = new Project({ name, description, budget, deadline, assignedTo });
  await project.save();
  await Notification.create({
      message: `Project "${project.name}" was created`,
      user: req.user._id
    });
  const populated = await Project.findById(project._id).populate('assignedTo', 'name avatar');
  res.status(201).json(populated);
});

router.get('/', auth, async (req, res) => {
  const filter = isAdminOrManager(req.user.role) ? {} : { assignedTo: req.user._id };
  const projects = await Project.find(filter).populate('assignedTo', 'name avatar');

  const projectsWithProgress = await Promise.all(projects.map(async p => {
    const total = await Task.countDocuments({ project: p._id });
    const done = await Task.countDocuments({ project: p._id, status: 'done' });
    const progress = total ? Math.round((done / total) * 100) : 0;
    return { ...p.toObject(), progress };
  }));

  
  res.json(projectsWithProgress);
});

// Assign new users to project
router.put('/:id/assign', auth, async (req, res) => {
  if (!isAdminOrManager(req.user.role)) return res.status(403).json({ error: 'Only admins and managers can assign members' });

  const { assignedTo } = req.body;
  console.log('Incoming assignedTo:', assignedTo); 
 if (!Array.isArray(assignedTo)) {
    return res.status(400).json({ error: 'assignedTo must be an array of user IDs' });
  }

  try {
    // 1. Update assigned users
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { assignedTo },
      { new: true }
    ).populate('assignedTo', 'name avatar role');

    console.log('Project after update:', project);

    if (!project) return res.status(404).json({ error: 'Project not found' });

    // 2. Recalculate progress
    const total = await Task.countDocuments({ project: project._id });
    const done = await Task.countDocuments({ project: project._id, status: 'done' });
    const progress = total ? Math.round((done / total) * 100) : 0;

    // 3. Return updated project
    const projectWithProgress = project.toObject();
    projectWithProgress.progress = progress;

    res.json(projectWithProgress);
  } catch (err) {
    console.error('[PUT /projects/:id/assign] Failed:', err);
    res.status(500).json({ error: 'Failed to assign members to project' });
  }
});

// DELETE Project (Admin Only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!isAdminOrManager(req.user.role)) {
      return res.status(403).json({ error: 'Only admin can delete projects' });
    }

    const projectId = req.params.id;

    // Optionally, delete all related tasks
    await Task.deleteMany({ project: projectId });

    // Delete the project
    await Project.findByIdAndDelete(projectId);

    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    console.error('Delete Project Error:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});


module.exports = router;
