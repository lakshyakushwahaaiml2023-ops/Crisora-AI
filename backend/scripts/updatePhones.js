/**
 * updatePhones.js
 * One-shot script: assign real phone numbers to existing demo citizen accounts.
 * Run with: node updatePhones.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI);
console.log('[DB] Connected to MongoDB');

const User = (await import('../src/models/User.js')).default;

const updates = [
  // Bhopal citizens → 3 real numbers
  { email: 'citizen@crisora.ai',         phone: '+919302139664' },
  { email: 'citizen.bhopal@crisora.ai',  phone: '+916268347442' },

  // We'll also create/update a third Bhopal citizen for the third number
  // Mumbai citizen → 1 real number
  { email: 'citizen.mumbaisuburban@crisora.ai', phone: '+918109927290' },
];

for (const u of updates) {
  const result = await User.findOneAndUpdate(
    { email: u.email },
    { $set: { phone: u.phone } },
    { new: true }
  );
  if (result) {
    console.log(`[OK] ${result.email} → phone set to ${result.phone}`);
  } else {
    console.warn(`[MISS] No user found with email: ${u.email}`);
  }
}

// Third Bhopal number — assign to a new citizen if none left, or upsert
const thirdBhopal = await User.findOneAndUpdate(
  { district: 'Bhopal', role: 'citizen', email: { $nin: ['citizen@crisora.ai', 'citizen.bhopal@crisora.ai'] } },
  { $set: { phone: '+919669666845' } },
  { new: true }
);
if (thirdBhopal) {
  console.log(`[OK] ${thirdBhopal.email} → phone set to +919669666845 (3rd Bhopal citizen)`);
} else {
  // Create a new citizen for this number
  const newCitizen = await User.create({
    name: 'Bhopal Citizen 2',
    email: 'citizen2.bhopal@crisora.ai',
    password: 'password123',
    role: 'citizen',
    phone: '+919669666845',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    isActive: true,
    location: { type: 'Point', coordinates: [77.4126, 23.2599] },
  });
  console.log(`[CREATED] New citizen ${newCitizen.email} → phone +919669666845`);
}

await mongoose.disconnect();
console.log('[DONE] Phone numbers updated successfully.');
