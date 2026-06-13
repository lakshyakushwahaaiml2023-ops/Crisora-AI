import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import { buildContext, getAIAdvice } from './src/services/aiAgent.js';

dotenv.config();

console.log('='.repeat(60));
console.log('  TESTING AI DISASTER ASSISTANT AGENT');
console.log('='.repeat(60));

async function run() {
  try {
    await connectDB();
    console.log('Connected to MongoDB.');

    // 1. Fetch Bhopal Collector user
    const user = await User.findOne({ email: 'collector.bhopal@crisora.ai' });
    if (!user) {
      throw new Error('Could not find collector demo user. Please ensure database is seeded.');
    }
    console.log(`\nFound User: ${user.name} (Role: ${user.role}, District: ${user.district})`);

    // 2. Build Context dynamically (passing regionId as undefined)
    console.log('\nBuilding AI context dynamically (without regionId)...');
    const context = await buildContext(user._id, undefined);
    
    console.log('✓ AI Context Built Successfully!');
    console.log(`- Resolved Region: ${context.region.name} (${context.region.district})`);
    console.log(`- Risk Score: ${context.region.riskScore} (${context.region.riskLevel})`);
    console.log(`- Active Telemetry Sources: ${context.sensorReadings.map(s => s.sourceType).join(', ')}`);
    console.log(`- Active Disasters count: ${context.activeDisasters.length}`);
    console.log(`- Open SOS alerts: ${context.openSOS.count}`);

    // 3. Test getAIAdvice
    console.log('\nRequesting advice from Groq...');
    console.log('Message: "Analyze the current situation and give me recommendations."');
    console.log('--- AI Response Stream Start ---');

    await getAIAdvice(user._id, undefined, 'Analyze the current situation and give me recommendations.', (chunk) => {
      process.stdout.write(chunk);
    });

    console.log('\n--- AI Response Stream End ---');

  } catch (error) {
    console.error('\n❌ AI Agent Test Failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
    process.exit();
  }
}

run().catch(console.error);
