import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Node environment
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),

  // Server
  PORT: Joi.number().default(3000),

  // GraphQL
  GRAPHQL_DEBUG: Joi.boolean().default(true),
  GRAPHQL_PLAYGROUND: Joi.boolean().default(true),

  // Storage
  STORAGE_PROVIDER: Joi.string().valid('fs', 's3', 'r2').default('fs'),
  STORAGE_PATH: Joi.string().default('./storage'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),
  
  // Authentication
  JWT_SECRET: Joi.string().required().min(32),
  SESSION_TTL: Joi.number().default(604800), // 7 days in seconds
  
  // Supabase
  SUPABASE_URL: Joi.string().required(),
  SUPABASE_SERVICE_KEY: Joi.string().required(),
});