import { create } from 'zustand';

const useRegionStore = create((set) => ({
  regions: [],
  setRegions: (regions) => set({ regions }),
  updateRegionRisk: (regionId, riskScore, riskLevel) => set((state) => ({
    regions: state.regions.map(region => 
      region.id === regionId ? { ...region, riskScore, riskLevel } : region
    )
  })),
}));

export default useRegionStore;
