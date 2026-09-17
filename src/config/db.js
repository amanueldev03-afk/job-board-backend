const { Sequelize } = require('sequelize');
const env = require('./env');

const sequelize = new Sequelize(env.DATABASE_URL, {
    dialect: 'postgres',
    logging: env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log(`   PostgreSQL Connected Successfully`);
        console.log(`   Database: ${sequelize.config.database}`);
        
        await sequelize.sync({ alter: env.NODE_ENV === 'development' });
        console.log('   Database synchronized');
    } catch (error) {
        console.error(' PostgreSQL Connection Error:', error.message);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.error('   PostgreSQL is not running. Start it with:');
            console.error('   sudo systemctl start postgresql');
            console.error('   OR');
            console.error('   pg_ctl -D /usr/local/var/postgres start');
        }
        
        process.exit(1);
    }
};

module.exports = { sequelize, connectDB };