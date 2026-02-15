import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAssetPath(path: string) {
  if (!path) return path
  
  // Ensure the path starts with a slash for internal consistency
  const normalized = path.startsWith('/') ? path : `/${path}`
  
  if (typeof window !== 'undefined') {
    // Check if we are running in Capacitor (file protocol)
    if (window.location.protocol === 'file:') {
      // In Capacitor, we need to handle paths differently
      // Using relative paths is generally safer for static exports
      const segments = window.location.pathname.split('/').filter(Boolean);
      const depth = segments.length > 0 ? segments.length - 1 : 0;
      
      // If we are deep in the directory structure (e.g. /booking/index.html),
      // we need to go up to the root to find the asset.
      const relativeRoot = depth > 0 ? '../'.repeat(depth) : './';
      return relativeRoot + normalized.slice(1);
    }
  }
  
  // In standard web environment, just return the normalized absolute path
  return normalized
}
