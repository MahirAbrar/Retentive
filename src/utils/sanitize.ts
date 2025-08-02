// Input sanitization utilities to prevent XSS attacks

/**
 * Sanitizes user input to prevent XSS attacks
 * Escapes HTML special characters
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitizes input for use in HTML attributes
 * More strict than regular sanitization
 */
export function sanitizeAttribute(input: string): string {
  if (typeof input !== 'string') return ''
  
  // Remove any characters that could break out of attributes
  return input.replace(/[^a-zA-Z0-9-_:.]/g, '')
}

/**
 * Sanitizes URLs to prevent javascript: and data: URLs
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') return '#'
  
  const trimmedUrl = url.trim().toLowerCase()
  
  // Disallow dangerous protocols
  if (trimmedUrl.startsWith('javascript:') || 
      trimmedUrl.startsWith('data:') ||
      trimmedUrl.startsWith('vbscript:')) {
    return '#'
  }
  
  // Allow only safe protocols
  const safeProtocols = ['http://', 'https://', 'mailto:', '#', '/']
  const hasProtocol = safeProtocols.some(protocol => trimmedUrl.startsWith(protocol))
  
  if (!hasProtocol && !url.startsWith('/') && !url.startsWith('#')) {
    // Assume https:// if no protocol specified
    return 'https://' + url
  }
  
  return url
}

/**
 * Strips all HTML tags from input
 * Useful for displaying user content in plain text contexts
 */
export function stripHtml(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input.replace(/<[^>]*>/g, '')
}

/**
 * Sanitizes input for use in SQL queries (though we should use parameterized queries)
 * This is a backup defense layer
 */
export function sanitizeSql(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .replace(/'/g, "''")  // Escape single quotes
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/\0/g, '\\0')  // Escape null bytes
}

/**
 * Validates and sanitizes file names
 */
export function sanitizeFileName(fileName: string): string {
  if (typeof fileName !== 'string') return 'file'
  
  // Remove path traversal attempts
  let safe = fileName.replace(/\.\./g, '').replace(/[\/\\]/g, '')
  
  // Remove special characters except dots, dashes, and underscores
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_')
  
  // Ensure it has a safe extension if it has one
  const parts = safe.split('.')
  if (parts.length > 1) {
    const ext = parts[parts.length - 1].toLowerCase()
    const safeExtensions = ['txt', 'json', 'csv', 'pdf', 'png', 'jpg', 'jpeg', 'gif']
    
    if (!safeExtensions.includes(ext)) {
      parts[parts.length - 1] = 'txt'
    }
  }
  
  return parts.join('.')
}

/**
 * Sanitizes JSON strings to prevent injection
 */
export function sanitizeJson(input: string): string {
  if (typeof input !== 'string') return '{}'
  
  try {
    // Parse and re-stringify to ensure valid JSON
    const parsed = JSON.parse(input)
    return JSON.stringify(parsed)
  } catch {
    return '{}'
  }
}

/**
 * Creates a safe display version of user content
 * Combines multiple sanitization techniques
 */
export function sanitizeForDisplay(content: string, options: {
  allowLinks?: boolean
  maxLength?: number
} = {}): string {
  if (typeof content !== 'string') return ''
  
  let safe = sanitizeInput(content)
  
  // Optionally truncate
  if (options.maxLength && safe.length > options.maxLength) {
    safe = safe.substring(0, options.maxLength) + '...'
  }
  
  // Optionally convert URLs to links
  if (options.allowLinks) {
    // Simple URL regex - not perfect but good enough
    const urlRegex = /(https?:\/\/[^\s<]+)/g
    safe = safe.replace(urlRegex, (url) => {
      const sanitizedUrl = sanitizeUrl(url)
      return `<a href="${sanitizedUrl}" target="_blank" rel="noopener noreferrer">${sanitizedUrl}</a>`
    })
  }
  
  return safe
}