export const getOfflineAdvice = (situation) => {
  const lower = situation.toLowerCase();
  
  if (lower.includes('flood')) {
    return "FLOOD EMERGENCY STEPS:\n1. Move to higher ground immediately.\n2. Do not walk or drive through flood waters (even 6 inches can knock you down).\n3. Turn off main power and gas if instructed.\n4. Wait for official rescue teams if trapped.";
  }
  if (lower.includes('earthquake')) {
    return "EARTHQUAKE SAFETY STEPS:\n1. DROP, COVER, and HOLD ON under sturdy furniture.\n2. Stay away from glass, windows, and heavy fixtures.\n3. If outdoors, move to an open clear area away from buildings and power lines.\n4. Do not use elevators under any circumstances.";
  }
  if (lower.includes('fire')) {
    return "FIRE SAFETY STEPS:\n1. Evacuate immediately using the nearest exit (do not use elevators).\n2. Stay low to the ground to avoid smoke inhalation.\n3. Before opening doors, feel them with the back of your hand to check for heat.\n4. Call emergency services once safely outside.";
  }
  if (lower.includes('cyclone') || lower.includes('storm')) {
    return "CYCLONE SAFETY STEPS:\n1. Stay indoors and away from windows.\n2. Secure loose outdoor objects.\n3. Keep your emergency kit, flashlight, and radio nearby.\n4. Do not go out during the calm 'eye' of the storm.";
  }
  
  return "GENERAL EMERGENCY STEPS:\n1. Stay calm and assess your surroundings.\n2. Follow instructions from local authorities.\n3. Keep your mobile device charged and limit non-essential calls.\n4. Keep your emergency kit ready and stay tuned to official broadcasts.";
};
