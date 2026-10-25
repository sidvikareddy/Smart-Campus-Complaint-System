const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_campus');
    const name = process.env.ADMIN_NAME || 'Campus Admin';
    const email = (process.env.ADMIN_EMAIL || 'admin@campus.edu').toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'Admin@123';

    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`Admin already exists: ${email}`);
    } else {
      await User.create({ name, email, password: await bcrypt.hash(password, 10), role: 'admin' });
      console.log(`Admin created -> ${email} / ${password}`);
    }
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
