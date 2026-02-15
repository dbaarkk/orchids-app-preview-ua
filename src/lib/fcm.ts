import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
    if (serviceAccount.project_id) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

export const sendPushNotification = async (tokens: string[], title: string, body: string, data?: any) => {
  if (!admin.apps.length || tokens.length === 0) {
    console.log('FCM not initialized or no tokens provided');
    return;
  }

  const message: admin.messaging.MulticastMessage = {
    tokens,
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
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Successfully sent ${response.successCount} messages; ${response.failureCount} messages failed.`);

    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered') {
            failedTokens.push(tokens[idx]);
          }
        }
      });
      return failedTokens;
    }
  } catch (error) {
    console.error('Error sending multicast message:', error);
  }
  return [];
};
