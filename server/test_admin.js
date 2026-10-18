const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testAdmin() {
  console.log('--- 🧪 TESTING ADMIN INITIALIZATION & ROUTES ---');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB.');

  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    name: { type: String, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
  }));

  const adminEmail = 'admin@admin.com';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = new User({
      name: 'Administrateur',
      email: adminEmail,
      password: '123',
      isOnline: false,
    });
    await admin.save();
    console.log('✅ Admin user created in MongoDB: admin@admin.com / 123');
  } else {
    admin.password = '123';
    await admin.save();
    console.log('✅ Admin user verified & updated: admin@admin.com / 123');
  }

  // Count users
  const totalUsers = await User.countDocuments();
  console.log(`Total users in database: ${totalUsers}`);

  await mongoose.disconnect();
  console.log('✅ Admin database test completed successfully! 🎉');
}

testAdmin().catch((err) => {
  console.error('❌ Admin test failed:', err);
  process.exit(1);
});
