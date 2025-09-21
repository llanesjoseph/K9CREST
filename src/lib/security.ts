/**
 * Security utilities for input validation, sanitization, and protection
 */

import { z } from 'zod';

// XSS Protection - Basic HTML sanitization
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 10000); // Limit length
}

// SQL Injection Protection (for any SQL-like queries)
export function sanitizeSql(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/['";\\]/g, '') // Remove dangerous SQL characters
    .replace(/\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|ALTER|CREATE)\b/gi, '') // Remove SQL keywords
    .trim()
    .substring(0, 1000); // Limit length
}

// General input sanitization
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>'"&]/g, '') // Remove HTML/XML characters
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim()
    .substring(0, maxLength);
}

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Password strength validation
export function isStrongPassword(password: string): boolean {
  if (!password || password.length < 8) return false;
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
}

// Rate limiting helper
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
  
  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}

// CSRF Token generation and validation
export class CSRFProtection {
  private tokens: Map<string, { token: string; expires: number }> = new Map();
  
  generateToken(sessionId: string): string {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expires = Date.now() + (60 * 60 * 1000); // 1 hour
    
    this.tokens.set(sessionId, { token, expires });
    return token;
  }
  
  validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);
    
    if (!stored || Date.now() > stored.expires) {
      this.tokens.delete(sessionId);
      return false;
    }
    
    return stored.token === token;
  }
  
  revokeToken(sessionId: string): void {
    this.tokens.delete(sessionId);
  }
}

// File upload validation
export interface FileValidationOptions {
  maxSize: number; // in bytes
  allowedTypes: string[];
  allowedExtensions: string[];
}

export function validateFile(
  file: File, 
  options: FileValidationOptions
): { isValid: boolean; error?: string } {
  // Check file size
  if (file.size > options.maxSize) {
    return {
      isValid: false,
      error: `File size exceeds maximum allowed size of ${Math.round(options.maxSize / 1024 / 1024)}MB`
    };
  }
  
  // Check file type
  if (!options.allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed`
    };
  }
  
  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !options.allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: `File extension .${extension} is not allowed`
    };
  }
  
  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.scr$/i,
    /\.pif$/i,
    /\.vbs$/i,
    /\.js$/i,
    /\.jar$/i,
    /\.php$/i,
    /\.asp$/i,
    /\.jsp$/i
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
    return {
      isValid: false,
      error: 'File type is not allowed for security reasons'
    };
  }
  
  return { isValid: true };
}

// Security headers for API responses
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:;"
};

// Input validation schemas
export const CommonValidationSchemas = {
  // Basic string validation
  string: z.string().min(1).max(1000).transform((input) => sanitizeInput(input, 1000)),
  
  // Name validation
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s\-_\.]+$/, 'Invalid characters in name'),
  
  // Email validation
  email: z.string().email().max(254).transform(email => email.toLowerCase()),
  
  // Phone validation
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format'),
  
  // URL validation
  url: z.string().url().max(2000),
  
  // Password validation
  password: z.string().min(8).max(128).refine(isStrongPassword, 'Password must contain uppercase, lowercase, number, and special character'),
  
  // ID validation (Firestore document IDs)
  id: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format'),
  
  // Role validation
  role: z.enum(['admin', 'judge', 'competitor', 'spectator']),
  
  // File upload validation
  file: z.instanceof(File).refine(
    file => file.size <= 10 * 1024 * 1024, // 10MB max
    'File size must be less than 10MB'
  )
};

// Audit logging
export interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export function createAuditLog(entry: Omit<AuditLogEntry, 'timestamp'>): AuditLogEntry {
  return {
    ...entry,
    timestamp: new Date()
  };
}

// Security middleware helpers
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  return cfConnectingIP || realIP || forwarded?.split(',')[0] || 'unknown';
}

export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}

// Error sanitization for API responses
export function sanitizeError(error: any): { message: string; code?: string } {
  // Don't expose internal error details
  if (error instanceof z.ZodError) {
    return { message: 'Invalid input data', code: 'VALIDATION_ERROR' };
  }
  
  if (error.code === 'auth/user-not-found') {
    return { message: 'User not found', code: 'USER_NOT_FOUND' };
  }
  
  if (error.code === 'auth/invalid-credential') {
    return { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' };
  }
  
  if (error.code === 'permission-denied') {
    return { message: 'Access denied', code: 'PERMISSION_DENIED' };
  }
  
  // Generic error for unknown issues
  return { message: 'An error occurred', code: 'INTERNAL_ERROR' };
}
