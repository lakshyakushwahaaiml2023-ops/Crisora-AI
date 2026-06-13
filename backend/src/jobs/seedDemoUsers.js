import User from '../models/User.js';

const DEMO_PASSWORD = 'password123';

const districts = [
  { name: 'Bhopal', state: 'Madhya Pradesh', lon: 77.4126, lat: 23.2599 },
  { name: 'Indore', state: 'Madhya Pradesh', lon: 75.8577, lat: 22.7196 },
  { name: 'Mumbai Suburban', state: 'Maharashtra', lon: 72.8777, lat: 19.0760 },
  { name: 'Nagapattinam', state: 'Tamil Nadu', lon: 79.8433, lat: 10.7656 },
  { name: 'Rudraprayag', state: 'Uttarakhand', lon: 78.9818, lat: 30.2844 }
];

const states = [
  { name: 'Madhya Pradesh', short: 'mp' },
  { name: 'Maharashtra', short: 'maharashtra' },
  { name: 'Tamil Nadu', short: 'tamilnadu' },
  { name: 'Uttarakhand', short: 'uttarakhand' }
];

const demoUsers = [];

// Add short legacy demo accounts for quick-fill buttons
demoUsers.push(
  {
    name: 'Citizen Demo',
    email: 'citizen@crisora.ai',
    role: 'citizen',
    phone: '+910000000001',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    location: { type: 'Point', coordinates: [77.4126, 23.2599] }
  },
  {
    name: 'Collector Demo',
    email: 'collector@crisora.ai',
    role: 'collector',
    phone: '+910000000002',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    location: { type: 'Point', coordinates: [77.4126, 23.2599] }
  },
  {
    name: 'Authority Demo',
    email: 'authority@crisora.ai',
    role: 'district_authority',
    phone: '+910000000003',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    location: { type: 'Point', coordinates: [77.4126, 23.2599] }
  }
);

// Add district specific roles
districts.forEach(d => {
  const code = d.name.toLowerCase().replace(/\s+/g, '');
  
  // Citizen
  demoUsers.push({
    name: `${d.name} Citizen`,
    email: `citizen.${code}@crisora.ai`,
    role: 'citizen',
    phone: `+91118888${Math.floor(1000 + Math.random() * 9000)}`,
    district: d.name,
    state: d.state,
    location: { type: 'Point', coordinates: [d.lon, d.lat] }
  });
  
  // Collector
  demoUsers.push({
    name: `${d.name} Collector`,
    email: `collector.${code}@crisora.ai`,
    role: 'collector',
    phone: `+91228888${Math.floor(1000 + Math.random() * 9000)}`,
    district: d.name,
    state: d.state,
    location: { type: 'Point', coordinates: [d.lon, d.lat] }
  });
  
  // District Authority
  demoUsers.push({
    name: `${d.name} Authority`,
    email: `authority.${code}@crisora.ai`,
    role: 'district_authority',
    phone: `+91338888${Math.floor(1000 + Math.random() * 9000)}`,
    district: d.name,
    state: d.state,
    location: { type: 'Point', coordinates: [d.lon, d.lat] }
  });
});

// Add state specific roles
states.forEach(s => {
  const mainDist = districts.find(d => d.state === s.name);
  demoUsers.push({
    name: `${s.name} State Authority`,
    email: `state.${s.short}@crisora.ai`,
    role: 'state_authority',
    phone: `+91448888${Math.floor(1000 + Math.random() * 9000)}`,
    district: mainDist ? mainDist.name : '',
    state: s.name,
    location: { type: 'Point', coordinates: mainDist ? [mainDist.lon, mainDist.lat] : [77.4126, 23.2599] }
  });
});

// Add NDMA (National)
demoUsers.push({
  name: 'NDMA Officer',
  email: 'ndma@crisora.ai',
  role: 'ndma',
  phone: '+919999999999',
  district: '',
  state: '',
  location: { type: 'Point', coordinates: [77.4126, 23.2599] }
});

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

  console.log(`[SEED] ${demoUsers.length} Demo users are ready.`);
}
