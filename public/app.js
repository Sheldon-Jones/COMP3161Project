/* ═══════════════════════════════════════════════════════════════
   Fi Wi VLE — app.js
   All API calls use raw fetch against the backend routes.
═══════════════════════════════════════════════════════════════ */

const API = '';  // same origin

/* ── STATE ─────────────────────────────────────────────────── */
let currentPage  = 'dashboard';
let courseCtx    = null;
let forumCtx     = null;
let currentThreadId = null;

/* ── AUTH HELPERS ──────────────────────────────────────────── */
const token   = () => localStorage.getItem('token');
const userId  = () => localStorage.getItem('user_id');
const userRole= () => localStorage.getItem('user_role');
const userName= () => localStorage.getItem('user_name');

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (token()) headers['Authorization'] = `Bearer ${token()}`;
  return headers;
}

async function apiFetch(path, opts = {}) {
  const url = API + path;
  const options = {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers || {}) }
  };
  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error ${path}:`, err);
    throw err;
  }
}

/* ── TOAST ─────────────────────────────────────────────────── */
function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `show ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.className = '', 3000);
}

/* ── MODAL ─────────────────────────────────────────────────── */
function openModal(id)  {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
  }
});

/* ── AUTH TAB SWITCH ───────────────────────────────────────── */
window.switchTab = function(tab) {
  const loginForm    = document.getElementById('form-login');
  const registerForm = document.getElementById('form-register');
  const tabLogin     = document.getElementById('tab-login');
  const tabRegister  = document.getElementById('tab-register');

  if (loginForm)    loginForm.classList.toggle('hidden', tab !== 'login');
  if (registerForm) registerForm.classList.toggle('hidden', tab !== 'register');
  if (tabLogin)     tabLogin.classList.toggle('active', tab === 'login');
  if (tabRegister)  tabRegister.classList.toggle('active', tab === 'register');

  const errorEl = document.getElementById('auth-error');
  if (errorEl) errorEl.textContent = '';
};

window.toggleRegExtra = function() {
  const role    = document.getElementById('r-role')?.value;
  const deptWrap = document.getElementById('r-dept-wrap');
  if (deptWrap) deptWrap.classList.toggle('hidden', role !== 'Lecturer');
};

/* ── LOGIN ─────────────────────────────────────────────────── */
window.doLogin = async function() {
  const user_id  = document.getElementById('l-userid')?.value.trim();
  const password = document.getElementById('l-password')?.value;

  if (!user_id || !password) { toast('Please fill in all fields.', 'error'); return; }

  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ user_id, password })
    });
    localStorage.setItem('token',     data.token);
    localStorage.setItem('user_id',   data.user_id);
    localStorage.setItem('user_role', data.user_type);
    localStorage.setItem('user_name', data.user_name);
    initApp();
  } catch (err) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) errorEl.textContent = err.message;
    toast(err.message, 'error');
  }
};

/* ── REGISTER ──────────────────────────────────────────────── */
window.doRegister = async function() {
  const body = {
    name:      document.getElementById('r-name')?.value.trim(),
    email:     document.getElementById('r-email')?.value.trim(),
    password:  document.getElementById('r-password')?.value,
    user_type: document.getElementById('r-role')?.value,
  };

  const dept = document.getElementById('r-dept')?.value.trim();
  if (body.user_type === 'Lecturer') body.department = dept;

  if (!body.name || !body.email || !body.password) {
    toast('Fill in all required fields.', 'error');
    return;
  }

  try {
    await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(body) });
    toast('Account created! Please sign in.');
    window.switchTab('login');
  } catch (err) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) errorEl.textContent = err.message;
    toast(err.message, 'error');
  }
};

/* ── LOGOUT ────────────────────────────────────────────────── */
window.doLogout = function() {
  localStorage.clear();
  location.reload();
};

/* ── INIT APP ──────────────────────────────────────────────── */
function initApp() {
  const authScreen = document.getElementById('auth-screen');
  const app        = document.getElementById('app');

  if (authScreen) authScreen.classList.add('hidden');
  if (app)        app.classList.remove('hidden');

  const role = userRole();
  const name = userName();
  const uid  = userId();

  const sidebarName   = document.getElementById('sidebar-name');
  const sidebarRole   = document.getElementById('sidebar-role');
  const sidebarAvatar = document.getElementById('sidebar-avatar');
  const topbarId      = document.getElementById('topbar-id');

  if (sidebarName)   sidebarName.textContent   = name || 'User';
  if (sidebarRole)   sidebarRole.textContent   = role || 'Student';
  if (sidebarAvatar) sidebarAvatar.textContent = name ? name[0].toUpperCase() : '?';
  if (topbarId)      topbarId.textContent      = `ID: ${uid || ''}`;

  document.querySelectorAll('.student-nav').forEach(el => el.classList.toggle('hidden', role !== 'Student'));
  document.querySelectorAll('.lecturer-nav').forEach(el => el.classList.toggle('hidden', role !== 'Lecturer'));
  document.querySelectorAll('.admin-nav').forEach(el => el.classList.toggle('hidden', role !== 'Admin'));

  window.gotoPage('dashboard');
}

