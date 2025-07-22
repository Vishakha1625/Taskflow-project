const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  deadline: Date,
  budget: Number,
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  progress: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);

