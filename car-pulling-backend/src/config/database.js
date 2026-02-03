const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
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
    process.exit(1);
  }
};

module.exports = connectDB;
