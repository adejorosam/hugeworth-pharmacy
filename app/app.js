(function () {
  const SESSION_KEY = 'hw_session';
  const INVENTORY_KEY = 'hw_inventory';
  const SALES_KEY = 'hw_sales';
  const ACTIVITY_KEY = 'hw_activity';
  const CUSTOMERS_KEY = 'hw_customers';
  const STAFF_KEY = 'hw_staff';
  const MANAGER_PIN = '0000';
  const BRANCHES = ['ODA Road', 'Igbatoro'];

  const ROLE_LABELS = { admin: 'Admin', pharmacist: 'Pharmacist', cashier: 'Cashier' };
  const ROLE_DESCRIPTIONS = {
    admin: 'Full access: inventory, sales, reports, staff, activity log',
    pharmacist: 'Inventory, sales, customers, reports, and their own activity',
    cashier: 'Sales / POS and their own activity only',
  };

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', href: 'dashboard.html', roles: ['admin', 'pharmacist', 'cashier'] },
    { id: 'inventory', label: 'Inventory', icon: '📦', href: 'inventory.html', roles: ['admin', 'pharmacist'] },
    { id: 'pos', label: 'Sales / POS', icon: '🧾', href: 'pos.html', roles: ['admin', 'pharmacist', 'cashier'] },
    { id: 'customers', label: 'Customers', icon: '👥', href: 'customers.html', roles: ['admin', 'pharmacist'] },
    { id: 'reports', label: 'Reports', icon: '📈', href: 'reports.html', roles: ['admin', 'pharmacist'] },
    { id: 'staff', label: 'Staff', icon: '🧑‍💼', href: 'staff.html', roles: ['admin'] },
    { id: 'activity', label: 'Activity Log', icon: '📝', href: 'activity.html', roles: ['admin', 'pharmacist', 'cashier'] },
  ];

  function getStaff() {
    return JSON.parse(localStorage.getItem(STAFF_KEY) || '[]');
  }

  function saveStaff(list) {
    localStorage.setItem(STAFF_KEY, JSON.stringify(list));
  }

  function seedStaffIfNeeded() {
    if (localStorage.getItem(STAFF_KEY)) return;
    saveStaff([
      { id: crypto.randomUUID(), name: 'Debola Aro', role: 'admin' },
      { id: crypto.randomUUID(), name: 'Chidinma Okafor', role: 'pharmacist' },
      { id: crypto.randomUUID(), name: 'Tunde Bakare', role: 'cashier' },
    ]);
  }

  function login(staffId) {
    const staff = getStaff().find((s) => s.id === staffId);
    if (!staff) return;
    const session = { id: staff.id, name: staff.name, role: staff.role, roleLabel: ROLE_LABELS[staff.role] };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    logActivity('Logged in');
    window.location.href = 'dashboard.html';
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch (e) {
      return null;
    }
  }

  function requireSession() {
    const session = getSession();
    if (!session) {
      window.location.href = 'index.html';
      return null;
    }
    return session;
  }

  function logout() {
    const session = getSession();
    if (session) logActivity('Logged out');
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
  }

  function logActivity(action) {
    const session = getSession();
    const log = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]');
    log.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      timestamp: new Date().toISOString(),
      user: session ? session.name : 'Unknown',
      role: session ? session.role : 'unknown',
      action,
    });
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(log));
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

  function renderShell(activePageId) {
    const session = requireSession();
    if (!session) return null;

    const allowed = NAV_ITEMS.filter((item) => item.roles.includes(session.role));

    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.innerHTML =
        '<div class="sidebar-brand">' +
          '<img src="../hugeworth-logo.jpeg" alt="Hugeworth Pharmacy" />' +
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
            '<div class="user-avatar">' + session.name.charAt(0) + '</div>' +
            '<div>' +
              '<div class="user-name">' + session.name + '</div>' +
              '<div class="user-role">' + session.roleLabel + '</div>' +
            '</div>' +
          '</div>' +
          '<button class="btn-logout" onclick="HW.logout()">Log Out</button>' +
        '</div>';
    }

    return session;
  }

  function seedIfNeeded() {
    if (!localStorage.getItem(INVENTORY_KEY)) localStorage.setItem(INVENTORY_KEY, JSON.stringify([]));
    if (!localStorage.getItem(SALES_KEY)) localStorage.setItem(SALES_KEY, JSON.stringify([]));
    if (!localStorage.getItem(ACTIVITY_KEY)) localStorage.setItem(ACTIVITY_KEY, JSON.stringify([]));
    if (!localStorage.getItem(CUSTOMERS_KEY)) localStorage.setItem(CUSTOMERS_KEY, JSON.stringify([]));
    seedStaffIfNeeded();
  }

  function checkManagerPin(enteredPin) {
    return enteredPin === MANAGER_PIN;
  }

  function requestManagerApproval(actionLabel) {
    const session = getSession();
    if (session && session.role === 'admin') return true;
    const pin = prompt('Manager approval required to ' + actionLabel + '.\nEnter manager PIN (demo PIN: ' + MANAGER_PIN + '):');
    if (pin === null) return false;
    if (!checkManagerPin(pin)) {
      alert('Incorrect PIN. Action cancelled.');
      return false;
    }
    return true;
  }

  seedIfNeeded();

  window.HW = {
    NAV_ITEMS,
    BRANCHES,
    MANAGER_PIN,
    ROLE_LABELS,
    ROLE_DESCRIPTIONS,
    login,
    getSession,
    requireSession,
    logout,
    logActivity,
    renderShell,
    timeAgo,
    requestManagerApproval,
    getStaff,
    saveStaff,
    keys: { SESSION_KEY, INVENTORY_KEY, SALES_KEY, ACTIVITY_KEY, CUSTOMERS_KEY, STAFF_KEY },
  };
})();
