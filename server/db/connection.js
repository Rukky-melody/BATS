const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function connectDB() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌  MONGODB_URI is not defined in .env');
        process.exit(1);
    }
    try {
        await mongoose.connect(uri);
        console.log('✅  MongoDB connected successfully');
    } catch (err) {
        console.error('❌  MongoDB connection error:', err.message);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    await mongoose.disconnect();
    console.log('MongoDB disconnected on app termination');
    process.exit(0);
});

module.exports = { connectDB };