/* ── PAGE ROUTING ──────────────────────────────────────────── */
window.gotoPage = function(page) {
  courseCtx = null;
  forumCtx  = null;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  const navEl  = document.querySelector(`[data-page="${page}"]`);

  if (pageEl) pageEl.classList.add('active');
  if (navEl)  navEl.classList.add('active');

  currentPage = page;

  switch (page) {
    case 'dashboard':   loadDashboard();    break;
    case 'courses':     loadCourses();      break;
    case 'calendar':    loadCalendar();     break;
    case 'assignments': loadAssignments();  break;
    case 'averages':    loadAverages();     break;
    case 'grading':     loadGrading();      break;
    case 'admin':       loadAdminCourses(); break;
    case 'reports':     loadReports();      break;
  }
};

/* ── DASHBOARD ─────────────────────────────────────────────── */
async function loadDashboard() {
  const role = userRole();
  const uid  = userId();

  // My courses stat
  try {
    let courses = [];
    if (role === 'Student')       courses = await apiFetch(`/api/courses/student/${uid}`);
    else if (role === 'Lecturer') courses = await apiFetch(`/api/courses/lecturer/${uid}`);
    else                          courses = await apiFetch('/api/courses');

    const statCourses = document.getElementById('stat-courses');
    if (statCourses) statCourses.textContent = courses.length;

    const dashCourses = document.getElementById('dash-courses');
    if (dashCourses) {
      dashCourses.innerHTML = courses.length
        ? courses.map(c => `
            <div class="card card-hover" style="margin-bottom:12px; cursor:pointer;"
                 onclick="openCourseDetail('${c.course_id}')">
              <div class="card-label">${escapeHtml(c.course_id)}</div>
              <div class="card-title">${escapeHtml(c.course_name)}</div>
              <div class="card-desc">${escapeHtml(c.description || '')}</div>
            </div>`).join('')
        : '<div class="empty-state"><div class="icon">📚</div><p>No courses yet.</p></div>';
    }
  } catch (err) {
    const dashCourses = document.getElementById('dash-courses');
    if (dashCourses) dashCourses.innerHTML = `<p style="color:var(--coral)">${err.message}</p>`;
  }
}

