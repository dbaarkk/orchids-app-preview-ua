'use client';

import React from 'react';
import { useNativeNotifications } from '@/hooks/useNativeNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, CheckCircle } from 'lucide-react';

export const NotificationSettings = () => {
    const { registerNotifications, status } = useNativeNotifications();

    const handleEnable = async () => {
      const success = await registerNotifications();
      if (success) {
        console.log('Notifications enabled successfully');
      }
    };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="w-5 h-5" />
          App Notifications
        </CardTitle>
        <CardDescription>
          Stay updated with your booking status and exclusive service offers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'granted' ? (
          <div className="flex items-center gap-2 text-green-600 font-medium">
            <CheckCircle className="w-5 h-5" />
            <span>Notifications are active</span>
          </div>
        ) : (
          <Button 
            onClick={handleEnable} 
            variant="default" 
            className="w-full gap-2"
          >
            {status === 'denied' ? (
              <>
                <BellOff className="w-4 h-4" />
                Enable in Settings
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                Enable Notifications
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
