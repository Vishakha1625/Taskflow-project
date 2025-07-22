const API = '/api';
let TOKEN = null;
let user = null;

TOKEN = sessionStorage.getItem('token');
user = JSON.parse(sessionStorage.getItem('user') || '{}');

// ===== Helper to call API =====
async function api(path, method = 'GET', payload = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {})
  };

  console.log('api call to', path);
  console.log('headers:',headers);

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : null
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(` API error for ${path}:`, data);
    throw data;
  }
  return data;
  }

// ===== Login =====
document.getElementById('loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const email = e.target.loginEmail.value;
  const password = e.target.loginPassword.value;
  try {
    const data = await api('/auth/login', 'POST', { email, password });
    
    sessionStorage.setItem('token', data.token);
    sessionStorage.setItem('user', JSON.stringify({
      _id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
      avatar: data.avatar
    }));

    window.location.href = 'dashboard.html';
  } catch (err) {
    alert(err.error || 'Login failed');
  }
});

// ===== Register =====
document.getElementById('registerForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const name = e.target.registerUsername.value;
  const email = e.target.registerEmail.value;
  const password = e.target.registerPassword.value;
  const role = e.target.registerRole.value;
  try {
    await api('/auth/register', 'POST', { name, email, password, role });
    alert('Registered! Please login.');
    window.location.href = 'login.html';
  } catch (err) {
    alert(err.error || 'Registration failed');
  }
});


// ===== Profile =====
document.addEventListener('DOMContentLoaded', async () => {
  console.log('loaded');
  if (!document.body.classList.contains('dashboard-page')) {
    console.log('class not found');
    return;
  }
  console.log('dashboard page');


  if (!TOKEN || !user || !user.name) {
      sessionStorage.clear();
       window.location.href = 'login.html';
       return;
    }
   user = JSON.parse(sessionStorage.getItem('user') || '{}');

  let profile, stats, dash;

try {
  profile = await api('/profile');
  console.log('Profile loaded:', profile);

  stats = await api('/profile/stats');
  console.log(' Stats loaded:', stats);

  dash = await api('/dashboard');
  console.log(' Dashboard data loaded:', dash);

  window.appData = {
    users: dash.users || [],
    projects: dash.projects || [],
    tasks: dash.tasks || []
  };
} catch (err) {
  console.error('[Session Load Error - API]', err);
  alert('Session expired. Please login again.');
  sessionStorage.clear();
  window.location.href = 'login.html';
  return;
}


  try {
    document.getElementById('userNameDisplay').textContent = profile.name || 'User';
    document.getElementById('headerAvatar').src = profile.avatar || 'images/avatar.png';
    document.getElementById('profileName').value = profile.name || 'User';
    document.getElementById('profileEmail').value = profile.email;
    document.getElementById('profileRole').value = profile.role;
    document.getElementById('profileAvatar').src = profile.avatar || 'images/avatar.png';


    document.getElementById('profile-completed-projects').textContent = stats.completedProjects;
    document.getElementById('profile-completed-tasks').textContent = stats.completedTasks;
    document.getElementById('profile-rating').textContent = stats.rating;

   

    document.getElementById('total-projects').textContent = dash.stats.totalProjects;
    document.getElementById('total-tasks').textContent = dash.stats.totalTasks;
    document.getElementById('total-users').textContent = dash.stats.totalUsers;
    document.getElementById('completion-rate').textContent = `${dash.stats.completionRate}%`;

    initDashboard(profile.role);
    renderStats();
    renderRecentTasks();
    renderProjects();
    renderKanbanBoard();
    renderTeams();
    renderProjectProgress();
    renderNotifications();

    // === Notification Logic ===
document.getElementById('notif-icon')?.addEventListener('click', async () => {
  const dropdown = document.getElementById('notif-dropdown');
  dropdown.classList.toggle('hidden');

  try {
    const notifications = await api('/notification');
    const container = document.getElementById('notif-items');
    const dot = document.getElementById('notif-dot');
    if (!notifications.length) {
      container.innerHTML = '<p>No notifications</p>';
      dot.style.display = 'none';
    } else {
      container.innerHTML = notifications.map(n => `
        <div class="notif-item">${n.message}</div>
      `).join('');
      
    }
    await api('/notification/mark-read', 'PATCH');
    dot.style.display = 'none';
  } catch (err) {
    console.error('Notification fetch error:', err);
    document.getElementById('notif-items').innerHTML = '<p>Error loading</p>';
  }
});


  } catch (err) {
    console.error('[DOM Error after successful API]', err);
  }
});


