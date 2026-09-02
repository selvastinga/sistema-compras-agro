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

export const api = {
  // Auth & Admin Accounts
  login: async (username, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Error al iniciar sesión');
    }
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
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Sesión no válida');
    return res.json();
  },
  getAdmins: async () => {
    const res = await fetch(`${API_BASE}/auth/admins`);
    return res.json();
  },
  updateAdmins: async (admins) => {
    const res = await fetch(`${API_BASE}/auth/admins`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ admins })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Error actualizando administradores');
    return data;
  },

  // Years & Budgets
  getYears: async () => {
    const res = await fetch(`${API_BASE}/years`);
    return res.json();
  },
  createYear: async (data) => {
    const res = await fetch(`${API_BASE}/years`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || result.error || 'Error creando año');
    return result;
  },
  updateYear: async (year, data) => {
    const res = await fetch(`${API_BASE}/years/${year}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || result.error || 'Error actualizando año');
    return result;
  },
  getBudgets: async (year) => {
    const res = await fetch(`${API_BASE}/budgets?year=${year}`);
    return res.json();
  },
  updateBudgets: async (year, data) => {
    const res = await fetch(`${API_BASE}/budgets/${year}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || result.error || 'Error actualizando presupuestos');
    return result;
  },

  // Areas
  getAreas: async () => {
    const res = await fetch(`${API_BASE}/areas`);
    return res.json();
  },
  createArea: async (data) => {
    const res = await fetch(`${API_BASE}/areas`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || result.error || 'Error creando área');
    return result;
  },
  updateArea: async (id, data) => {
    const res = await fetch(`${API_BASE}/areas/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || result.error || 'Error actualizando área');
    return result;
  },
  deleteArea: async (id) => {
    const res = await fetch(`${API_BASE}/areas/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || result.error || 'Error eliminando área');
    return result;
  },

  // Rubros
  getRubros: async () => {
    const res = await fetch(`${API_BASE}/rubros`);
    return res.json();
  },
  createRubro: async (data) => {
    const res = await fetch(`${API_BASE}/rubros`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || result.error || 'Error creando rubro');
    return result;
  },
  updateRubro: async (id, data) => {
    const res = await fetch(`${API_BASE}/rubros/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || result.error || 'Error actualizando rubro');
    return result;
  },
  deleteRubro: async (id) => {
    const res = await fetch(`${API_BASE}/rubros/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || result.error || 'Error eliminando rubro');
    return result;
  },

  // Requests
  getRequests: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.year) params.append('year', filters.year);
    if (filters.area_id) params.append('area_id', filters.area_id);
    if (filters.rubro_id) params.append('rubro_id', filters.rubro_id);
    if (filters.modality) params.append('modality', filters.modality);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);

    const res = await fetch(`${API_BASE}/requests?${params.toString()}`);
    return res.json();
  },
  getRequest: async (id) => {
    const res = await fetch(`${API_BASE}/requests/${id}`);
    return res.json();
  },
  createRequest: async (data) => {
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || result.error || 'Error creando pedido');
    return result;
  },
  updateRequest: async (id, data) => {
    const res = await fetch(`${API_BASE}/requests/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || result.error || 'Error actualizando pedido');
    return result;
  },
  deleteRequest: async (id) => {
    const res = await fetch(`${API_BASE}/requests/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || result.error || 'Error eliminando pedido');
    return result;
  },

  // Purchases
  purchaseItem: async (requestId, itemId, data) => {
    const res = await fetch(`${API_BASE}/requests/${requestId}/items/${itemId}/purchase`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || result.error || 'Error registrando compra');
    return result;
  },
  purchaseAllItems: async (requestId, data) => {
    const res = await fetch(`${API_BASE}/requests/${requestId}/purchase-all`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || result.error || 'Error registrando compra completa');
    return result;
  },

  // Stats
  getStats: async (year) => {
    const res = await fetch(`${API_BASE}/stats?year=${year}`);
    return res.json();
  },

  // Export CSV URL
  getExportUrl: (year) => `${API_BASE}/export?year=${year}&format=csv`
};
