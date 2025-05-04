// src/utils/html-sanitize.ts
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM('');
// Initialize DOMPurify with the JSDOM window object
const purify = DOMPurify(window);

/**
 * Sanitize HTML content to prevent XSS attacks
 * 
 * @param html The HTML content to sanitize
 * @returns Sanitized HTML content
 */
export const htmlSanitize = (html: string): string => {
  if (!html) return '';
  
  return purify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
};