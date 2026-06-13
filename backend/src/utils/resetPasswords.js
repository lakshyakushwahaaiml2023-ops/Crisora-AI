import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.js';

dotenv.config({ override: true });

async function run() {
  try {
    await connectDB();
    console.log('[RESET] Fetching all users in database...');
    const users = await User.find({});
    console.log(`[RESET] Found ${users.length} users. Resetting passwords to "password123"...`);
    
    for (const user of users) {
      user.password = 'password123';
      // Save triggers the pre-save hook which automatically hashes the password
      await user.save();
      console.log(`[RESET] Password reset successful for: ${user.email} (${user.role})`);
    }
    
    console.log('[RESET] All user passwords successfully updated to "password123".');
    process.exit(0);
  } catch (error) {
    console.error('[RESET] Failed to reset passwords:', error);
    process.exit(1);
  }
}

run();
