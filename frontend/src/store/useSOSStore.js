import { create } from 'zustand';

const useSOSStore = create((set) => ({
  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),
  updateAlert: (id, updates) => set((state) => ({
    alerts: state.alerts.map(alert => 
      alert.id === id ? { ...alert, ...updates } : alert
    )
  })),
}));

export default useSOSStore;
