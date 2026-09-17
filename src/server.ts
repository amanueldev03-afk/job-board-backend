import app from './app';
import { config, validateEnv } from './config';
import prisma from './lib/prisma';
import { logger } from './utils/logger';

export const startServer = async (): Promise<void> => {
  try {
    validateEnv();

    // Attempt database connection on startup
    try {
      await prisma.$connect();
      logger.info('Database connected successfully');
    } catch (dbError) {
      logger.warn(
        `Database connection failed on startup: ${(dbError as Error).message}. Server will continue running.`
      );
    }

    const server = app.listen(config.port, () => {
      logger.info('🚀 Server Started Successfully!');
      logger.info(`   Environment: ${config.nodeEnv}`);
      logger.info(`   Port: ${config.port}`);
      logger.info(`   Client URL: ${config.clientUrl}`);
      logger.info('\n📋 Available Core Routes:');
      logger.info('   GET  /health - Health check');
      logger.info('   GET  /api/v1/status - API v1 status');
      logger.info('\n💡 Press Ctrl+C to stop the server\n');
    });

    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        try {
          await prisma.$disconnect();
          logger.info('✅ Database connection closed');
        } catch {
          // Ignore disconnect error if connection was not established
        }
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this module is executed directly
if (require.main === module) {
  startServer();
}

export default startServer;
