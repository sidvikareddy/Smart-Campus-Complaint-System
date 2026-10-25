const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, adminOnly, adminOnlyRole } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, studentId: user.studentId, staffId: user.staffId, department: user.department };
}

// Student registration (admins are created with: npm run seed:admin)
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, studentId, department, role, adminPasscode } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const requestedRole = String(role || 'student').toLowerCase();
    if (!['student', 'staff', 'admin'].includes(requestedRole)) {
      return res.status(400).json({ message: 'Invalid signup role' });
    }
    if (requestedRole !== 'admin' && !name) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    const accountPassword = password;
    if (!accountPassword) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    if (accountPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (requestedRole === 'student' && (!studentId || !department)) {
      return res.status(400).json({ message: 'Student ID and department are required' });
    }
    if (requestedRole === 'admin' && adminPasscode !== process.env.ADMIN_PASSCODE) {
      return res.status(400).json({ message: 'Invalid Admin Passcode!' });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(accountPassword, 10);
    const user = await User.create({
      name: name || email.split('@')[0],
      email,
      password: hashed,
      studentId: requestedRole === 'student' ? studentId : undefined,
      department: requestedRole !== 'admin' ? department : '',
      role: requestedRole
    });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { identifier, email, password, adminPasscode, role } = req.body;
    const loginIdentifier = String(identifier || email || '').trim().toLowerCase();
    const requestedRole = String(role || '').toLowerCase();
    const loginCredential = requestedRole === 'admin' ? adminPasscode : password;
    if (!loginIdentifier || !loginCredential) {
      return res.status(400).json({
        message: requestedRole === 'admin'
          ? 'Login identifier and admin passcode are required'
          : 'Login identifier and password are required'
      });
    }
    const studentIdentifier = String(identifier || email || '').trim();
    const lookup = requestedRole === 'student'
      ? { $or: [{ email: loginIdentifier }, { studentId: studentIdentifier }] }
      : { email: loginIdentifier };
    const user = await User.findOne(lookup);
    const validCredential = requestedRole === 'admin'
      ? loginCredential === process.env.ADMIN_PASSCODE
      : user && await bcrypt.compare(loginCredential, user.password);
    if (!user || !validCredential) {
      return res.status(401).json({
        message: requestedRole === 'admin'
          ? 'Invalid admin passcode'
          : 'Invalid email or password'
      });
    }
    if (requestedRole && requestedRole !== user.role) {
      return res.status(403).json({ message: `This account is not registered as ${requestedRole}` });
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get('/me', protect, (req, res) => res.json({ user: publicUser(req.user) }));

router.get('/staff', protect, adminOnly, async (req, res, next) => {
  try {
    const staff = await User.find({ role: { $in: ['staff', 'admin'] } })
      .select('name email role department')
      .sort({ name: 1 });
    res.json(staff);
  } catch (err) {
    next(err);
  }
});

router.post('/staff', protect, adminOnlyRole, async (req, res, next) => {
  try {
    const { name, email, password, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (await User.exists({ email: email.toLowerCase() })) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const staff = await User.create({
      name, email, password: await bcrypt.hash(password, 10), department, role: 'staff'
    });
    res.status(201).json({ user: publicUser(staff) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