/* ── COURSES PAGE ──────────────────────────────────────────── */
async function loadCourses() {
  const role = userRole();
  const uid  = userId();
  const el   = document.getElementById('courses-grid');
  if (!el) return;

  el.innerHTML = '<div class="spinner"></div>';
  try {
    let courses = [];
    if (role === 'Student')       courses = await apiFetch(`/api/courses/student/${uid}`);
    else if (role === 'Lecturer') courses = await apiFetch(`/api/courses/lecturer/${uid}`);
    else                          courses = await apiFetch('/api/courses');

    el.innerHTML = courses.length
      ? courses.map(c => `
          <div class="card card-hover" style="cursor:pointer;" onclick="openCourseDetail('${c.course_id}')">
            <div class="card-label">${escapeHtml(c.course_id)}</div>
            <div class="card-title">${escapeHtml(c.course_name)}</div>
            <div class="card-desc">${escapeHtml(c.description || 'No description')}</div>
            <div class="card-actions">
              <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); openCourseDetail('${c.course_id}')">View →</button>
              ${role === 'Student' ? `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); doUnenroll('${c.course_id}')">Unenroll</button>` : ''}
            </div>
          </div>`).join('')
      : '<div class="empty-state"><div class="icon">📚</div><p>No courses found.</p></div>';
  } catch (err) {
    el.innerHTML = `<p style="color:var(--coral)">${err.message}</p>`;
  }
}

/* ── COURSE DETAIL MODAL ───────────────────────────────────── */
async function openCourseDetail(courseId) {
  courseCtx = courseId;
  openModal('modal-course');
  const el   = document.getElementById('course-detail-content');
  const role = userRole();

  el.innerHTML = '<div class="spinner"></div>';

  try {
    const [members, events, assigns, forums] = await Promise.allSettled([
      apiFetch(`/api/courses/${courseId}/members`),
      apiFetch(`/api/calendar/course/${courseId}`),
      apiFetch(`/api/assignments/course/${courseId}`),
      apiFetch(`/api/forums/course/${courseId}`)
    ]);

    const m = members.status === 'fulfilled' ? members.value : { lecturers: [], students: [] };
    const e = events.status  === 'fulfilled' ? events.value  : [];
    const a = assigns.status === 'fulfilled' ? assigns.value : [];
    const f = forums.status  === 'fulfilled' ? forums.value  : [];

    const lecturerRows = (m.lecturers || []).map(u => memberRow(u, 'Lecturer')).join('');
    const studentRows  = (m.students  || []).slice(0, 5).map(u => memberRow(u, 'Student')).join('');
    const moreStudents = (m.students || []).length > 5
      ? `<div style="font-size:.78rem;color:var(--text-dim);padding:6px 0;">+${m.students.length - 5} more students</div>` : '';

    el.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; flex-wrap:wrap; gap:8px;">
        <div>
          <div style="font-size:.8rem; color:var(--teal); font-weight:600; margin-bottom:4px;">${escapeHtml(courseId)}</div>
          <div style="font-size:1.3rem; font-weight:700;">${escapeHtml(courseId)}</div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${role === 'Admin'    ? `<button class="btn btn-outline btn-sm" onclick="openAssignLecModal('${courseId}')">Assign Lecturer</button>` : ''}
          ${role === 'Lecturer' ? `<button class="btn btn-outline btn-sm" onclick="openAddAssignModal('${courseId}')">+ Assignment</button>` : ''}
          ${role === 'Lecturer' || role === 'Admin' ? `<button class="btn btn-outline btn-sm" onclick="openEventModal('${courseId}')">+ Event</button><button class="btn btn-outline btn-sm" onclick="openForumModal('${courseId}')">+ Forum</button>` : ''}
        </div>
      </div>

      <!-- Tabs -->
      <div style="display:flex; gap:4px; margin-bottom:20px; background:var(--navy); padding:4px; border-radius:10px;">
        ${['members','forums','calendar','assignments'].map(tab => `
          <button class="btn btn-sm" id="tab-${tab}"
            style="flex:1; border-radius:8px; font-size:.82rem;"
            onclick="loadCourseTab('${courseId}','${tab}')">
            ${tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>`).join('')}
      </div>
      <div id="course-tab-content">
        <!-- Members shown by default -->
        <div style="font-weight:600; margin-bottom:10px;">Lecturers</div>
        ${lecturerRows || '<p style="color:var(--text-dim);font-size:.85rem;">No lecturers assigned.</p>'}
        <div style="font-weight:600; margin:14px 0 10px;">Students</div>
        ${studentRows || '<p style="color:var(--text-dim);font-size:.85rem;">No students enrolled.</p>'}
        ${moreStudents}
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<p style="color:var(--coral)">${err.message}</p>`;
  }
}

/* ── COURSE TABS ───────────────────────────────────────────── */
window.loadCourseTab = async function(courseId, tab) {
  // Highlight active tab
  ['members','forums','calendar','assignments'].forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    if (btn) btn.style.background = t === tab ? 'var(--teal)' : '';
    if (btn) btn.style.color      = t === tab ? 'white' : '';
  });

  const el   = document.getElementById('course-tab-content');
  const role = userRole();
  if (!el) return;

  el.innerHTML = '<div class="spinner"></div>';

  try {
    if (tab === 'members') {
      const m = await apiFetch(`/api/courses/${courseId}/members`);
      const lecturerRows = (m.lecturers || []).map(u => memberRow(u, 'Lecturer')).join('');
      const studentRows  = (m.students  || []).map(u => memberRow(u, 'Student')).join('');
      el.innerHTML = `
        <div style="font-weight:600; margin-bottom:10px;">Lecturers</div>
        ${lecturerRows || '<p style="color:var(--text-dim);font-size:.85rem;">No lecturers assigned.</p>'}
        <div style="font-weight:600; margin:14px 0 10px;">Students</div>
        ${studentRows  || '<p style="color:var(--text-dim);font-size:.85rem;">No students enrolled.</p>'}
      `;

    } else if (tab === 'forums') {
      const forums = await apiFetch(`/api/forums/course/${courseId}`);
      el.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <span style="font-weight:600;">Forums</span>
          ${role !== 'Student' ? `<button class="btn btn-outline btn-sm" onclick="openForumModal('${courseId}')">+ Forum</button>` : ''}
        </div>
        ${forums.length
          ? forums.map(f => `
              <div class="card card-hover" style="margin-bottom:10px; cursor:pointer;"
                   onclick="openForumDetail(${f.forum_id}, '${escapeHtml(f.title)}', '${courseId}')">
                <div class="thread-title">💬 ${escapeHtml(f.title)}</div>
                <div class="thread-meta">${escapeHtml(f.description || '')}</div>
              </div>`).join('')
          : '<div class="empty-state"><div class="icon">💬</div><p>No forums yet.</p></div>'}
      `;

    } else if (tab === 'calendar') {
      const events = await apiFetch(`/api/calendar/course/${courseId}`);
      el.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <span style="font-weight:600;">Upcoming Events</span>
          ${role !== 'Student' ? `<button class="btn btn-outline btn-sm" onclick="openEventModal('${courseId}')">+ Add Event</button>` : ''}
        </div>
        ${events.length
          ? events.map(e => eventPill(e)).join('')
          : '<div class="empty-state"><div class="icon">📅</div><p>No events.</p></div>'}
      `;

    } else if (tab === 'assignments') {
      const assigns = await apiFetch(`/api/assignments/course/${courseId}`);
      el.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <span style="font-weight:600;">Assignments</span>
          ${role === 'Lecturer' ? `<button class="btn btn-outline btn-sm" onclick="openAddAssignModal('${courseId}')">+ Add Assignment</button>` : ''}
        </div>
        ${assigns.length
          ? assigns.map(a => assignCard(a, role)).join('')
          : '<div class="empty-state"><div class="icon">📝</div><p>No assignments.</p></div>'}
      `;
    }
  } catch (err) {
    el.innerHTML = `<p style="color:var(--coral)">${err.message}</p>`;
  }
};

/* ── FORUM DETAIL ──────────────────────────────────────────── */
window.openForumDetail = async function(forumId, forumTitle, courseId) {
  forumCtx = { forumId, forumTitle, courseId };
  closeModal('modal-course');

  const el = document.getElementById('thread-detail-content');
  openModal('modal-thread');
  el.innerHTML = '<div class="spinner"></div>';

  try {
    const threads = await apiFetch(`/api/forums/${forumId}/threads`);
    el.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <div>
          <div style="font-size:.8rem; color:var(--teal); margin-bottom:4px;">Forum</div>
          <div style="font-size:1.2rem; font-weight:700;">💬 ${escapeHtml(forumTitle)}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openNewThreadModal(${forumId})">+ New Thread</button>
      </div>
      <div id="threads-list">
        ${threads.length
          ? threads.map(t => `
              <div class="card card-hover" style="margin-bottom:10px; cursor:pointer;"
                   onclick="openThreadDetail(${t.thread_id}, '${escapeHtml(t.title || 'Thread')}')">
                <div class="thread-title">${escapeHtml(t.title || 'Untitled')}</div>
                <div class="thread-meta">
                  ${escapeHtml(t.author_name || 'Unknown')} &nbsp;·&nbsp; ${fmtDate(t.created_date)}
                </div>
                <div style="font-size:.85rem; color:var(--text-dim); margin-top:6px;">
                  ${escapeHtml((t.content || '').substring(0, 120))}${(t.content || '').length > 120 ? '...' : ''}
                </div>
              </div>`).join('')
          : '<div class="empty-state"><div class="icon">💬</div><p>No threads yet. Start the conversation!</p></div>'}
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<p style="color:var(--coral)">${err.message}</p>`;
  }
};

