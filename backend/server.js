// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const projectRoutes = require('./routes/project');
const taskRoutes = require('./routes/task');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notification');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log(' MongoDB connected'))
  .catch(err => console.error(' MongoDB connection error:', err));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notification', notificationRoutes);

// Serve static frontend files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Serve specific HTML pages for routing
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'login.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'dashboard.html'));
});

// Optional: add other frontend pages here if needed
// app.get('/profile.html', ...);

// Catch unknown frontend routes with 404


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});
