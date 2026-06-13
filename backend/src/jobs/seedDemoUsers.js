import User from '../models/User.js';

const DEMO_PASSWORD = 'password123';

const demoUsers = [
  {
    name: 'Citizen Demo',
    email: 'citizen@crisora.ai',
    role: 'citizen',
    phone: '+910000000001',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    location: {
      type: 'Point',
      coordinates: [77.4126, 23.2599],
    },
  },
  {
    name: 'Collector Demo',
    email: 'collector@crisora.ai',
    role: 'collector',
    phone: '+910000000002',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    location: {
      type: 'Point',
      coordinates: [77.4126, 23.2599],
    },
  },
  {
    name: 'Authority Demo',
    email: 'authority@crisora.ai',
    role: 'district_authority',
    phone: '+910000000003',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    location: {
      type: 'Point',
      coordinates: [77.4126, 23.2599],
    },
  },
];

export async function seedDemoUsers() {
  for (const demoUser of demoUsers) {
    const existingUser = await User.findOne({ email: demoUser.email });

    if (!existingUser) {
      await User.create({
        ...demoUser,
        password: DEMO_PASSWORD,
        isActive: true,
      });
      continue;
    }

    existingUser.set({
      ...demoUser,
      password: DEMO_PASSWORD,
      isActive: true,
    });
    await existingUser.save();
  }

  console.log('[SEED] Demo users are ready.');
}
