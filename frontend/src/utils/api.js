const API_BASE_URL = (typeof process !== 'undefined' && process.env?.REACT_APP_TRANSPORT_API_URL) || '/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('g3_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const api = {
    // Trip endpoints
    getTrips: async () => {
        const response = await fetch(`${API_BASE_URL}/trips`, {
            headers: { ...getAuthHeaders() }
        });
        if (!response.ok) throw new Error('Failed to fetch trips');
        return response.json();
    },

    createTrip: async (tripData) => {
        const response = await fetch(`${API_BASE_URL}/trips`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(tripData),
        });
        if (!response.ok) throw new Error('Failed to create trip');
        return response.json();
    },

    deleteTrip: async (tripId) => {
        const response = await fetch(`${API_BASE_URL}/trips/${tripId}`, {
            method: 'DELETE',
            headers: { ...getAuthHeaders() }
        });
        if (!response.ok) throw new Error('Failed to delete trip');
        return response.json();
    },

    uploadExcel: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${API_BASE_URL}/trips/upload`, {
            method: 'POST',
            headers: { ...getAuthHeaders() }, // FormData handles its own Content-Type
            body: formData,
        });
        if (!response.ok) throw new Error('Failed to upload Excel file');
        return response.json();
    },

    // Auth endpoints
    login: async (username, password) => {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        if (!response.ok) throw new Error('Invalid credentials');
        return response.json();
    }
};
 
export default api;
