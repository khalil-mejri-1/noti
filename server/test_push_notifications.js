const { Expo } = require('expo-server-sdk');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const expo = new Expo();

async function runTests() {
  console.log('--- 🧪 STARTING PUSH NOTIFICATION BACKEND TESTS ---');

  // Test 1: Expo Push Token validation
  console.log('\n[Test 1] Testing Expo.isExpoPushToken:');
  const validToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
  const invalidToken = 'InvalidToken_12345';
  
  const isValid1 = Expo.isExpoPushToken(validToken);
  const isValid2 = Expo.isExpoPushToken(invalidToken);
  console.log(`- '${validToken}' is valid:`, isValid1);
  console.log(`- '${invalidToken}' is valid:`, isValid2);

  if (!isValid1 || isValid2) {
    throw new Error('Expo token validation failed');
  }
  console.log('✅ Test 1 Passed: Token validation works correctly.');

  // Test 2: Database Connection
  console.log('\n[Test 2] Testing MongoDB Atlas Connection:');
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB successfully.');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    throw err;
  }

  // Define models directly for testing schema
  const PushToken = mongoose.models.PushToken || mongoose.model('PushToken', new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pushToken: { type: String, required: true, unique: true, trim: true },
    platform: { type: String, enum: ['android', 'ios', 'web', 'unknown'], default: 'unknown' },
    deviceName: { type: String, default: '' },
  }, { timestamps: true }));

  const testUserId = new mongoose.Types.ObjectId();
  const testPushToken = 'ExponentPushToken[test_token_' + Date.now() + ']';

  // Test 3: Upsert PushToken in MongoDB
  console.log('\n[Test 3] Testing PushToken creation & upsert:');
  const savedToken = await PushToken.findOneAndUpdate(
    { pushToken: testPushToken },
    {
      $set: {
        userId: testUserId,
        platform: 'android',
        deviceName: 'Test Phone Model',
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('Saved token doc:', savedToken.toObject());
  if (!savedToken || savedToken.pushToken !== testPushToken) {
    throw new Error('Failed to save push token');
  }
  console.log('✅ Test 3 Passed: PushToken upserted successfully.');

  // Test 4: Verify duplicate prevention & update
  console.log('\n[Test 4] Testing duplicate pushToken update (idempotency):');
  const updatedToken = await PushToken.findOneAndUpdate(
    { pushToken: testPushToken },
    {
      $set: {
        deviceName: 'Updated Device Name',
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );
  console.log('Updated deviceName:', updatedToken.deviceName);
  const count = await PushToken.countDocuments({ pushToken: testPushToken });
  console.log('Document count with token:', count);
  if (count !== 1 || updatedToken.deviceName !== 'Updated Device Name') {
    throw new Error('PushToken idempotency failed: count is not 1');
  }
  console.log('✅ Test 4 Passed: Duplicate tokens prevented and correctly updated.');

  // Test 5: Delete PushToken
  console.log('\n[Test 5] Testing PushToken deletion on unregister/logout:');
  const deleteRes = await PushToken.deleteMany({ pushToken: testPushToken });
  console.log('Deleted count:', deleteRes.deletedCount);
  const remaining = await PushToken.countDocuments({ pushToken: testPushToken });
  if (remaining !== 0) {
    throw new Error('Failed to clean up test push token');
  }
  console.log('✅ Test 5 Passed: PushToken deleted cleanly.');

  // Close MongoDB
  await mongoose.disconnect();
  console.log('\n✅ ALL BACKEND PUSH NOTIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test run failed:', err);
  process.exit(1);
});
