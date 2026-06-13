import { create } from 'zustand';

const useEventStore = create((set) => ({
  events: [],
  setEvents: (events) => set({ events }),
  addEvent: (event) => set((state) => ({ events: [event, ...state.events] })),
}));

export default useEventStore;
