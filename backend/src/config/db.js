import dns from 'node:dns';
import mongoose from 'mongoose';

// Override system DNS with Google's public DNS to fix SRV lookup issues
// on networks that block or misconfigure mongodb.net resolution
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    console.error('CRITICAL ERROR: MONGO_URI environment variable is not defined.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`Successfully connected to MongoDB: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
