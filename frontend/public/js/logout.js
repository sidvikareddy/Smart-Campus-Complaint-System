const logoutModal = document.getElementById('logoutModal');
const openLogout = () => logoutModal.classList.add('show');
const closeLogout = () => logoutModal.classList.remove('show');

document.getElementById('userProfile').addEventListener('click', openLogout);
document.getElementById('cancelLogout').addEventListener('click', closeLogout);
document.getElementById('confirmLogout').addEventListener('click', () => {
  Auth.clear();
  window.location.href = '/index.html';
});
logoutModal.addEventListener('click', (event) => {
  if (event.target === logoutModal) closeLogout();
});