/* ── THREAD DETAIL ─────────────────────────────────────────── */
window.openThreadDetail = async function(threadId, threadTitle) {
  currentThreadId = threadId;
  const el = document.getElementById('threads-list');
  if (!el) return;

  el.innerHTML = `
    <div style="margin-bottom:16px;">
      <button class="btn btn-outline btn-sm" onclick="openForumDetail(${forumCtx.forumId},'${escapeHtml(forumCtx.forumTitle)}','${forumCtx.courseId}')">← Back to Forum</button>
    </div>
    <div style="font-size:1.1rem; font-weight:700; margin-bottom:16px;">${escapeHtml(threadTitle)}</div>
    <div id="replies-list"><div class="spinner"></div></div>
    <div style="margin-top:16px;">
      <div class="field">
        <label>Post a Reply</label>
        <textarea id="reply-body" placeholder="Write your reply..." style="min-height:90px; width:100%; background:var(--navy); border:1px solid var(--border); border-radius:10px; color:var(--text); padding:10px; font-family:inherit; font-size:.9rem; resize:vertical;"></textarea>
      </div>
      <button class="btn btn-primary btn-sm" onclick="doReplyInline()">Post Reply</button>
    </div>
  `;

  try {
    const replies = await apiFetch(`/api/forums/threads/${threadId}/replies`);
    const repliesEl = document.getElementById('replies-list');
    if (repliesEl) {
      repliesEl.innerHTML = replies.length
        ? replies.map(r => `
            <div style="border-left:2px solid var(--teal); padding:10px 14px; margin-bottom:10px; background:var(--card-bg); border-radius:0 8px 8px 0;">
              <div style="font-size:.75rem; color:var(--text-dim); margin-bottom:4px;">
                ${escapeHtml(r.author_name || 'Unknown')} &nbsp;·&nbsp; ${fmtDate(r.created_date)}
              </div>
              <div style="font-size:.9rem;">${escapeHtml(r.content || r.body || '')}</div>
              <button class="btn btn-outline btn-sm" style="margin-top:8px; font-size:.75rem;"
                onclick="openReplyModal(${r.thread_id})">Reply to this</button>
            </div>`).join('')
        : '<p style="color:var(--text-dim); font-size:.85rem;">No replies yet. Be the first!</p>';
    }
  } catch (err) {
    const repliesEl = document.getElementById('replies-list');
    if (repliesEl) repliesEl.innerHTML = `<p style="color:var(--coral)">${err.message}</p>`;
  }
};

