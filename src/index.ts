import app from './app';
import { config, validateEnv } from './config';
import prisma from './lib/prisma';

const startServer = async (): Promise<void> => {
  try {
    validateEnv();

    // Attempt database connection on startup
    try {
      await prisma.$connect();
      console.log('✅ Database connected successfully');
    } catch (dbError) {
      console.warn('⚠️  Database connection failed on startup:', (dbError as Error).message);
      console.warn('   The server will still run, and /health will report database status.');
    }

    const server = app.listen(config.port, () => {
      console.log('🚀 Server Started Successfully!');
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log(`   Port: ${config.port}`);
      console.log(`   Client URL: ${config.clientUrl}`);
      console.log('\n📋 Available Routes:');
      console.log(`   GET  /health - Health check`);
      console.log(`   GET  /api/status - API status`);
      console.log('\n💡 Press Ctrl+C to stop the server');
    });

    const gracefulShutdown = async (): Promise<void> => {
      console.log('\n🛑 Shutting down gracefully...');
      server.close(async () => {
        try {
          await prisma.$disconnect();
          console.log('✅ Database connection closed');
        } catch {
          // ignore error on disconnect if never connected
        }
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
