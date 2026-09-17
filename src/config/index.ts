import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  emailHost: process.env.EMAIL_HOST,
  emailPort: parseInt(process.env.EMAIL_PORT || '587', 10),
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
  emailSecure: process.env.EMAIL_SECURE === 'true',
  emailFrom: process.env.EMAIL_FROM || 'JobBoard <noreply@jobboard.com>',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
  allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'image/jpeg',
    'image/png',
    'application/pdf',
  ],
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

export const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];

export function validateEnv(): void {
  for (const envVar of requiredEnvVars) {
    const val = process.env[envVar];
    if (!val || val.trim() === '') {
      throw new Error(`[Config Error] Required environment variable '${envVar}' is missing or empty.`);
    }
  }

  const dbUrl = process.env.DATABASE_URL || '';
  const validDbProtocols = ['postgresql://', 'postgres://', 'prisma+postgres://'];
  const hasValidProtocol = validDbProtocols.some((prefix) => dbUrl.startsWith(prefix));

  if (!hasValidProtocol) {
    throw new Error(
      `[Config Error] Invalid DATABASE_URL protocol. Expected one of: ${validDbProtocols.join(
        ', '
      )}. Received: '${dbUrl.split('://')[0]}://...'`
    );
  }
}
