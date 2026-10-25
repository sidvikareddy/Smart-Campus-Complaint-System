const notificationBtn = document.getElementById('notificationBtn');
const notificationCount = document.getElementById('notificationCount');
const notificationPanel = document.getElementById('notificationPanel');
const notificationList = document.getElementById('notificationList');
const markNotificationsRead = document.getElementById('markNotificationsRead');

function renderNotifications(notifications) {
  notificationList.innerHTML = notifications.length
    ? notifications.map((n) => `
      <button type="button" class="notification-item ${n.readAt ? '' : 'unread'}" data-notification-id="${n._id}">
        <strong>${esc(n.title)}</strong>
        <span>${esc(n.message)}</span>
        <small>${fmtDate(n.createdAt)}</small>
      </button>`).join('')
    : '<div class="notification-empty">No notifications</div>';
}

async function loadNotifications() {
  if (!Auth.token) return;
  try {
    const { notifications, unreadCount } = await api('/notifications');
    notificationCount.textContent = unreadCount;
    notificationCount.classList.toggle('show', unreadCount > 0);
    renderNotifications(notifications);
  } catch (err) {
    notificationList.innerHTML = `<div class="notification-empty">${esc(err.message)}</div>`;
  }
}

notificationBtn.addEventListener('click', () => {
  const isOpen = notificationPanel.classList.toggle('show');
  notificationBtn.setAttribute('aria-expanded', String(isOpen));
  loadNotifications();
});

notificationList.addEventListener('click', async (event) => {
  const item = event.target.closest('[data-notification-id]');
  if (!item || !item.classList.contains('unread')) return;
  try {
    await api(`/notifications/${item.dataset.notificationId}/read`, { method: 'PATCH' });
    await loadNotifications();
  } catch (err) {
    notificationList.innerHTML = `<div class="notification-empty">${esc(err.message)}</div>`;
  }
});

markNotificationsRead.addEventListener('click', async () => {
  try {
    await api('/notifications/read-all', { method: 'PATCH' });
    await loadNotifications();
  } catch (err) {
    notificationList.innerHTML = `<div class="notification-empty">${esc(err.message)}</div>`;
  }
});

loadNotifications();
setInterval(loadNotifications, 30000);
