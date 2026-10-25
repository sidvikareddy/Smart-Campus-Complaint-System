// Shared helpers for all pages
const API = '/api';

const Auth = {
  get token() { return localStorage.getItem('token') || sessionStorage.getItem('token'); },
  get user() {
    try { return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user')); } catch { return null; }
  },
  save(token, user, remember = true) {
    Auth.clear();
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('token', token);
    storage.setItem('user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  },
  logout() {
    Auth.clear();
    window.location.href = '/index.html';
  },
  // Redirect if not logged in or wrong role
  require(role) {
    const u = Auth.user;
    if (!Auth.token || !u) { window.location.href = '/index.html'; return false; }
    if (role && (Array.isArray(role) ? !role.includes(u.role) : u.role !== role)) {
      if (u.role === 'admin') window.location.href = '/admin.html';
      else if (u.role === 'student') window.location.href = '/student.html';
      else Auth.logout();
      return false;
    }
    return true;
  }
};

async function api(path, options = {}) {
  const headers = {};
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (Auth.token) headers.Authorization = 'Bearer ' + Auth.token;

  const res = await fetch(API + path, { ...options, headers });
  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }

  if (res.status === 401 && Auth.token) { Auth.logout(); }
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function showAlert(el, message, type = 'error') {
  el.textContent = message;
  el.className = 'alert show ' + type;
}
function hideAlert(el) { el.className = 'alert'; }

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtExactDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${values.day} ${values.month} ${values.year}, ${values.hour}:${values.minute} ${values.dayPeriod.toUpperCase()}`;
}

function badge(status) {
  return `<span class="badge ${status.replace(/\s+/g, '-')}">${esc(status)}</span>`;
}
