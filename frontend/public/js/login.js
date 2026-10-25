// Already logged in? Go straight to the right dashboard.
if (Auth.token && Auth.user) {
  if (Auth.user.role === 'admin') window.location.href = '/admin.html';
  else if (Auth.user.role === 'student') window.location.href = '/student.html';
  else {
    Auth.clear();
    window.location.href = '/index.html';
  }
}

const alertBox = document.getElementById('alert');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tabRegister = document.getElementById('tabRegister');
const tabLogin = document.getElementById('tabLogin');
const roleButtons = document.querySelectorAll('.role-toggle');
const signupPrompt = document.querySelector('.signup-prompt');
const signinPrompt = document.querySelector('.signin-prompt');
const loginIdentifierLabel = document.getElementById('loginIdentifierLabel');
const loginIdentifier = document.getElementById('loginIdentifier');
const regIdentifierLabel = document.getElementById('regIdentifierLabel');
const regIdentifier = document.getElementById('regIdentifier');
const regNameField = document.getElementById('regNameField');
const regNameInput = document.getElementById('regName');
const regEmailField = document.getElementById('regEmailField');
const regDepartmentField = document.getElementById('regDepartmentField');
const regPasswordField = document.getElementById('regPasswordField');
const regPasswordInput = document.getElementById('regPassword');
const signupCodeField = document.getElementById('signupCodeField');
const signupCodeInput = document.getElementById('signupCode');
const adminPasscodeAlert = document.getElementById('adminPasscodeAlert');
const registerSubmit = registerForm.querySelector('button[type="submit"]');
let selectedRole = 'student';

function hideAdminPasscodeAlert() {
  adminPasscodeAlert.textContent = '';
  adminPasscodeAlert.classList.remove('show');
}

function showAdminPasscodeAlert(message) {
  adminPasscodeAlert.textContent = message;
  adminPasscodeAlert.classList.add('show');
}

function switchTab(toLogin) {
  loginForm.style.display = toLogin ? 'block' : 'none';
  registerForm.style.display = toLogin ? 'none' : 'block';
  signupPrompt.style.display = toLogin ? 'block' : 'none';
  signinPrompt.style.display = toLogin ? 'none' : 'block';
  hideAlert(alertBox);
  hideAdminPasscodeAlert();
  renderRoleFields(toLogin);
}
function clearFormState() {
  [loginForm, registerForm].forEach((form) => form.reset());
  hideAlert(alertBox);
  hideAdminPasscodeAlert();
}
function renderRoleFields(toLogin) {
  const labels = {
    student: ['Student ID or Institutional Email', 'Student ID or email', 'Student Roll No / ID'],
    admin: ['Admin Username / Email', 'admin@univ.edu', 'Admin Passcode / Security Token']
  };
  const [loginLabel, loginPlaceholder, signupLabel] = labels[selectedRole];
  const isAdmin = selectedRole === 'admin';
  loginIdentifierLabel.textContent = loginLabel;
  loginIdentifier.placeholder = loginPlaceholder;
  const loginPasswordLabel = document.getElementById('loginPasswordLabel');
  loginPasswordLabel.textContent = isAdmin ? 'Admin Passcode / Security Token' : 'Password';
  document.getElementById('loginPassword').autocomplete = isAdmin ? 'off' : 'current-password';
  regIdentifierLabel.textContent = signupLabel;
  regIdentifierField.style.display = selectedRole === 'student' ? 'block' : 'none';
  regIdentifier.required = selectedRole === 'student';
  regNameField.style.display = isAdmin ? 'none' : 'block';
  regNameInput.required = !isAdmin;
  regEmailField.style.display = isAdmin ? 'block' : 'block';
  document.getElementById('regEmailLabel').textContent = isAdmin ? 'Admin Email' : 'Institutional Email';
  regDepartmentField.style.display = isAdmin ? 'none' : 'block';
  document.getElementById('regDepartment').required = !isAdmin;
  regPasswordField.style.display = 'block';
  regPasswordInput.required = true;
  signupCodeField.style.display = isAdmin ? 'block' : 'none';
  signupCodeInput.required = isAdmin;
  document.getElementById('signupCodeLabel').textContent = 'Admin Passcode / Security Token';
  registerSubmit.textContent = isAdmin ? 'Create admin account' : 'Create student account';
}
tabRegister.addEventListener('click', () => switchTab(false));
tabLogin.addEventListener('click', () => switchTab(true));
roleButtons.forEach((button) => button.addEventListener('click', () => {
  selectedRole = button.dataset.role;
  roleButtons.forEach((item) => item.classList.toggle('active', item === button));
  clearFormState();
  switchTab(registerForm.style.display !== 'none');
}));

function redirect(user) {
  if (user.role === 'admin') window.location.href = '/admin.html';
  else if (user.role === 'student') window.location.href = '/student.html';
  else {
    Auth.clear();
    window.location.href = '/index.html';
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert(alertBox);
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: loginIdentifier.value,
        password: selectedRole === 'admin' ? undefined : document.getElementById('loginPassword').value,
        adminPasscode: selectedRole === 'admin' ? document.getElementById('loginPassword').value : undefined,
        role: selectedRole
      })
    });
    Auth.save(data.token, data.user, document.getElementById('rememberMe').checked);
    redirect(data.user);
  } catch (err) {
    showAlert(alertBox, err.message);
  }
});

document.getElementById('togglePassword').addEventListener('click', (event) => {
  const password = document.getElementById('loginPassword');
  password.type = password.type === 'password' ? 'text' : 'password';
  event.currentTarget.textContent = password.type === 'password' ? '◉' : '◎';
});

document.getElementById('forgotPassword').addEventListener('click', (event) => {
  event.preventDefault();
  showAlert(alertBox, 'Please contact campus IT support to reset your password.');
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert(alertBox);
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('regName').value,
        studentId: selectedRole === 'student' ? regIdentifier.value : undefined,
        department: document.getElementById('regDepartment').value,
        email: document.getElementById('regEmail').value,
        password: regPasswordInput.value,
        role: selectedRole,
        adminPasscode: selectedRole === 'admin' ? signupCodeInput.value : undefined
      })
    });
    Auth.save(data.token, data.user);
    redirect(data.user);
  } catch (err) {
    if (selectedRole === 'admin' && err.message === 'Invalid Admin Passcode!') {
      showAdminPasscodeAlert(err.message);
      signupCodeInput.focus();
      return;
    }
    showAlert(alertBox, err.message);
  }
});
