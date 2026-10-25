(function () {
  // Change this when deploying — points at the live backend.
  const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3055' : 'https://api.hugeworthpharmacy.com';

  const TOKEN_KEY = 'hw_token';
  const STAFF_KEY = 'hw_staff';

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', href: 'dashboard.html', roles: ['admin', 'pharmacist', 'cashier'] },
    { id: 'inventory', label: 'Inventory', icon: '📦', href: 'inventory.html', roles: ['admin', 'pharmacist'] },
    { id: 'pos', label: 'Sales / POS', icon: '🧾', href: 'pos.html', roles: ['admin', 'pharmacist', 'cashier'] },
    { id: 'customers', label: 'Customers', icon: '👥', href: 'customers.html', roles: ['admin', 'pharmacist'] },
    { id: 'reports', label: 'Reports', icon: '📈', href: 'reports.html', roles: ['admin', 'pharmacist'] },
    { id: 'staff', label: 'Staff', icon: '🧑‍💼', href: 'staff.html', roles: ['admin'] },
    { id: 'activity', label: 'Activity Log', icon: '📝', href: 'activity.html', roles: ['admin', 'pharmacist', 'cashier'] },
  ];

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getStaff() {
    try {
      return JSON.parse(localStorage.getItem(STAFF_KEY));
    } catch (e) {
      return null;
    }
  }

  function saveSession(token, staff) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(STAFF_KEY);
  }

  function logout() {
    clearSession();
    window.location.href = 'index.html';
  }

  async function apiFetch(path, options) {
    options = options || {};
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    const token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;

    const res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));

    if (res.status === 401) {
      clearSession();
      window.location.href = 'index.html';
      throw new Error('Session expired');
    }

    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const body = isJson ? await res.json() : null;

    if (!res.ok) {
      const message = (body && (body.message instanceof Array ? body.message.join(', ') : body.message)) || 'Request failed';
      throw new Error(message);
    }

    return body;
  }

  async function login(email, password) {
    const result = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    saveSession(result.accessToken, result.staff);
    return result.staff;
  }

  function requireSession() {
    const staff = getStaff();
    if (!getToken() || !staff) {
      window.location.href = 'index.html';
      return null;
    }
    return staff;
  }

  function renderShell(activePageId) {
    const staff = requireSession();
    if (!staff) return null;

    const allowed = NAV_ITEMS.filter((item) => item.roles.includes(staff.role));
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.innerHTML =
        '<div class="sidebar-brand">' +
          '<img src="hugeworth-logo.jpeg" alt="Hugeworth Pharmacy" />' +
          '<span>Hugeworth PMS</span>' +
        '</div>' +
        '<nav class="sidebar-nav">' +
          allowed.map((item) =>
            '<a href="' + item.href + '" class="' + (item.id === activePageId ? 'active' : '') + '">' +
              '<span>' + item.icon + '</span> ' + item.label +
            '</a>'
          ).join('') +
        '</nav>' +
        '<div class="sidebar-footer">' +
          '<div class="user-chip">' +
            '<div class="user-avatar">' + staff.name.charAt(0) + '</div>' +
            '<div>' +
              '<div class="user-name">' + staff.name + '</div>' +
              '<div class="user-role" style="text-transform:capitalize;">' + staff.role + '</div>' +
            '</div>' +
          '</div>' +
          '<button class="btn-logout" onclick="HW.logout()">Log Out</button>' +
        '</div>';
    }

    return staff;
  }

  function promptManagerPin(staff, actionLabel) {
    if (staff.role === 'admin') return null;
    const pin = prompt('Manager approval required to ' + actionLabel + '.\nEnter an Admin\'s PIN:');
    return pin;
  }

  function timeAgo(isoString) {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return new Date(isoString).toLocaleString();
  }

  window.HW = {
    apiFetch,
    login,
    logout,
    getStaff,
    requireSession,
    renderShell,
    timeAgo,
    promptManagerPin,
  };
})();