// ===== Avatar Preview =====
document.getElementById('avatarUpload')?.addEventListener('change', function () {
  const file = this.files[0];
  const preview = document.getElementById('profileAvatar');
  if (!file || !preview) return;
  const reader = new FileReader();
  reader.onload = () => {
    preview.src = reader.result;
    preview.dataset.avatar = reader.result;
  };
  reader.readAsDataURL(file);
});

// ===== Update Profile =====
document.getElementById('profileForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const name = e.target.profileName.value;
  const email = e.target.profileEmail.value;
  const avatar = document.getElementById('profileAvatar').dataset.avatar;
  try {
    const result = await api('/profile', 'PUT', { name, email, avatar });
    sessionStorage.setItem('user', JSON.stringify(result.user));
    document.getElementById('userNameDisplay').textContent = name;
    alert('Profile updated!');
  } catch {
    alert('Update failed');
  }
});

// ===== Logout =====
document.getElementById('logout-btn')?.addEventListener('click', logout);
function logout() {
sessionStorage.clear();
  window.location.href = 'login.html';
}



function renderStats() {
  const { tasks, projects, users } = window.appData;
  document.getElementById('total-projects').textContent = projects.length;
  document.getElementById('total-tasks').textContent = tasks.length;
  document.getElementById('total-users').textContent = users.length;
  const done = tasks.filter(t => t.status === 'done').length;
  const rate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  document.getElementById('completion-rate').textContent = `${rate}%`;
}

function renderRecentTasks() {
  const container = document.getElementById('recent-tasks');
  container.innerHTML = '';
  const recent = window.appData.tasks.slice(-5).reverse();

  for (const task of recent) {
   let assignedUser = null;

    if (typeof task.assignedTo === 'object' && task.assignedTo !== null) {
      assignedUser = task.assignedTo;
    } else {
      assignedUser = window.appData.users.find(u => u._id === task.assignedTo);
    }


    const el = document.createElement('div');
    el.className = `task-item ${task.priority}`;
    el.innerHTML = `
      <div class="task-info">
        <h4>${task.title}</h4>
        <p>Assigned to ${assignedUser?.name || 'Unknown'}</p>
      </div>
      <span class="task-status ${task.status}">${task.status}</span>
    `;
    container.appendChild(el);
  }
}

function renderProjects() {
  const container = document.getElementById('projects-grid');
  container.innerHTML = '';

  const projects = window.appData?.projects || [];


  for (const project of projects) {
      const assignedUsers = (project.assignedTo || []).map(user => {
       // Handle case where user is a string ID or null
      if (typeof user === 'string' || !user || !user.name) {
        return  window.appData.users.find(u => u._id === user) || { _id: user, name: 'Unknown', avatar: '', role: '' };
      }
      return user;
    });
     const currentRole = JSON.parse(sessionStorage.getItem('user'))?.role;
     const teamAvatars = assignedUsers.map(user => {
      const name = user?.name || 'Unknown';
      const avatar = user?.avatar || 'images/avatar.png';
      const uid = user?._id || user;
      const role = user?.role || '';
      return `
        <div class="avatar-wrapper">
          <img src="${avatar}" class="team-avatar" title="${name}">
          ${['admin', 'manager'].includes(currentRole) ? `<button class="remove-member-btn" data-project="${project._id}" data-user="${uid}">&times;</button>` : ''}
        </div>
      `;
    }).join('');

    const progress = project.progress || 0;

    const el = document.createElement('div');
    el.className = 'project-card';
     
    
    const isAdminOrManager = ['admin', 'manager'].includes(currentRole);

    el.innerHTML = `
      <div class="project-header">
        <div class="project-title-row">
          <h3>${project.name}</h3>
           ${isAdminOrManager ? `
           <button class="delete-project-btn" data-id="${project._id}" title="Delete Project">
              <i class="fas fa-trash-alt"></i>
           </button>` : ''}
        </div>

        <div class="project-meta">
          <span>Budget: $${project.budget || 0}</span>
          <span>Due: ${project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A'}</span>
        </div>
      </div>
      <div class="project-content">
        <p class="project-description">${project.description || ''}</p>
        <div class="project-progress">
          <div class="project-progress-label">
            <span>Progress</span>
            <span>${project.progress || 0}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${project.progress || 0}%"></div>
          </div>
        </div>
       <div class="project-team">
       <div class="team-avatars">
            ${teamAvatars}
          </div>
          <span>${assignedUsers.length} members</span>
       </div>

      </div>
    `;

    container.appendChild(el);
  }
}
function renderProjectProgress() {
  const container = document.getElementById('project-progress');
  if (!container || !window.appData?.projects) return;

  container.innerHTML = window.appData.projects
    .slice(0, 4)
    .map(project => `
      <div class="progress-item">
        <div class="progress-header">
          <h4>${project.name}</h4>
          <span class="progress-percentage">${project.progress || 0}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${project.progress || 0}%"></div>
        </div>
      </div>
    `).join('');
}

