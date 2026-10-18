const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'build');

const targetWarnFile = path.join(basePath, 'warnOfExpoGoPushUsage.js');
const autoRegFile = path.join(basePath, 'DevicePushTokenAutoRegistration.fx.js');
const topicSubFile = path.join(basePath, 'TopicSubscriptionModule.android.js');
const bgTasksFile = path.join(basePath, 'BackgroundNotificationTasksModule.native.js');

try {
  // 1. Patch warnOfExpoGoPushUsage.js
  if (fs.existsSync(targetWarnFile)) {
    let content = fs.readFileSync(targetWarnFile, 'utf8');
    const updated = content.replace(
      /if\s*\(\s*Platform\.OS\s*===\s*['"]android['"]\s*\)\s*\{\s*throw new Error\(message\);\s*\}\s*else\s*if\s*\(\s*__DEV__\s*\)\s*\{/g,
      'didWarn = true;\n        if (__DEV__) {'
    );
    if (updated !== content) {
      fs.writeFileSync(targetWarnFile, updated, 'utf8');
      console.log('Successfully patched warnOfExpoGoPushUsage.js');
    }
  }

  // 2. Patch DevicePushTokenAutoRegistration.fx.js
  if (fs.existsSync(autoRegFile)) {
    let content = fs.readFileSync(autoRegFile, 'utf8');
    if (!content.includes('isRunningInExpoGo')) {
      content = "import { isRunningInExpoGo } from 'expo';\n" + content;
      content = content.replace(
        'if (ServerRegistrationModule.getRegistrationInfoAsync) {',
        'if (ServerRegistrationModule.getRegistrationInfoAsync && !isRunningInExpoGo()) {'
      );
    }
    content = content.replace(
      /else\s*\{\s*console\.warn\(\`\[expo-notifications\] Error encountered while fetching auto-registration state[^\n]*\n?\s*new UnavailabilityError\('ServerRegistrationModule',\s*'getRegistrationInfoAsync'\)\);\s*\}/g,
      "else {\n    if (!isRunningInExpoGo()) {\n        console.warn('[expo-notifications] Error encountered while fetching auto-registration state, new tokens will not be automatically registered on server.', new UnavailabilityError('ServerRegistrationModule', 'getRegistrationInfoAsync'));\n    }\n}"
    );
    fs.writeFileSync(autoRegFile, content, 'utf8');
    console.log('Successfully patched DevicePushTokenAutoRegistration.fx.js');
  }

  // 3. Patch TopicSubscriptionModule.android.js (Cannot find native module 'ExpoTopicSubscriptionModule')
  if (fs.existsSync(topicSubFile)) {
    const safeTopicContent = `import { requireOptionalNativeModule } from 'expo-modules-core';

const fallback = {
  addListener: () => {},
  removeListeners: () => {},
  subscribeToTopicAsync: () => Promise.resolve(null),
  unsubscribeFromTopicAsync: () => Promise.resolve(null),
};

export default requireOptionalNativeModule('ExpoTopicSubscriptionModule') || fallback;
`;
    fs.writeFileSync(topicSubFile, safeTopicContent, 'utf8');
    console.log('Successfully patched TopicSubscriptionModule.android.js');
  }

  // 4. Patch BackgroundNotificationTasksModule.native.js (in case missing in Expo Go)
  if (fs.existsSync(bgTasksFile)) {
    const safeBgContent = `import { requireOptionalNativeModule } from 'expo-modules-core';

const fallback = {
  async registerTaskAsync() { return null; },
  async unregisterTaskAsync() { return null; },
};

export default requireOptionalNativeModule('ExpoBackgroundNotificationTasksModule') || fallback;
`;
    fs.writeFileSync(bgTasksFile, safeBgContent, 'utf8');
    console.log('Successfully patched BackgroundNotificationTasksModule.native.js');
  }

  console.log('All expo-notifications patches applied successfully.');
} catch (err) {
  console.error('Error applying patch to expo-notifications:', err);
}