/* ── INLINE REPLY ──────────────────────────────────────────── */
window.doReplyInline = async function() {
  const body = document.getElementById('reply-body')?.value.trim();
  if (!body) { toast('Reply cannot be empty', 'error'); return; }
  try {
    await apiFetch(`/api/forums/threads/${currentThreadId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
    toast('Reply posted!');
    document.getElementById('reply-body').value = '';
    openThreadDetail(currentThreadId, '');
  } catch (err) {
    toast(err.message, 'error');
  }
};

/* ── REPLY MODAL (nested reply) ────────────────────────────── */
window.openReplyModal = function(threadId) {
  currentThreadId = threadId;
  const input = document.getElementById('reply-thread-id');
  if (input) input.value = threadId;
  openModal('modal-reply');
};

window.doReply = async function() {
  const threadId = document.getElementById('reply-thread-id')?.value;
  const body     = document.getElementById('reply-content')?.value.trim();
  if (!body) { toast('Reply cannot be empty', 'error'); return; }
  try {
    await apiFetch(`/api/forums/threads/${threadId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
    toast('Reply posted!');
    closeModal('modal-reply');
    document.getElementById('reply-content').value = '';
    openThreadDetail(threadId, '');
  } catch (err) {
    toast(err.message, 'error');
  }
};

/* ── NEW THREAD MODAL ──────────────────────────────────────── */
window.openNewThreadModal = function(forumId) {
  const input = document.getElementById('thread-forum-id');
  if (input) input.value = forumId;
  openModal('modal-new-thread');
};

window.doCreateThread = async function() {
  const forumId = document.getElementById('thread-forum-id')?.value;
  const title   = document.getElementById('thread-title')?.value.trim();
  const content = document.getElementById('thread-content')?.value.trim();
  if (!title || !content) { toast('Title and content are required', 'error'); return; }
  try {
    await apiFetch(`/api/forums/${forumId}/threads`, {
      method: 'POST',
      body: JSON.stringify({ title, content })
    });
    toast('Thread created!');
    closeModal('modal-new-thread');
    document.getElementById('thread-title').value   = '';
    document.getElementById('thread-content').value = '';
    openForumDetail(forumId, forumCtx?.forumTitle || 'Forum', forumCtx?.courseId || '');
  } catch (err) {
    toast(err.message, 'error');
  }
};

/* ── ENROLL ────────────────────────────────────────────────── */
window.doEnroll = async function() {
  const courseId = document.getElementById('enroll-course-id')?.value.trim();
  if (!courseId) { toast('Enter a course ID', 'error'); return; }
  try {
    await apiFetch(`/api/courses/${courseId}/enroll`, { method: 'POST' });
    toast(`Enrolled in ${courseId}!`);
    closeModal('modal-enroll');
    document.getElementById('enroll-course-id').value = '';
    loadCourses();
  } catch (err) {
    toast(err.message, 'error');
  }
};

window.doUnenroll = async function(courseId) {
  try {
    await apiFetch(`/api/courses/${courseId}/enroll`, { method: 'DELETE' });
    toast(`Unenrolled from ${courseId}`);
    loadCourses();
  } catch (err) {
    toast(err.message, 'error');
  }
};

/* ── CALENDAR ──────────────────────────────────────────────── */
async function loadCalendar() {
  const uid  = userId();
  const role = userRole();
  const el   = document.getElementById('calendar-events');
  if (!el) return;

  el.innerHTML = '<div class="spinner"></div>';

  try {
    // For students load by date filter if set, otherwise load all enrolled course events
    const dateInput = document.getElementById('cal-date-filter')?.value;
    let events = [];

    if (dateInput && role === 'Student') {
      events = await apiFetch(`/api/calendar/student/${uid}/date/${dateInput}`);
    } else {
      // Load courses first then get events for each
      let courses = [];
      if (role === 'Student')       courses = await apiFetch(`/api/courses/student/${uid}`);
      else if (role === 'Lecturer') courses = await apiFetch(`/api/courses/lecturer/${uid}`);
      else                          courses = await apiFetch('/api/courses');

      const results = await Promise.allSettled(
        courses.slice(0, 10).map(c => apiFetch(`/api/calendar/course/${c.course_id}`))
      );
      events = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
      events.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    }

    el.innerHTML = events.length
      ? events.map(e => eventPill(e)).join('')
      : '<div class="empty-state"><div class="icon">📅</div><p>No upcoming events.</p></div>';
  } catch (err) {
    el.innerHTML = `<p style="color:var(--coral)">${err.message}</p>`;
  }
}

window.filterCalendar = async function() {
  loadCalendar();
};

window.doCreateEvent = async function() {
  const courseId   = document.getElementById('ev-course')?.value.trim();
  const title      = document.getElementById('ev-title')?.value.trim();
  const description= document.getElementById('ev-desc')?.value.trim();
  const event_date = document.getElementById('ev-date')?.value;
  const event_type = document.getElementById('ev-type')?.value;

  if (!courseId || !event_date) { toast('Course ID and date are required', 'error'); return; }

  try {
    await apiFetch(`/api/calendar/course/${courseId}`, {
      method: 'POST',
      body: JSON.stringify({ course_id: courseId, title, description, event_date, event_type })
    });
    toast('Event created!');
    closeModal('modal-event');
    loadCalendar();
  } catch (err) {
    toast(err.message, 'error');
  }
};

/* ── ASSIGNMENTS ───────────────────────────────────────────── */
async function loadAssignments() {
  const uid  = userId();
  const role = userRole();
  const el   = document.getElementById('assignments-list');
  if (!el) return;

  el.innerHTML = '<div class="spinner"></div>';

  try {
    let courses = [];
    if (role === 'Student')       courses = await apiFetch(`/api/courses/student/${uid}`);
    else if (role === 'Lecturer') courses = await apiFetch(`/api/courses/lecturer/${uid}`);
    else                          courses = await apiFetch('/api/courses');

    const results = await Promise.allSettled(
      courses.map(c => apiFetch(`/api/assignments/course/${c.course_id}`))
    );

    const allAssigns = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);

    el.innerHTML = allAssigns.length
      ? allAssigns.map(a => assignCard(a, role)).join('')
      : '<div class="empty-state"><div class="icon">📝</div><p>No assignments found.</p></div>';
  } catch (err) {
    el.innerHTML = `<p style="color:var(--coral)">${err.message}</p>`;
  }
}

window.doSubmitAssignment = async function() {
  const assignId = document.getElementById('submit-assign-id')?.value;
  const text     = document.getElementById('submit-text')?.value.trim();
  if (!text) { toast('Submission cannot be empty', 'error'); return; }
  try {
    await apiFetch(`/api/assignments/${assignId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ submission_text: text })
    });
    toast('Assignment submitted!');
    closeModal('modal-submit');
    document.getElementById('submit-text').value = '';
  } catch (err) {
    toast(err.message, 'error');
  }
};

window.loadSubmissions = async function(assignId) {
  const el = document.getElementById(`subs-${assignId}`);
  if (!el) return;
  el.innerHTML = '<div class="spinner"></div>';
  try {
    const [rows] = await apiFetch(`/api/assignments/${assignId}/submissions`);
    const subs = Array.isArray(rows) ? rows : (rows ? [rows] : []);
    el.innerHTML = subs.length
      ? `<table style="width:100%; margin-top:10px; font-size:.82rem; border-collapse:collapse;">
           <thead><tr style="color:var(--text-dim); border-bottom:1px solid var(--border);">
             <th style="padding:6px; text-align:left;">Student</th>
             <th style="padding:6px; text-align:left;">Submitted</th>
             <th style="padding:6px; text-align:left;">Grade</th>
             <th style="padding:6px;"></th>
           </tr></thead>
           <tbody>${subs.map(s => `
             <tr style="border-bottom:1px solid var(--border);">
               <td style="padding:6px;">${escapeHtml(s.student_name || s.user_id)}</td>
               <td style="padding:6px;">${fmtDate(s.submission_date)}</td>
               <td style="padding:6px;">${s.grade ?? '—'}</td>
               <td style="padding:6px;">
                 <button class="btn btn-outline btn-sm"
                   onclick="openGradeModal(${assignId}, ${s.user_id}, '${escapeHtml(s.student_name || '')}')">
                   Grade
                 </button>
               </td>
             </tr>`).join('')}
           </tbody>
         </table>`
      : '<p style="color:var(--text-dim); font-size:.82rem; margin-top:8px;">No submissions yet.</p>';
  } catch (err) {
    el.innerHTML = `<p style="color:var(--coral); font-size:.82rem;">${err.message}</p>`;
  }
};

window.openGradeModal = function(assignId, studentId, studentName) {
  document.getElementById('grade-assign-id').value    = assignId;
  document.getElementById('grade-student-id').value   = studentId;
  document.getElementById('grade-student-name').value = studentName;
  openModal('modal-grade');
};

window.doGrade = async function() {
  const assignId  = document.getElementById('grade-assign-id')?.value;
  const studentId = document.getElementById('grade-student-id')?.value;
  const grade     = document.getElementById('grade-value')?.value;
  if (!grade) { toast('Enter a grade', 'error'); return; }
  try {
    await apiFetch(`/api/assignments/${assignId}/grade/${studentId}`, {
      method: 'POST',
      body: JSON.stringify({ grade: parseInt(grade) })
    });
    toast('Grade submitted!');
    closeModal('modal-grade');
    loadSubmissions(assignId);
  } catch (err) {
    toast(err.message, 'error');
  }
};

window.doAddAssignment = async function() {
  const courseId  = document.getElementById('aa-course-id')?.value;
  const title     = document.getElementById('aa-title')?.value.trim();
  const description = document.getElementById('aa-desc')?.value.trim();
  const due_date  = document.getElementById('aa-due')?.value;
  const max_grade = document.getElementById('aa-max')?.value;

  if (!title || !due_date) { toast('Title and due date are required', 'error'); return; }
  try {
    await apiFetch(`/api/assignments/course/${courseId}`, {
      method: 'POST',
      body: JSON.stringify({ course_name: courseId, title, description, due_date, max_grade: parseInt(max_grade) })
    });
    toast('Assignment created!');
    closeModal('modal-add-assign');
    loadCourseTab(courseId, 'assignments');
  } catch (err) {
    toast(err.message, 'error');
  }
};

/* ── AVERAGES (Student) ────────────────────────────────────── */
async function loadAverages() {
  const uid = userId();
  const el  = document.getElementById('averages-content');
  if (!el) return;

  el.innerHTML = '<div class="spinner"></div>';
  try {
    const rows = await apiFetch(`/api/assignments/student/${uid}/averages`);
    el.innerHTML = rows.length
      ? `<table style="width:100%; border-collapse:collapse;">
           <thead><tr style="color:var(--text-dim); border-bottom:1px solid var(--border);">
             <th style="padding:10px; text-align:left;">Course</th>
             <th style="padding:10px; text-align:left;">Submissions</th>
             <th style="padding:10px; text-align:left;">Average</th>
           </tr></thead>
           <tbody>${rows.map(r => `
             <tr style="border-bottom:1px solid var(--border);">
               <td style="padding:10px;">${escapeHtml(r.course_name || r.course_id)}</td>
               <td style="padding:10px;">${r.submissions}</td>
               <td style="padding:10px;">
                 <span class="tag ${gradeBadge(r.average)}">${r.average}%</span>
               </td>
             </tr>`).join('')}
           </tbody>
         </table>`
      : '<div class="empty-state"><div class="icon">📊</div><p>No grades yet.</p></div>';
  } catch (err) {
    el.innerHTML = `<p style="color:var(--coral)">${err.message}</p>`;
  }
}

/* ── GRADING (Lecturer) ────────────────────────────────────── */
async function loadGrading() {
  const uid = userId();
  const el  = document.getElementById('grading-content');
  if (!el) return;

  el.innerHTML = '<div class="spinner"></div>';
  try {
    const courses = await apiFetch(`/api/courses/lecturer/${uid}`);
    el.innerHTML = courses.length
      ? courses.map(c => `
          <div class="card" style="margin-bottom:14px;">
            <div class="card-label">${escapeHtml(c.course_id)}</div>
            <div class="card-title">${escapeHtml(c.course_name)}</div>
            <button class="btn btn-outline btn-sm" style="margin-top:8px;"
              onclick="loadCourseTab('${c.course_id}','assignments'); openCourseDetail('${c.course_id}')">
              View Assignments
            </button>
          </div>`).join('')
      : '<div class="empty-state"><div class="icon">📋</div><p>No courses to grade.</p></div>';
  } catch (err) {
    el.innerHTML = `<p style="color:var(--coral)">${err.message}</p>`;
  }
}

/* ── ADMIN COURSES ─────────────────────────────────────────── */
async function loadAdminCourses() {
  const el = document.getElementById('admin-courses-list');
  if (!el) return;

  el.innerHTML = '<div class="spinner"></div>';
  try {
    const courses = await apiFetch('/api/courses');
    el.innerHTML = courses.length
      ? courses.map(c => `
          <div class="card" style="margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
            <div>
              <div class="card-label">${escapeHtml(c.course_id)}</div>
              <div class="card-title">${escapeHtml(c.course_name)}</div>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-outline btn-sm" onclick="openAssignLecModal('${c.course_id}')">Assign Lecturer</button>
              <button class="btn btn-outline btn-sm" onclick="openCourseDetail('${c.course_id}')">View</button>
            </div>
          </div>`).join('')
      : '<div class="empty-state"><div class="icon">📚</div><p>No courses yet.</p></div>';
  } catch (err) {
    el.innerHTML = `<p style="color:var(--coral)">${err.message}</p>`;
  }
}

window.doCreateCourse = async function() {
  const course_id   = document.getElementById('cc-id')?.value.trim();
  const course_name = document.getElementById('cc-name')?.value.trim();
  const description = document.getElementById('cc-desc')?.value.trim();
  if (!course_id || !course_name) { toast('Course ID and name are required', 'error'); return; }
  try {
    await apiFetch('/api/courses', {
      method: 'POST',
      body: JSON.stringify({ course_id, course_name, description })
    });
    toast('Course created!');
    closeModal('modal-create-course');
    document.getElementById('cc-id').value   = '';
    document.getElementById('cc-name').value = '';
    document.getElementById('cc-desc').value = '';
    loadAdminCourses();
  } catch (err) {
    toast(err.message, 'error');
  }
};

window.doAssignLecturer = async function() {
  const courseId   = document.getElementById('al-course-id')?.value;
  const lecturerId = document.getElementById('al-lecturer-id')?.value;
  if (!lecturerId) { toast('Enter a lecturer ID', 'error'); return; }
  try {
    await apiFetch(`/api/courses/${courseId}/assign-lecturer`, {
      method: 'POST',
      body: JSON.stringify({ lecturer_id: parseInt(lecturerId) })
    });
    toast('Lecturer assigned!');
    closeModal('modal-assign-lec');
    document.getElementById('al-lecturer-id').value = '';
  } catch (err) {
    toast(err.message, 'error');
  }
};

/* ── CREATE FORUM ──────────────────────────────────────────── */
window.doCreateForum = async function() {
  const courseId    = document.getElementById('forum-course-id')?.value;
  const title       = document.getElementById('forum-title')?.value.trim();
  const description = document.getElementById('forum-desc')?.value.trim();
  if (!title) { toast('Title is required', 'error'); return; }
  try {
    await apiFetch(`/api/forums/course/${courseId}`, {
      method: 'POST',
      body: JSON.stringify({ title, description })
    });
    toast('Forum created!');
    closeModal('modal-forum');
    document.getElementById('forum-title').value = '';
    document.getElementById('forum-desc').value  = '';
    loadCourseTab(courseId, 'forums');
  } catch (err) {
    toast(err.message, 'error');
  }
};

/* ── REPORTS ───────────────────────────────────────────────── */
async function loadReports() {}

window.loadReport = async function(reportKey) {
  const el = document.getElementById('reports-content');
  if (!el) return;
  el.innerHTML = '<div class="spinner"></div>';
  try {
    const rows = await apiFetch(`/api/reports/${reportKey}`);
    if (!rows.length) {
      el.innerHTML = '<div class="empty-state"><div class="icon">📊</div><p>No data.</p></div>';
      return;
    }
    const cols = Object.keys(rows[0]);
    el.innerHTML = `
      <table style="width:100%; border-collapse:collapse; font-size:.88rem;">
        <thead>
          <tr style="color:var(--text-dim); border-bottom:1px solid var(--border);">
            ${cols.map(c => `<th style="padding:10px; text-align:left;">${c.replace(/_/g,' ')}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `<tr style="border-bottom:1px solid var(--border);">
            ${cols.map(c => `<td style="padding:10px;">${escapeHtml(String(r[c] ?? '—'))}</td>`).join('')}
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    el.innerHTML = `<p style="color:var(--coral)">${err.message}</p>`;
  }
};

/* ════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
════════════════════════════════════════════════════════════════ */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt) ? String(d) : dt.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}

function gradeBadge(avg) {
  const n = parseFloat(avg);
  if (n >= 70) return 'grade-high';
  if (n >= 50) return 'grade-mid';
  return 'grade-low';
}

function contentIcon(type) {
  const map = { link:'🔗', file:'📄', slide:'📊', video:'🎬', pdf:'📕' };
  return map[(type||'').toLowerCase()] || '📄';
}

function memberRow(m, role) {
  return `
    <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--border);">
      <div class="avatar" style="width:30px;height:30px;font-size:.75rem;">${(m.name||'?')[0].toUpperCase()}</div>
      <div>
        <div style="font-size:.9rem; font-weight:500;">${escapeHtml(m.name)}</div>
        <div style="font-size:.78rem; color:var(--text-dim);">${escapeHtml(m.email||'')} &nbsp; ID: ${m.user_id}</div>
      </div>
      <span class="tag ${role==='Lecturer'?'tag-gold':''}" style="margin-left:auto;">${role}</span>
    </div>`;
}

function eventPill(e) {
  const typeClass = e.event_type === 'Assignment' ? 'assignment' : e.event_type === 'Deadline' ? 'deadline' : '';
  return `
    <div class="event-pill">
      <div class="event-dot ${typeClass}"></div>
      <div>
        <div style="font-weight:600; font-size:.9rem;">${escapeHtml(e.title || e.event_type)}</div>
        <div style="font-size:.78rem; color:var(--text-dim);">${fmtDate(e.event_date)} &nbsp;·&nbsp; ${escapeHtml(e.event_type||'')} &nbsp;·&nbsp; ${escapeHtml(e.course_id||'')}</div>
        ${e.description ? `<div style="font-size:.82rem; margin-top:4px; color:var(--text-dim);">${escapeHtml(e.description)}</div>` : ''}
      </div>
    </div>`;
}

function assignCard(a, role) {
  const isPast = a.due_date && new Date(a.due_date) < new Date();
  return `
    <div class="card card-accent" style="margin-bottom:14px;">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:8px;">
        <div>
          <div class="card-label">${escapeHtml(a.course_name || a.course_id || '')}</div>
          <div class="card-title">${escapeHtml(a.title)}</div>
          <div class="card-desc">${escapeHtml(a.description || '')}</div>
        </div>
        <div style="text-align:right; flex-shrink:0;">
          <div class="tag ${isPast ? 'tag-coral' : 'tag-gold'}">Due: ${fmtDate(a.due_date)}</div>
          <div style="font-size:.78rem; color:var(--text-dim); margin-top:4px;">Max: ${a.max_marks || a.max_grade}</div>
        </div>
      </div>
      <div class="card-actions">
        ${role === 'Student' ? `<button class="btn btn-primary btn-sm" onclick="openSubmitModal(${a.assignment_id})">Submit</button>` : ''}
        ${role === 'Lecturer' || role === 'Admin' ? `<button class="btn btn-outline btn-sm" onclick="loadSubmissions(${a.assignment_id})">View Submissions</button>` : ''}
      </div>
      ${role === 'Lecturer' ? `<div id="subs-${a.assignment_id}"></div>` : ''}
    </div>`;
}

window.toggleSection = function(header) {
  const body = header.nextElementSibling;
  const icon = header.querySelector('span:last-child');
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (icon) icon.textContent = isOpen ? '▸' : '▾';
};

/* ── MODAL OPENERS ─────────────────────────────────────────── */
window.openEnrollModal        = () => openModal('modal-enroll');
window.openCreateCourseModal  = () => openModal('modal-create-course');
window.openForumModal         = (courseId) => {
  const input = document.getElementById('forum-course-id');
  if (input) input.value = courseId;
  openModal('modal-forum');
};
window.openEventModal = (cId) => {
  if (cId) { const input = document.getElementById('ev-course'); if (input) input.value = cId; }
  openModal('modal-event');
};
window.openAssignLecModal = (cId) => {
  const input = document.getElementById('al-course-id');
  if (input) input.value = cId;
  openModal('modal-assign-lec');
};
window.openAddAssignModal = (cId) => {
  const input = document.getElementById('aa-course-id');
  if (input) input.value = cId;
  openModal('modal-add-assign');
};
window.openSubmitModal = (assignId) => {
  const input = document.getElementById('submit-assign-id');
  if (input) input.value = assignId;
  openModal('modal-submit');
};

/* ════════════════════════════════════════════════════════════════
   BOOT
════════════════════════════════════════════════════════════════ */
window.addEventListener('load', () => {
  if (token()) initApp();
});

document.addEventListener('keydown', e => {
  const authScreen = document.getElementById('auth-screen');
  if (authScreen && !authScreen.classList.contains('hidden') && e.key === 'Enter') {
    const loginVisible = document.getElementById('form-login') && !document.getElementById('form-login').classList.contains('hidden');
    if (loginVisible && window.doLogin) window.doLogin();
    else if (window.doRegister) window.doRegister();
  }
});