const API_BASE = '/api';

// Helper to get auth headers from localStorage
function getAuthHeaders() {
  const token = localStorage.getItem('compras_agro_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Safe fetch JSON wrapper
async function fetchJson(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Error en el servidor (${res.status})`);
    }
    if (!res.ok) {
      throw new Error(data.message || data.error || `Error ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`Fetch error for ${url}:`, err.message);
    throw err;
  }
}

export const api = {
  // Auth & Admin Accounts
  login: async (username, password) => {
    const data = await fetchJson(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (data.token) {
      localStorage.setItem('compras_agro_token', data.token);
      localStorage.setItem('compras_agro_user', JSON.stringify(data.user));
    }
    return data;
  },
  logout: async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('compras_agro_token');
    localStorage.removeItem('compras_agro_user');
  },
  getMe: async () => {
    return fetchJson(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
  },
  getAdmins: async () => {
    try {
      return await fetchJson(`${API_BASE}/auth/admins`);
    } catch {
      return [];
    }
  },
  updateAdmins: async (admins) => {
    return fetchJson(`${API_BASE}/auth/admins`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ admins })
    });
  },

  // Years & Budgets
  getYears: async () => {
    try {
      const data = await fetchJson(`${API_BASE}/years`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [{ year: 2026, initial_budget: 0, description: 'Presupuesto 2026', is_active: 1 }];
    }
  },
  createYear: async (data) => {
    return fetchJson(`${API_BASE}/years`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
  },
  updateYear: async (year, data) => {
    return fetchJson(`${API_BASE}/years/${year}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
  },
  getBudgets: async (year) => {
    try {
      return await fetchJson(`${API_BASE}/budgets?year=${year}`);
    } catch {
      return {
        year: { year: year || 2026, initial_budget: 0 },
        allocations: [],
        totals: { department_budget: 0, total_allocated: 0, total_spent: 0, department_remaining: 0, department_spent_percentage: 0 }
      };
    }
  },
  updateBudgets: async (year, data) => {
    return fetchJson(`${API_BASE}/budgets/${year}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
  },

  // Areas
  getAreas: async () => {
    try {
      const data = await fetchJson(`${API_BASE}/areas`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
  createArea: async (data) => {
    return fetchJson(`${API_BASE}/areas`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
  },
  updateArea: async (id, data) => {
    return fetchJson(`${API_BASE}/areas/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
  },
  deleteArea: async (id) => {
    return fetchJson(`${API_BASE}/areas/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
  },

  // Rubros
  getRubros: async () => {
    try {
      const data = await fetchJson(`${API_BASE}/rubros`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
  createRubro: async (data) => {
    return fetchJson(`${API_BASE}/rubros`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
  },
  updateRubro: async (id, data) => {
    return fetchJson(`${API_BASE}/rubros/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
  },
  deleteRubro: async (id) => {
    return fetchJson(`${API_BASE}/rubros/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
  },

  // Requests
  getRequests: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.year) params.append('year', filters.year);
      if (filters.area_id) params.append('area_id', filters.area_id);
      if (filters.rubro_id) params.append('rubro_id', filters.rubro_id);
      if (filters.modality) params.append('modality', filters.modality);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const data = await fetchJson(`${API_BASE}/requests?${params.toString()}`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
  getRequest: async (id) => {
    return fetchJson(`${API_BASE}/requests/${id}`);
  },
  createRequest: async (data) => {
    return fetchJson(`${API_BASE}/requests`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
  },
  updateRequest: async (id, data) => {
    return fetchJson(`${API_BASE}/requests/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
  },
  deleteRequest: async (id) => {
    return fetchJson(`${API_BASE}/requests/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
  },

  // Purchases
  purchaseItem: async (requestId, itemId, data) => {
    return fetchJson(`${API_BASE}/requests/${requestId}/items/${itemId}/purchase`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
  },
  purchaseAllItems: async (requestId, data) => {
    return fetchJson(`${API_BASE}/requests/${requestId}/purchase-all`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
  },

  // Stats
  getStats: async (year) => {
    try {
      return await fetchJson(`${API_BASE}/stats?year=${year}`);
    } catch {
      return {
        year: { year: year || 2026, initial_budget: 0 },
        summary: { initial_budget: 0, total_spent: 0, remaining_budget: 0, total_pending_estimated: 0, execution_rate: 0 },
        by_area: [],
        by_rubro: [],
        by_modality: [],
        by_status: []
      };
    }
  },

  // Export CSV URL
  getExportUrl: (year) => `${API_BASE}/export?year=${year}&format=csv`
};
