'use client';

import React, { useState } from 'react';
import { useNativeLocation, AddressData } from '@/hooks/useNativeLocation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Navigation, Loader2, CheckCircle2 } from 'lucide-react';

interface NativeLocationPickerProps {
  onAddressSaved: (fullAddress: string, data: any) => void;
}

export const NativeLocationPicker: React.FC<NativeLocationPickerProps> = ({ onAddressSaved }) => {
    const { getCurrentLocation, loading, error, accuracyWarning } = useNativeLocation();
    const [showModal, setShowModal] = useState(false);
    const [addressData, setAddressData] = useState<AddressData | null>(null);
    const [houseDetails, setHouseDetails] = useState('');
    const [landmark, setLandmark] = useState('');

    const handleUseLocation = async () => {
      setShowModal(true);
    };

    const startFetchingLocation = async () => {
      const data = await getCurrentLocation();
      if (data) {
        setAddressData(data);
      }
    };


  const handleConfirm = () => {
    if (!addressData) return;

    const fullAddress = `${houseDetails}, ${addressData.display_name} ${landmark ? `(Landmark: ${landmark})` : ''}`;
    const finalData = {
      ...addressData,
      houseDetails,
      landmark,
      fullAddress
    };

    // Save to local storage for "Use saved address" functionality
    localStorage.setItem('ua_saved_address', JSON.stringify(finalData));
    
    onAddressSaved(fullAddress, finalData);
    setShowModal(false);
    setAddressData(null);
    setHouseDetails('');
    setLandmark('');
  };

  return (
    <div className="w-full space-y-4">
      <Button 
        variant="outline" 
        className="w-full h-12 flex items-center justify-start gap-3 border-dashed"
        onClick={handleUseLocation}
      >
        <Navigation className="w-4 h-4 text-primary" />
        <span>Use my current location</span>
      </Button>

      {/* Location Permission & Explanation Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {addressData ? 'Confirm Delivery Address' : 'Location Access'}
            </DialogTitle>
            <DialogDescription>
              {!addressData 
                ? "We need your location to provide accurate service and find the nearest mechanic for your vehicle."
                : "Please add specific details to help our mechanic find you easily."
              }
            </DialogDescription>
          </DialogHeader>

          {!addressData ? (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Navigation className={`w-8 h-8 text-primary ${loading ? 'animate-pulse' : ''}`} />
              </div>
                {loading ? (
                  <div className="space-y-2">
                    <p className="font-medium">Fetching precise location...</p>
                    <p className="text-sm text-muted-foreground">This may take a few seconds as we verify accuracy.</p>
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mt-2" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {accuracyWarning && (
                      <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md text-sm mb-4">
                        {accuracyWarning}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Your privacy is important. We only use your location when you're using the app.
                    </p>
                  </div>
                )}

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <Card className="bg-muted/50 border-none">
                <CardContent className="p-3 text-sm flex gap-2">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{addressData.display_name}</span>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="house">House / Flat / Floor <span className="text-destructive">*</span></Label>
                <Input 
                  id="house" 
                  placeholder="e.g. Flat 402, 4th Floor" 
                  value={houseDetails}
                  onChange={(e) => setHouseDetails(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="landmark">Landmark (Optional)</Label>
                <Input 
                  id="landmark" 
                  placeholder="e.g. Near City Mall" 
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {!addressData ? (
              <Button 
                onClick={startFetchingLocation} 
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Continue'}
              </Button>
            ) : (
              <Button 
                onClick={handleConfirm} 
                className="w-full gap-2"
                disabled={!houseDetails}
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm Location
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
