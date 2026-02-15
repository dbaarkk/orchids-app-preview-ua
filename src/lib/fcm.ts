import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (saJson) {
      const serviceAccount = typeof saJson === 'string' ? JSON.parse(saJson) : saJson;
      if (serviceAccount.project_id) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log('Firebase Admin initialized successfully');
      } else {
        console.error('Firebase service account missing project_id');
      }
    } else {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON env variable is missing');
    }
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

export const sendPushNotification = async (tokens: string[], title: string, body: string, data?: any) => {
  const isInitialized = admin.apps.length > 0;

  // Filter out empty, null or invalid tokens
  const validTokens = (tokens || []).filter(t => t && typeof t === 'string' && t.trim() !== '');

  console.log(`Push Notification - Initialized: ${isInitialized}, Total Tokens: ${tokens?.length || 0}, Valid Tokens: ${validTokens.length}`);

  if (!isInitialized || validTokens.length === 0) {
    if (!isInitialized) console.error('FCM not initialized - check FIREBASE_SERVICE_ACCOUNT_JSON');
    return [];
  }

  const message: admin.messaging.MulticastMessage = {
    tokens: validTokens,
    notification: {
      title,
      body,
    },
    data: data || {},
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        clickAction: 'booking_confirmed',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default'
        }
      }
    }
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`FCM Delivery Result: ${response.successCount} successes, ${response.failureCount} failures`);

    const failedTokens: string[] = [];
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          console.warn(`Token at index ${idx} failed with error: ${errorCode}`);
          if (errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered') {
            failedTokens.push(validTokens[idx]);
          }
        }
      });
    }
    return failedTokens;
  } catch (error) {
    console.error('Error sending multicast message:', error);
    return [];
  }
};
