const API_BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

const api = {
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  getMe: () => request('/auth/me'),

  changePassword: (currentPassword, newPassword) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  getTrips: () => request('/trips'),
  getTrip: (id) => request(`/trips/${id}`),
  createTrip: (trip) => request('/trips', { method: 'POST', body: JSON.stringify(trip) }),
  updateTrip: (id, trip) => request(`/trips/${id}`, { method: 'PUT', body: JSON.stringify(trip) }),
  deleteTrip: (id) => request(`/trips/${id}`, { method: 'DELETE' }),
  recalculateTrip: (id) => request(`/trips/${id}/recalculate`, { method: 'POST' }),
  geocode: (q) => request(`/trips/geocode?q=${encodeURIComponent(q)}`),

  getUsers: () => request('/users'),
  getUserStats: () => request('/users/stats'),
  createUser: (user) => request('/users', { method: 'POST', body: JSON.stringify(user) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetUserPassword: (id, password) =>
    request(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};

export default api;
