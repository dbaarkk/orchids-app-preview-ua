## Project Summary
A professional car service booking application (Urban Auto Garage) built with Next.js and Capacitor, targeting Android. It features high-accuracy geolocation for mechanics, native push notifications for updates, a persistent authentication system using Supabase, and a robust booking system with real-time status updates.

## Tech Stack
- Frontend: Next.js 15 (App Router), Tailwind CSS, Framer Motion, Lucide React
- Backend: Supabase (Auth, Database, SQL functions)
- Native: Capacitor 8 (Geolocation, Push Notifications, Device Info)
- CI/CD: GitHub Actions (Android APK build)

## Architecture
- `src/app`: Next.js pages and API routes
- `src/components`: UI components (Shadcn UI based)
- `src/hooks`: Custom hooks for native features (location, notifications)
- `src/lib`: Context providers (Auth), Supabase client, and data utilities
- `android/`: Native Android project (managed by Capacitor)

## User Preferences
- No comments in code unless requested.
- Use Supabase for Auth and Database.
- High accuracy geolocation (>100m warning).
- Real-time persistent auth (stay logged in).
- Native Android permission popups.
- Minimalistic and clean UI design.

## Project Guidelines
- Do NOT modify the native `android/` folder structure manually.
- Use `NEXT_PUBLIC_` prefix for client-side environment variables.
- Ensure `images.unoptimized` is true in `next.config.ts` for static exports.
- All native API calls should use `@capacitor/*` plugins.
- Database schema: `bookings` table requires `preferred_date_time` (string) and `booking_date` (timestamp).
- Error handling: Ensure all submission buttons have proper loading states and handle failures gracefully to prevent indefinite buffering.

## Common Patterns
- Geolocation: `getAccurateLocation()` in `src/lib/location.ts`.
- Notifications: `useNativeNotifications` hook for registration and event handling.
- Auth: `useAuth` hook for user state and operations.
- Booking flow: `addBooking` in `useAuth` handles database insertion and optimistic local state updates.
- Performance: Use `useMemo` for sorting/filtering lists and `useEffect` with specific dependencies to avoid redundant API calls.
