const API_BASE = '/api';

export const getBookingAuthToken = () => {
  return localStorage.getItem('g3_token') || localStorage.getItem('g3_admin_token') || '';
};

export const getCustomerAuthToken = () => {
  return localStorage.getItem('customer_token') || '';
};

const authHeaders = (isAdmin = true) => {
  const token = isAdmin ? getBookingAuthToken() : getCustomerAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const bookingApi = {
  // Public Fare & Fleet
  getPricingRules: async () => {
    const res = await fetch(`${API_BASE}/pricing-rules`);
    if (!res.ok) throw new Error('Failed to load pricing rules');
    return res.json();
  },

  calculatePrice: async (payload) => {
    const res = await fetch(`${API_BASE}/calculate-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to calculate price');
    }
    return res.json();
  },

  getAvailability: async (pickup, delivery, expectedDate) => {
    let url = `${API_BASE}/availability?pickup=${encodeURIComponent(pickup)}&delivery=${encodeURIComponent(delivery)}`;
    if (expectedDate) url += `&expected_date=${encodeURIComponent(expectedDate)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to check road route & availability');
    }
    return res.json();
  },

  // Customer Bookings
  createBooking: async (payload) => {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: authHeaders(false),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create booking');
    return data;
  },

  getMyBookings: async (customerId, phone) => {
    let url = `${API_BASE}/bookings/my-bookings?`;
    if (customerId) url += `customer_id=${encodeURIComponent(customerId)}&`;
    if (phone) url += `phone=${encodeURIComponent(phone)}`;
    const res = await fetch(url, { headers: authHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch bookings');
    return res.json();
  },

  getBookingDetails: async (bookingId) => {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}`);
    if (!res.ok) throw new Error('Booking not found');
    return res.json();
  },

  cancelBooking: async (bookingId, reason) => {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
      method: 'PUT',
      headers: authHeaders(false),
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to cancel booking');
    return data;
  },

  // Customer Auth
  customerRegister: async (payload) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
  },

  customerLogin: async (phone, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  // Admin Auth (Primary)
  adminLogin: async (username, password) => {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Invalid credentials');
    return data;
  },

  // Admin Bookings & Overview
  getAdminOverview: async () => {
    const res = await fetch(`${API_BASE}/admin/overview`, { headers: authHeaders(true) });
    if (!res.ok) throw new Error('Failed to fetch admin overview');
    return res.json();
  },

  getAdminBookings: async (filters = {}) => {
    let url = `${API_BASE}/admin/bookings?`;
    if (filters.status) url += `status=${encodeURIComponent(filters.status)}&`;
    if (filters.search) url += `search=${encodeURIComponent(filters.search)}&`;
    if (filters.date) url += `date=${encodeURIComponent(filters.date)}&`;
    const res = await fetch(url, { headers: authHeaders(true) });
    if (!res.ok) throw new Error('Failed to fetch bookings list');
    return res.json();
  },

  assignBooking: async (bookingId, payload) => {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}/assign`, {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to assign lorry & driver');
    return data;
  },

  updateBookingStatus: async (bookingId, payload) => {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}/status`, {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update booking status');
    return data;
  },

  // Admin Fleet & Drivers
  getVehicles: async () => {
    const res = await fetch(`${API_BASE}/admin/vehicles`, { headers: authHeaders(true) });
    if (!res.ok) throw new Error('Failed to fetch vehicles');
    return res.json();
  },

  getDrivers: async () => {
    const res = await fetch(`${API_BASE}/admin/drivers`, { headers: authHeaders(true) });
    if (!res.ok) throw new Error('Failed to fetch drivers');
    return res.json();
  },

  // Admin Notifications
  getNotifications: async () => {
    const res = await fetch(`${API_BASE}/admin/notifications`, { headers: authHeaders(true) });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  markNotificationRead: async (id) => {
    const res = await fetch(`${API_BASE}/admin/notifications/${id}/read`, {
      method: 'PUT',
      headers: authHeaders(true)
    });
    return res.json();
  },

  markAllNotificationsRead: async () => {
    const res = await fetch(`${API_BASE}/admin/notifications/mark-all-read`, {
      method: 'PUT',
      headers: authHeaders(true)
    });
    return res.json();
  },

  // Admin Analytics
  getAdminAnalytics: async () => {
    const res = await fetch(`${API_BASE}/admin/analytics`, { headers: authHeaders(true) });
    if (!res.ok) throw new Error('Failed to load booking analytics');
    return res.json();
  },

  // Aliases for component compatibility
  getAdminVehicles: async () => bookingApi.getVehicles(),
  getAdminDrivers: async () => bookingApi.getDrivers(),
  rejectBooking: async (bookingId, reason) => {
    return bookingApi.updateBookingStatus(bookingId, {
      status: 'Rejected',
      rejection_reason: reason || 'Rejected by Admin'
    });
  },

  // ─── Contact Messages ──────────────────────────────────────────────────────
  submitContact: async (payload) => {
    const res = await fetch(`${API_BASE}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit enquiry');
    return data;
  },

  getContactMessages: async (filters = {}) => {
    let url = `${API_BASE}/admin/contact-messages?`;
    if (filters.search) url += `search=${encodeURIComponent(filters.search)}&`;
    if (filters.status) url += `status=${encodeURIComponent(filters.status)}&`;
    if (filters.subject) url += `subject=${encodeURIComponent(filters.subject)}&`;
    if (filters.date_from) url += `date_from=${encodeURIComponent(filters.date_from)}&`;
    if (filters.date_to) url += `date_to=${encodeURIComponent(filters.date_to)}&`;
    if (filters.page) url += `page=${filters.page}&`;
    if (filters.limit) url += `limit=${filters.limit}&`;
    const res = await fetch(url, { headers: authHeaders(true) });
    if (!res.ok) throw new Error('Failed to fetch contact messages');
    return res.json();
  },

  updateContactMessage: async (id, payload) => {
    const res = await fetch(`${API_BASE}/admin/contact-messages/${id}`, {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update message');
    return data;
  },

  getContactStats: async () => {
    const res = await fetch(`${API_BASE}/admin/contact-stats`, { headers: authHeaders(true) });
    if (!res.ok) throw new Error('Failed to fetch contact stats');
    return res.json();
  },

  // ─── Driver Management ─────────────────────────────────────────────────────
  getAllDrivers: async (filters = {}) => {
    let url = `${API_BASE}/admin/drivers/all?`;
    if (filters.status) url += `status=${encodeURIComponent(filters.status)}&`;
    if (filters.search) url += `search=${encodeURIComponent(filters.search)}&`;
    const res = await fetch(url, { headers: authHeaders(true) });
    if (!res.ok) throw new Error('Failed to fetch drivers');
    return res.json();
  },

  getDriverStats: async (id) => {
    const res = await fetch(`${API_BASE}/admin/drivers/${id}/stats`, { headers: authHeaders(true) });
    if (!res.ok) throw new Error('Failed to fetch driver stats');
    return res.json();
  },

  createDriver: async (payload) => {
    const res = await fetch(`${API_BASE}/admin/drivers/create`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create driver');
    return data;
  },

  updateDriver: async (id, payload) => {
    const res = await fetch(`${API_BASE}/admin/drivers/${id}/update`, {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update driver');
    return data;
  },

  updateDriverStatus: async (id, status) => {
    const res = await fetch(`${API_BASE}/admin/drivers/${id}/status`, {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update driver status');
    return data;
  },

  getDriverLicenceAlerts: async () => {
    const res = await fetch(`${API_BASE}/admin/drivers/licence-alerts`, { headers: authHeaders(true) });
    if (!res.ok) throw new Error('Failed to fetch licence alerts');
    return res.json();
  },

  // ─── Fleet Management ──────────────────────────────────────────────────────
  getFleet: async (filters = {}) => {
    let url = `${API_BASE}/admin/fleet?`;
    if (filters.status) url += `status=${encodeURIComponent(filters.status)}&`;
    if (filters.search) url += `search=${encodeURIComponent(filters.search)}&`;
    const res = await fetch(url, { headers: authHeaders(true) });
    if (!res.ok) throw new Error('Failed to fetch fleet');
    return res.json();
  },

  getVehicleDetails: async (id) => {
    const res = await fetch(`${API_BASE}/admin/fleet/${id}`, { headers: authHeaders(true) });
    if (!res.ok) throw new Error('Failed to fetch vehicle details');
    return res.json();
  },

  createVehicle: async (payload) => {
    const res = await fetch(`${API_BASE}/admin/fleet`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to register vehicle');
    return data;
  },

  updateVehicle: async (id, payload) => {
    const res = await fetch(`${API_BASE}/admin/fleet/${id}`, {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update vehicle');
    return data;
  },

  getFleetAlerts: async () => {
    const res = await fetch(`${API_BASE}/admin/fleet/alerts`, { headers: authHeaders(true) });
    if (!res.ok) throw new Error('Failed to fetch fleet alerts');
    return res.json();
  }
};

export default bookingApi;
