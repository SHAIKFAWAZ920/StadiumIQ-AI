import axios from 'axios';

// Dynamic base URL resolver
const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;

  // Auto-detect if page is hosted on Firebase, and route API calls to local backend
  if (typeof window !== 'undefined' && 
      (window.location.hostname.includes('web.app') || 
       window.location.hostname.includes('firebaseapp.com'))) {
    return 'http://localhost:8000/api';
  }

  return '/api';
};

// Create base axios instance
const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach Authorization Token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stadium_iq_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Authentication endpoints
export const authApi = {
  login: async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    return res.data; // returns token, role, username, language
  },
  signup: async (userData: any) => {
    const res = await api.post('/auth/signup', userData);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  }
};

// Chat and Multimodal Chat endpoints
export const chatApi = {
  sendMessage: async (message: string, location: string, imageBase64?: string | null) => {
    const res = await api.post('/chat', { message, location, image_base64: imageBase64 });
    return res.data; // returns response text, language, incident_created flag
  }
};

// Crowd tracking endpoints
export const crowdApi = {
  getZones: async () => {
    const res = await api.get('/crowd');
    return res.data;
  },
  recommendRoute: async (startZone: string, endZone: string) => {
    const res = await api.post('/crowd/recommend-route', { start_zone: startZone, end_zone: endZone });
    return res.data;
  }
};

// Queue prediction endpoints
export const queueApi = {
  getQueues: async () => {
    const res = await api.get('/queue');
    return res.data;
  }
};

// Incidents management endpoints
export const incidentsApi = {
  getAll: async (category?: string, status?: string) => {
    const params: any = {};
    if (category) params.category = category;
    if (status) params.status = status;
    const res = await api.get('/incidents', { params });
    return res.data;
  },
  create: async (incidentData: { category: string; title: string; description: string; location: string; severity: string }) => {
    const res = await api.post('/incidents', incidentData);
    return res.data;
  },
  updateStatus: async (incidentId: number, status: string) => {
    const res = await api.put(`/incidents/${incidentId}/status`, { status });
    return res.data;
  },
  assign: async (incidentId: number, assignedToId: number) => {
    const res = await api.put(`/incidents/${incidentId}/assign`, { assigned_to_id: assignedToId });
    return res.data;
  }
};

// Transport endpoints
export const transportApi = {
  getAll: async () => {
    const res = await api.get('/transport');
    return res.data;
  },
  updateDelay: async (routeId: number, delayMinutes: number, status: string) => {
    const res = await api.put(`/transport/${routeId}`, { delay_minutes: delayMinutes, status });
    return res.data;
  }
};

// Operations Dashboard endpoints
export const dashboardApi = {
  getKPIs: async () => {
    const res = await api.get('/dashboard/kpis');
    return res.data;
  },
  getCharts: async () => {
    const res = await api.get('/dashboard/charts');
    return res.data;
  },
  generateReport: async () => {
    const res = await api.post('/dashboard/generate-report');
    return res.data;
  }
};

export default api;
