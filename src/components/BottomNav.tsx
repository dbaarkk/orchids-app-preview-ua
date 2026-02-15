'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { Home, Wrench, CalendarDays, User } from 'lucide-react';

const tabs = [
  { id: 'home', label: 'Home', icon: Home, href: '/home' },
  { id: 'services', label: 'Services', icon: Wrench, href: '/services' },
  { id: 'bookings', label: 'Bookings', icon: CalendarDays, href: '/bookings' },
  { id: 'profile', label: 'Profile', icon: User, href: '/profile' },
];

export default function BottomNav() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user || isAdmin) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
      <div className="max-w-[430px] mx-auto px-2">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <button
                key={tab.id}
                onClick={() => router.push(tab.href)}
                className={`flex flex-col items-center justify-center w-16 h-full transition-all ${
                  isActive ? 'text-primary' : 'text-gray-400'
                }`}
              >
                <tab.icon 
                  className={`w-5 h-5 mb-0.5 transition-transform ${isActive ? 'scale-110' : ''}`} 
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
