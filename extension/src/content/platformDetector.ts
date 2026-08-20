import { Platform } from '../shared/types';

export function detectPlatform(url: string): Platform | null {
  const lowercaseUrl = url.toLowerCase();
  
  if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('studio.youtube.com')) {
    return 'youtube';
  }
  
  if (
    lowercaseUrl.includes('facebook.com') || 
    lowercaseUrl.includes('business.facebook.com') ||
    lowercaseUrl.includes('instagram.com')
  ) {
    return 'meta';
  }
  
  if (
    lowercaseUrl.includes('mock-sandbox.html') || 
    lowercaseUrl.includes('extension-sandbox') ||
    lowercaseUrl.includes('chrome-extension://')
  ) {
    return 'mock';
  }
  
  return null;
}