function attachDragAndDropHandlers() {
  const cards = document.querySelectorAll('.task-card');
  const columns = document.querySelectorAll('.column-content');

  cards.forEach(card => {
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', card.dataset.id);
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', e => {
      card.classList.remove('dragging');
    });
  });

  columns.forEach(column => {
    column.addEventListener('dragover', e => {
      e.preventDefault();
      column.classList.add('drag-over');
    });

    column.addEventListener('dragleave', e => {
      column.classList.remove('drag-over');
    });

    column.addEventListener('drop', async e => {
      e.preventDefault();
      column.classList.remove('drag-over');

      const taskId = e.dataTransfer.getData('text/plain');
      const newStatus = column.parentElement.dataset.status;

      console.log('Dragging task ID:', taskId);
      console.log('New status:', newStatus);


      try {

         //Fix: Better error handling and validation
        if (!taskId || !newStatus) {
          console.error('Missing task ID or new status');
          return;
        }
        const updated = await api(`/tasks/${taskId}`, 'PATCH', { status: newStatus });

        const idx = window.appData.tasks.findIndex(t => t._id === taskId);
        if (idx !== -1) window.appData.tasks[idx].status = newStatus;

        renderKanbanBoard();
        renderStats();
        renderRecentTasks();
      } catch (err) {
        console.error('Error while updating status:', err);
        alert(err.error || 'Failed to update status');
      }
    });
  });
}

