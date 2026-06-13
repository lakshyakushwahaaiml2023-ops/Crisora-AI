import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || '';
      const isLoginRequest = requestUrl.includes('/auth/login');

      if (!isLoginRequest) {
        localStorage.removeItem('dms_token');
        localStorage.removeItem('dms_user');
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  toggleEvacuationStatus: (isEvacuated) => api.put('/auth/me/evacuation', { isEvacuated }),
};

export const regions = {
  getRegions: () => api.get('/regions'),
  getRegionById: (id) => api.get(`/regions/${id}`),
  getEvacuationRoutes: (regionId) => api.get(`/regions/${regionId}/routes`),
};

export const sos = {
  createSOS: (data) => api.post('/sos', data),
  getSOSAlerts: () => api.get('/sos'),
  getAllSOSAlerts: () => api.get('/sos?all=true'),
  acknowledgeSOS: (id) => api.put(`/sos/${id}/acknowledge`),
  resolveSOS: (id) => api.put(`/sos/${id}/resolve`),
  simulateSOSCluster: (regionId, type) => api.post('/sos/simulate-cluster', { regionId, type }),
};

export const events = {
  getDisasterEvents: () => api.get('/events'),
  getAllDisasterEvents: () => api.get('/events?all=true'),
  createDisasterEvent: (data) => api.post('/events', data),
  resolveDisasterEvent: (id, data) => api.put(`/events/${id}/resolve`, data),
};

export const broadcast = {
  send: (data) => api.post('/broadcast', data),
  testCall: (message) => api.post('/broadcast/test-call', { message }),
};

export const ai = {
  sendMessage: async (message, onChunk, regionId) => {
    try {
      const token = localStorage.getItem('dms_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ message, regionId }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('dms_token');
          window.location.replace('/login');
        }
        throw new Error(`AI service error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (onChunk) onChunk(chunk);
      }
    } catch (error) {
      console.error('AI stream error', error);
      throw error;
    }
  },
  getRecommendation: (regionId) => api.get(`/ai/recommendation${regionId ? `?regionId=${regionId}` : ''}`),
};

export const simulation = {
  getHistoricalEvents: () => api.get('/simulation/events'),
  replayEvent: (id) => api.post(`/simulation/replay/${id}`),
};

export default api;
