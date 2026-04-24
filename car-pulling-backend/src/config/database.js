const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Fail fast instead of hanging
      socketTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Ensure geospatial indexes are created
    const Trip = require('../models/Trip');
    await Trip.collection.createIndex({ 'pickupLocation.coordinates': '2dsphere' });
    await Trip.collection.createIndex({ 'dropoffLocation.coordinates': '2dsphere' });
    console.log('✅ Geospatial indexes created');

    return conn;
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    console.warn('⚠️  MongoDB not available. Backend will continue running.');
    console.warn('⚠️  Frontend will automatically fall back to Render server.');
    // Don't crash - allow backend to start so health check works
    return null;
  }
};

module.exports = connectDB;
