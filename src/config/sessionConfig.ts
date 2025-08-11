/**
 * Session configuration constants
 */
export const SESSION_CONFIG = {
  // Time settings (in seconds)
  SESSION_TTL: parseInt(process.env.REDIS_SESSION_TTL || '1200'), // 20 minutes
  SYNC_INTERVAL: parseInt(process.env.REDIS_SESSION_SYNC_INTERVAL || '300') * 1000, // 5 minutes in ms
  BACKGROUND_SYNC_CHECK_INTERVAL: 60000, // 1 minute in ms
  
  // Message limits
  MAX_MESSAGES_PER_SESSION: parseInt(process.env.REDIS_SESSION_MAX_MESSAGES || '1000'),
  INITIAL_LOAD_SIZE: 50,
  SYNC_THRESHOLD_PERCENTAGE: 0.8, // Start background sync at 80% capacity
  
  // Batch processing
  SYNC_BATCH_SIZE: parseInt(process.env.DB_SYNC_BATCH_SIZE || '100'),
  SYNC_RETRY_ATTEMPTS: parseInt(process.env.DB_SYNC_RETRY_ATTEMPTS || '3'),
  SYNC_RETRY_DELAY: parseInt(process.env.DB_SYNC_RETRY_DELAY || '1000'), // ms
  
  // Feature flags
  ENABLE_COMPRESSION: process.env.REDIS_SESSION_COMPRESSION === 'true',
  ENABLE_SESSION_METRICS: process.env.ENABLE_SESSION_METRICS === 'true',
  METRICS_COLLECTION_INTERVAL: parseInt(process.env.METRICS_COLLECTION_INTERVAL || '60000'), // ms
  
  // Redis key patterns
  REDIS_KEY_PREFIX: {
    SESSION: 'chat:session:',
    MESSAGES: 'chat:messages:',
    METADATA: 'chat:meta:',
    METRICS: 'chat:metrics:',
  },
};

/**
 * Get session configuration with overrides
 */
export function getSessionConfig(overrides?: Partial<typeof SESSION_CONFIG>): typeof SESSION_CONFIG {
  return {
    ...SESSION_CONFIG,
    ...overrides,
  };
}

/**
 * Validate session configuration
 */
export function validateSessionConfig(): boolean {
  const errors: string[] = [];
  
  if (SESSION_CONFIG.SESSION_TTL < 60) {
    errors.push('SESSION_TTL must be at least 60 seconds');
  }
  
  if (SESSION_CONFIG.MAX_MESSAGES_PER_SESSION < 100) {
    errors.push('MAX_MESSAGES_PER_SESSION must be at least 100');
  }
  
  if (SESSION_CONFIG.SYNC_BATCH_SIZE < 10) {
    errors.push('SYNC_BATCH_SIZE must be at least 10');
  }
  
  if (SESSION_CONFIG.SYNC_THRESHOLD_PERCENTAGE < 0.5 || SESSION_CONFIG.SYNC_THRESHOLD_PERCENTAGE > 1) {
    errors.push('SYNC_THRESHOLD_PERCENTAGE must be between 0.5 and 1');
  }
  
  if (errors.length > 0) {
    console.error('❌ Session configuration validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    return false;
  }
  
  console.log('✅ Session configuration validated successfully');
  return true;
}

/**
 * Log session configuration (for debugging)
 */
export function logSessionConfig(): void {
  console.log('📋 Session Configuration:');
  console.log(`  - Session TTL: ${SESSION_CONFIG.SESSION_TTL}s (${SESSION_CONFIG.SESSION_TTL / 60} minutes)`);
  console.log(`  - Max messages per session: ${SESSION_CONFIG.MAX_MESSAGES_PER_SESSION}`);
  console.log(`  - Sync threshold: ${SESSION_CONFIG.SYNC_THRESHOLD_PERCENTAGE * 100}%`);
  console.log(`  - Batch size: ${SESSION_CONFIG.SYNC_BATCH_SIZE}`);
  console.log(`  - Compression: ${SESSION_CONFIG.ENABLE_COMPRESSION ? 'Enabled' : 'Disabled'}`);
  console.log(`  - Metrics: ${SESSION_CONFIG.ENABLE_SESSION_METRICS ? 'Enabled' : 'Disabled'}`);
}
