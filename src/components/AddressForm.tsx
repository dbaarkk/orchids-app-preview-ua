'use client';

import { useState } from 'react';
import { X, Loader2, MapPin } from 'lucide-react';
import { UserAddress } from '@/lib/auth-context';

interface AddressFormProps {
  onSave: (address: UserAddress) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
  initialAddress?: UserAddress;
}

export default function AddressForm({ onSave, onClose, initialAddress }: AddressFormProps) {
  const [line1, setLine1] = useState(initialAddress?.line1 || '');
  const [line2, setLine2] = useState(initialAddress?.line2 || '');
  const [pincode, setPincode] = useState(initialAddress?.pincode || '492001');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!line1.trim()) errs.line1 = 'Address line 1 is required';
    if (!pincode.trim()) errs.pincode = 'Pincode is required';
    else if (!/^\d{6}$/.test(pincode.trim())) errs.pincode = 'Enter a valid 6-digit pincode';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const result = await onSave({ line1: line1.trim(), line2: line2.trim(), state: 'Chhattisgarh', city: 'Raipur', pincode: pincode.trim() });
    setSaving(false);
    if (result.success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="p-4 flex items-center gap-3 bg-white border-b border-gray-100 shadow-sm">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
          <X className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-gray-900">Set Your Address</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Address Line 1 *</label>
          <input
            type="text"
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            placeholder="House/Flat No., Street, Area"
            className={`w-full px-4 py-3 rounded-xl border ${errors.line1 ? 'border-red-400' : 'border-gray-200'} bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm`}
          />
          {errors.line1 && <p className="text-red-500 text-xs mt-1">{errors.line1}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Address Line 2</label>
          <input
            type="text"
            value={line2}
            onChange={(e) => setLine2(e.target.value)}
            placeholder="Landmark, Colony (Optional)"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
          />
        </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">State</label>
              <div className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-700">Chhattisgarh</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">City</label>
              <div className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-700">Raipur</div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Pincode *</label>
            <input
              type="text"
              inputMode="numeric"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit pincode"
              className={`w-full px-4 py-3 rounded-xl border ${errors.pincode ? 'border-red-400' : 'border-gray-200'} bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm`}
            />
            {errors.pincode && <p className="text-red-500 text-xs mt-1">{errors.pincode}</p>}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-700 font-medium">
              Note: We are serviceable in Raipur only*
            </p>
          </div>
      </div>

      <div className="p-4 bg-white border-t border-gray-100 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Saving...' : 'Save Address'}
        </button>
      </div>
    </div>
  );
}