function attachDeleteListeners() {
  document.querySelectorAll('.delete-task').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!confirm('Are you sure you want to delete this task?')) return;

      try {
        await api(`/tasks/${id}`, 'DELETE');
        window.appData.tasks = window.appData.tasks.filter(t => t._id !== id);
        renderKanbanBoard();
        renderStats();
        renderRecentTasks();
      } catch (err) {
        alert(err.error || 'Failed to delete task');
      }
    });
  });

  document.querySelectorAll('.delete-project-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const id = btn.dataset.id;
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await api(`/projects/${id}`, 'DELETE');
      window.appData.projects = window.appData.projects.filter(p => p._id !== id);
      renderProjects();
      renderStats();
      renderProjectProgress();
      populateAssignProjectDropdown();
      populateTaskProjectDropdown();
    } catch (err) {
      alert(err.error || 'Failed to delete project');
    }
  });
});

}
// Kanban
function renderKanbanBoard() {
  const columns = ['todo', 'in-progress', 'review', 'done'];

  for (const status of columns) {
    const container = document.getElementById(`${status}-tasks`);
    const countElement = document.getElementById(`${status}-count`);
    const tasks = window.appData.tasks.filter(t => t.status === status);
    container.innerHTML = '';
    countElement.textContent = tasks.length;

    for (const task of tasks) {
      const user = window.appData.users.find(u => u._id === (task.assignedTo?._id || task.assignedTo));
      const role = JSON.parse(sessionStorage.getItem('user')).role;
       const isOwner = task.createdBy === JSON.parse(sessionStorage.getItem('user'))._id || ['admin', 'manager'].includes(role);


      const taskEl = document.createElement('div');
      taskEl.className = `task-card ${task.priority}`;
      taskEl.setAttribute('draggable', 'true');
      taskEl.setAttribute('data-id', task._id);

      taskEl.innerHTML = `
        <h4>${task.title}</h4>
        <p>${task.description || ''}</p>
        <div class="task-meta">
          <span class="task-priority ${task.priority}">${task.priority}</span>
          <img src="${user?.avatar || 'images/avatar.png'}" class="task-assignee" title="${user?.name}" />
          ${isOwner ? `<button class="delete-task" data-id="${task._id}" title="Delete Task"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      `;

      container.appendChild(taskEl);
    }
  }

  attachDragAndDropHandlers();
  attachDeleteListeners();
}


function renderTeams() {
  const container = document.getElementById('teams-grid');
  if (!container || !window.appData?.users) return;

  container.innerHTML = window.appData.users
    .filter(user => user.role === 'member')
    .map(user => `
      <div class="team-card">
        <img src="${user.avatar || 'images/avatar.png'}" alt="${user.name}" class="team-avatar-large">
        <h3>${user.name}</h3>
        <p class="team-role">${user.role}</p>
        <span class="team-badge ${user.badge || ''}">${user.badge || ''}</span>
        <div class="team-stats">
          <div class="team-stat">
            <h4>${user.stats?.projects || 0}</h4>
            <p>Projects</p>
          </div>
          <div class="team-stat">
            <h4>${user.stats?.tasks || 0}</h4>
            <p>Tasks</p>
          </div>
        </div>
      </div>
    `).join('');
}
function renderNotifications() {
  const bell = document.getElementById('notif-icon');
   const dot = document.getElementById('notif-dot');
  const dropdown = document.getElementById('notif-dropdown');
  const container = document.getElementById('notif-items');

  if (!bell || !dot || !dropdown || !container) return;

    // Fetch once on page load to show dot if unread
  api('/notification')
    .then(notifications => {
      const unread = notifications.some(n => !n.read);
      dot.style.display = unread ? 'inline-block' : 'none';
    })
    .catch(() => {
      dot.style.display = 'none';
    });

  bell.addEventListener('click', async () => {
    dropdown.classList.toggle('hidden');

    try {
      const notifications = await api('/notification');
      if (!notifications.length) {
        container.innerHTML = `<p style="font-size: 0.875rem; color: #64748b;">No notifications</p>`;
      } else {
        container.innerHTML = notifications.map(n => `
          <div class="notif-item">${n.message}</div>
        `).join('');
      }

      // Hide badge after opening
      dot.style.display = 'none'; // hide dot once user opens
    } catch (err) {
      console.error('Notification fetch error:', err);
      container.innerHTML = '<p>Error loading notifications</p>';
    }
  });
}




// ===== Dashboard Logic =====
function initDashboard(role) {
  // Show buttons only if admin or manager
  if (role === 'admin' || role === 'manager') {
    document.getElementById('add-project-btn')?.classList.remove('hidden');
    document.getElementById('add-member-btn')?.classList.remove('hidden');
  } else {
    document.getElementById('add-project-btn')?.classList.add('hidden');
    document.getElementById('add-member-btn')?.classList.add('hidden');
  }

  // Navigation
  document.querySelectorAll('.nav-item')?.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(`${page}-page`)?.classList.add('active');

      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      document.getElementById('page-title').textContent =
        page.charAt(0).toUpperCase() + page.slice(1);
    });
  });

  // Add Task Modal
  document.getElementById('add-task-btn')?.addEventListener('click', () => {
    document.getElementById('task-modal')?.classList.add('active');
  });
  document.getElementById('close-task-modal')?.addEventListener('click', () => {
    document.getElementById('task-modal')?.classList.remove('active');
  });
  document.getElementById('cancel-task')?.addEventListener('click', () => {
    document.getElementById('task-modal')?.classList.remove('active');
  });

  // Add Project Modal
  document.getElementById('add-project-btn')?.addEventListener('click', () => {
  populateProjectTeamDropdown();
  document.getElementById('project-modal')?.classList.add('active');
});

  document.getElementById('close-project-modal')?.addEventListener('click', () => {
    document.getElementById('project-modal')?.classList.remove('active');
  });
  document.getElementById('cancel-project')?.addEventListener('click', () => {
    document.getElementById('project-modal')?.classList.remove('active');
  });

   document.getElementById('add-member-btn')?.addEventListener('click', () => {
    document.getElementById('member-modal').classList.add('active');
  });
  document.getElementById('close-member-modal')?.addEventListener('click', () => {
    document.getElementById('member-modal').classList.remove('active');
  });
  document.getElementById('cancel-member')?.addEventListener('click', () => {
  document.getElementById('member-modal')?.classList.remove('active');
});

  // Submit Task
  document.getElementById('task-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await addTask();
  });

  // Submit Project
  document.getElementById('project-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await addProject();
  });

  // Submit Member (THIS IS THE FIX)
  document.getElementById('member-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    await addMember();
  });

  document.getElementById('assign-member-form')?.addEventListener('submit', async e => {
  e.preventDefault();

  const projectId = document.getElementById('assign-project')?.value;
  const selectedUsers = Array.from(document.getElementById('assign-users').selectedOptions).map(opt => opt.value);

  if (!projectId || selectedUsers.length === 0) {
    alert('Please select a project and at least one member.');
    return;
  }

  try {
    // Get existing project
    const project = window.appData.projects.find(p => p._id === projectId);

    // Get already assigned IDs
    const currentAssigned = (project?.assignedTo || []).map(u => typeof u === 'object' ? u._id : u);

    // Merge with new members and remove duplicates
    const merged = [...new Set([...currentAssigned, ...selectedUsers])];

    const updatedProject = await api(`/projects/${projectId}/assign`, 'PUT', {
      assignedTo: merged
    });

    const idx = window.appData.projects.findIndex(p => p._id === projectId);
    if (idx !== -1) {
      window.appData.projects[idx] = updatedProject;
    }

    alert('Team members assigned!');
    document.getElementById('member-modal')?.classList.remove('active');
    await loadDashboardData();
    renderProjects();
    renderTeams();
  } catch (err) {
    console.error('Error assigning members:', err);
    alert(err.error || 'Failed to assign members');
  }
});


  populateAssignProjectDropdown();
  populateAssigneeDropdown();
  populateProjectTeamDropdown();
  populateTaskProjectDropdown();

 if (window.appData.projects.length) {
    populateUserDropdown(window.appData.projects[0]._id);
  }
document.getElementById('assign-project')?.addEventListener('change', e => {
  populateUserDropdown(e.target.value);
});


  renderStats();
  renderRecentTasks();
  renderProjects();
  renderKanbanBoard();
  renderTeams();
  renderProjectProgress();
  renderNotifications();


  function populateAssignProjectDropdown() {
  const dropdown = document.getElementById('assign-project'); // Make sure this is the correct ID
  if (!dropdown || !window.appData.projects) return;

  dropdown.innerHTML = '<option value="">-- Select Project --</option>';
  window.appData.projects.forEach(project => {
    const opt = document.createElement('option');
    opt.value = project._id;
    opt.textContent = project.name;
    dropdown.appendChild(opt);
  });
}

// ===== Populate User Assignee Dropdown =====
function populateAssigneeDropdown() {
  const dropdown = document.getElementById('task-assignee');
  dropdown.innerHTML = `<option value="">-- Unassigned --</option>`;
  window.appData.users.forEach(user => {
    const opt = document.createElement('option');
    opt.value = user._id;
    opt.textContent = user.name;
    dropdown.appendChild(opt);
  });
}

function populateProjectTeamDropdown() {
  const dropdown = document.getElementById('project-team');
  dropdown.innerHTML = '';
  window.appData.users.forEach(user => {
    const opt = document.createElement('option');
    opt.value = user._id;
    opt.textContent = user.name;
    dropdown.appendChild(opt);
  });
}
function populateTaskProjectDropdown() {
  const dropdown = document.getElementById('task-project');
  if (!dropdown || !window.appData.projects) return;

  dropdown.innerHTML = `<option value="">-- No Project --</option>`;
  window.appData.projects.forEach(project => {
    const opt = document.createElement('option');
    opt.value = project._id;
    opt.textContent = project.name;
    dropdown.appendChild(opt);
  });
}


async function loadDashboardData() {
  try {
    const dash = await api('/dashboard');
    window.appData = {
      users: dash.users || [],
      projects: dash.projects || [],
      tasks: dash.tasks || []
    };

    
    // Enrich users with stats and badge
    window.appData.users = (dash.users || []).map(u => ({
      ...u,
      stats: {
        projects: window.appData.projects.filter(p =>
          (p.assignedTo || []).some(id => (typeof id === 'object' ? id._id : id) === u._id)
        ).length,
        tasks: window.appData.tasks.filter(t =>
          (t.assignedTo?._id || t.assignedTo) === u._id
        ).length
      },
      badge: u.role === 'admin' ? 'admin' :  (u.role === 'manager' ? 'manager' : 'member')
    }));

    renderStats();
    renderProjects();
    renderRecentTasks();
    renderKanbanBoard();
    renderTeams();
    renderNotifications();

    populateAssignProjectDropdown();
    renderProjectProgress();
    populateTaskProjectDropdown();

  } catch (err) {
    alert('Error refreshing dashboard');
    console.error(err);
  }
}


// ===== Add Task =====
async function addTask() {
 
    const task = {
      title: document.getElementById('task-title').value,
      description: document.getElementById('task-description').value,
      priority: document.getElementById('task-priority').value,
      assignedTo: document.getElementById('task-assignee')?.value || null,
      project: document.getElementById('task-project')?.value || null,
      status: 'todo'
    };

    const saved = await api('/tasks', 'POST', task);
    window.appData.tasks.push(saved);
    alert('Task added!');
    document.getElementById('task-modal')?.classList.remove('active');
    await loadDashboardData();
    renderKanbanBoard();
    renderRecentTasks();
    renderStats();
    renderProjects();          
    renderProjectProgress();  
}


// ===== Add Project =====
async function addProject() {
  const selected = Array.from(document.getElementById('project-team').selectedOptions).map(opt => opt.value);
  const project = {
    name: document.getElementById('project-name').value,
    description: document.getElementById('project-description').value,
    budget: document.getElementById('project-budget').value,
    deadline: document.getElementById('project-deadline').value,
    assignedTo: selected
  };

  const saved = await api('/projects', 'POST', project);
  alert('Project added!');
  document.getElementById('project-modal')?.classList.remove('active');
  populateTaskProjectDropdown();

  await loadDashboardData();

}

// ===== Add Member =====
async function addMember() {
  const name = document.getElementById('member-name').value;
  const email = document.getElementById('member-email').value;
  const role = document.getElementById('member-role').value;
  const password = 'password123'; // default
   const projectId = document.getElementById('assign-project')?.value;
  try {
    // 1. Register new member
    const newUser = await api('/auth/register', 'POST', { name, email, password, role });
   console.log(' Registered new user:', newUser);
    
    if (projectId) {
      const project = window.appData.projects.find(p => p._id === projectId);

      //  Safely extract user IDs from assignedTo (whether strings or objects)
      const assigned = (project?.assignedTo || []).map(u =>
        typeof u === 'object' && u._id ? u._id :
        (typeof u === 'string' ? u : null)
      ).filter(Boolean);

      //  Avoid duplicate entries
      if (!assigned.includes(newUser._id)) {
        assigned.push(newUser._id);
      }

      console.log('Updated assigned user IDs:', assigned);

      //  Update project on backend
      const updatedProject = await api(`/projects/${projectId}/assign`, 'PUT', {
        assignedTo: assigned
      });
      console.log('Project updated with new member:', updatedProject);

      //  Update project in local state
      const idx = window.appData.projects.findIndex(p => p._id === projectId);
      if (idx !== -1) {
        window.appData.projects[idx] = updatedProject;
      }
    }

    alert('Member added!');
    document.getElementById('member-modal').classList.remove('active');
    await loadDashboardData();
    renderProjects();
    renderTeams();
  } catch (err) {
    console.error('Add Member Error:', err);
    alert(err.error || 'Failed to add member');
  }
}

    

// ===== Render Dashboard Cards =====



// ===== Render Projects =====


function populateUserDropdown(projectId) {
  const dropdown = document.getElementById('assign-users');
  dropdown.innerHTML = '';

  const project = window.appData.projects.find(p => p._id === projectId);
  const assignedIds = (project?.assignedTo || []).map(u => u._id || u);

  window.appData.users
    .filter(u => u.role === 'member')
    .forEach(user => {
      const opt = document.createElement('option');
      opt.value = user._id;
      opt.textContent = user.name;
      if (assignedIds.includes(user._id)) {
        opt.selected = true; // already assigned
      }
      dropdown.appendChild(opt);
    });
}




document.addEventListener('click', async e => {
  if (e.target.classList.contains('remove-member-btn')) {
    const projectId = e.target.dataset.project;
    const userId = e.target.dataset.user;
    
    const userToRemove = window.appData.users.find(u => u._id === userId);
  const userName = userToRemove?.name || 'this member';

  if (!confirm(`Are you sure you want to remove ${userName} from this project?`)) {
    return;
  }

    const project = window.appData.projects.find(p => p._id === projectId);
    const updatedIds = project.assignedTo.filter(u => (u._id || u) !== userId).map(u => u._id || u);

    try {
      const updatedProject = await api(`/projects/${projectId}/assign`, 'PUT', { assignedTo: updatedIds });
      const idx = window.appData.projects.findIndex(p => p._id === projectId);
      window.appData.projects[idx] = updatedProject;
      renderProjects();
    } catch (err) {
      alert(err.error || 'Failed to remove member');
    }
  }

    if (e.target.classList.contains('delete-project-btn')) {
    const projectId = e.target.dataset.id;
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await api(`/projects/${projectId}`, 'DELETE');
      window.appData.projects = window.appData.projects.filter(p => p._id !== projectId);
      renderProjects();
      renderTeams();
      renderProjectProgress();
      renderStats();
    } catch (err) {
      alert(err.error || 'Failed to delete project');
    }
  }
});
}