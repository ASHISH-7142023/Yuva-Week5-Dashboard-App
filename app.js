/**
 * OmniTrack Cloud Operations & Analytics Dashboard — Application Controller (app.js)
 * ----------------------------------------------------------------------------------
 * Pure Vanilla ES6+ Model-View-Controller (MVC) architecture.
 * Implements asynchronous data ingestion, dynamic multi-column sorting,
 * reactive search & filtering, custom responsive SVG chart engine,
 * accessible modal focus trapping (WCAG 2.1 AA), and light/dark theme toggling.
 *
 * @author Ashish Ranjan Singh (Yuva Intern: Junior Frontend Developer)
 * @week Week 5: Final Project Integration – Mini Web Application
 */

'use strict';

(function () {
  // =========================================================================
  // 1. STATE STORE (Single Source of Truth)
  // =========================================================================
  const state = {
    dataset: null,
    filteredServices: [],
    activeMetricChannel: 'requests', // 'requests' | 'latency' | 'cpu'
    filters: {
      search: '',
      category: 'all',
      region: 'all',
      status: 'all'
    },
    sort: {
      column: 'name',
      order: 'asc' // 'asc' | 'desc'
    },
    pagination: {
      currentPage: 1,
      pageSize: 8
    },
    selectedService: null,
    lastFocusedTrigger: null,
    isModalOpen: false,
    theme: localStorage.getItem('omnitrack-theme') || 'dark'
  };

  // DOM Selectors Cache
  const DOM = {
    body: document.body,
    globalSearch: document.getElementById('global-search'),
    tableSearchInput: document.getElementById('table-search-input'),
    filterCategory: document.getElementById('filter-category'),
    filterRegion: document.getElementById('filter-region'),
    filterStatus: document.getElementById('filter-status'),
    btnResetFilters: document.getElementById('btn-reset-filters'),
    servicesTbody: document.getElementById('services-tbody'),
    resultsCount: document.getElementById('results-count'),
    pageSizeSelect: document.getElementById('page-size-select'),
    btnPagePrev: document.getElementById('btn-page-prev'),
    btnPageNext: document.getElementById('btn-page-next'),
    paginationPages: document.getElementById('pagination-pages'),
    sortButtons: document.querySelectorAll('.th-sort-btn'),
    chartTabs: document.querySelectorAll('.btn-chart-tab'),
    svgLine: document.getElementById('svg-chart-line'),
    svgArea: document.getElementById('svg-chart-area'),
    svgPoints: document.getElementById('svg-chart-points'),
    svgXAxis: document.getElementById('svg-x-axis'),
    chartTooltip: document.getElementById('chart-tooltip'),
    serviceModal: document.getElementById('service-modal'),
    modalTitle: document.getElementById('modal-service-title'),
    modalStatusBadge: document.getElementById('modal-service-status-badge'),
    modalBody: document.getElementById('modal-service-body'),
    btnModalClose: document.getElementById('btn-modal-close'),
    btnModalDismiss: document.getElementById('btn-modal-dismiss'),
    btnModalActionRestart: document.getElementById('btn-modal-action-restart'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    iconThemeSun: document.getElementById('icon-theme-sun'),
    btnHamburger: document.getElementById('btn-hamburger'),
    btnSidebarClose: document.getElementById('btn-sidebar-close'),
    sidebar: document.getElementById('dashboard-sidebar'),
    sidebarBackdrop: document.getElementById('sidebar-backdrop'),
    a11yAnnouncer: document.getElementById('a11y-announcer'),
    toastContainer: document.getElementById('toast-container'),
    btnRefreshData: document.getElementById('btn-refresh-data'),
    kpiRevenue: document.getElementById('kpi-revenue'),
    kpiRevenueTrend: document.getElementById('kpi-revenue-trend'),
    kpiNodes: document.getElementById('kpi-nodes'),
    kpiNodesTrend: document.getElementById('kpi-nodes-trend'),
    kpiIncidents: document.getElementById('kpi-incidents'),
    kpiIncidentsTrend: document.getElementById('kpi-incidents-trend'),
    kpiEfficiency: document.getElementById('kpi-efficiency'),
    kpiEfficiencyTrend: document.getElementById('kpi-efficiency-trend'),
    navActiveCount: document.getElementById('nav-active-count'),
    headerClusterId: document.getElementById('header-cluster-id')
  };

  // =========================================================================
  // 2. DATA INGESTION & PIPELINE (Fetch data.json)
  // =========================================================================
  async function loadTelemetryDataset() {
    try {
      announceA11y('Loading real-time cloud operations telemetry...');
      const response = await fetch('data.json');
      if (!response.ok) {
        throw new Error(`HTTP network error: status ${response.status}`);
      }
      const data = await response.json();
      state.dataset = data;
      renderKPIs(data);
      applyFilterAndSort();
      renderSVGChart();
      announceA11y(`Telemetry synchronized successfully. 24 services active.`);
      showToast('Cloud cluster telemetry synchronized with edge nodes.', 'info');
    } catch (err) {
      console.error('[OmniTrack] Failed to fetch data.json:', err);
      showToast('Error loading live telemetry. Retrying connection...', 'error');
    }
  }

  // =========================================================================
  // 3. EXECUTIVE KPI CARDS RENDERER
  // =========================================================================
  function renderKPIs(data) {
    if (!data) return;
    const { metrics, summary } = data;

    if (DOM.kpiRevenue && metrics.totalRevenueInr) DOM.kpiRevenue.textContent = metrics.totalRevenueInr;
    if (DOM.kpiRevenueTrend && metrics.totalRevenueTrend) DOM.kpiRevenueTrend.textContent = metrics.totalRevenueTrend;

    if (DOM.kpiNodes && metrics.activeNodesCount) DOM.kpiNodes.textContent = `${metrics.activeNodesCount} Nodes`;
    if (DOM.kpiNodesTrend && metrics.activeNodesTrend) DOM.kpiNodesTrend.textContent = metrics.activeNodesTrend;

    if (DOM.kpiIncidents && metrics.criticalIncidents !== undefined) {
      DOM.kpiIncidents.textContent = `${metrics.criticalIncidents} Critical`;
      DOM.kpiIncidents.className = metrics.criticalIncidents > 0 ? 'kpi-value text-amber' : 'kpi-value text-emerald';
    }
    if (DOM.kpiIncidentsTrend && metrics.criticalIncidentsTrend) DOM.kpiIncidentsTrend.textContent = metrics.criticalIncidentsTrend;

    if (DOM.kpiEfficiency && metrics.systemEfficiency) DOM.kpiEfficiency.textContent = metrics.systemEfficiency;
    if (DOM.kpiEfficiencyTrend && metrics.systemEfficiencyTrend) DOM.kpiEfficiencyTrend.textContent = metrics.systemEfficiencyTrend;

    if (DOM.headerClusterId && summary.clusterId) DOM.headerClusterId.textContent = summary.clusterId;
  }

  // =========================================================================
  // 4. CUSTOM ZERO-DEPENDENCY SVG CHART ENGINE
  // =========================================================================
  function renderSVGChart() {
    if (!state.dataset || !state.dataset.chartData || !DOM.svgLine) return;

    const timeSeries = state.dataset.chartData.timeSeries;
    const channel = state.activeMetricChannel;

    // Dimensions in SVG coordinate space
    const width = 1000;
    const height = 320;
    const padLeft = 60;
    const padRight = 40;
    const padTop = 40;
    const padBottom = 50;

    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    // Extract values based on active metric channel
    const values = timeSeries.map((d) => d[channel]);
    const maxVal = Math.max(...values) * 1.15; // 15% ceiling headroom
    const minVal = 0;

    // Channel metadata
    const channelConfigs = {
      requests: {
        color: '#6366f1',
        gradientId: 'url(#chartGradientRequests)',
        unit: 'req/s',
        format: (v) => `${(v / 1000).toFixed(1)}k req/s`
      },
      latency: {
        color: '#06b6d4',
        gradientId: 'url(#chartGradientLatency)',
        unit: 'ms',
        format: (v) => `${v} ms`
      },
      cpu: {
        color: '#10b981',
        gradientId: 'url(#chartGradientCpu)',
        unit: '%',
        format: (v) => `${v}% CPU`
      }
    };
    const config = channelConfigs[channel];

    // Compute coordinate points (x, y)
    const points = timeSeries.map((d, index) => {
      const x = padLeft + (index / (timeSeries.length - 1)) * plotWidth;
      const normalizedY = (d[channel] - minVal) / (maxVal - minVal);
      const y = height - padBottom - normalizedY * plotHeight;
      return { x, y, hour: d.hour, val: d[channel] };
    });

    // Build smooth cubic bezier curve
    function buildSmoothPath(pts) {
      if (pts.length === 0) return '';
      let path = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = i > 0 ? pts[i - 1] : pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
      return path;
    }

    const linePath = buildSmoothPath(points);
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padBottom} L ${points[0].x} ${height - padBottom} Z`;

    // Apply paths and colors
    DOM.svgLine.setAttribute('d', linePath);
    DOM.svgLine.setAttribute('stroke', config.color);

    DOM.svgArea.setAttribute('d', areaPath);
    DOM.svgArea.setAttribute('fill', config.gradientId);

    // Render interactive data circles and X-axis labels
    if (DOM.svgPoints) {
      let circlesHtml = '';
      let xLabelsHtml = '';

      points.forEach((pt) => {
        circlesHtml += `
          <circle 
            class="chart-point-circle" 
            cx="${pt.x}" 
            cy="${pt.y}" 
            r="4.5" 
            fill="${config.color}" 
            stroke="#ffffff" 
            stroke-width="2"
            tabindex="0"
            role="button"
            aria-label="Time ${pt.hour}: ${config.format(pt.val)}"
            data-hour="${pt.hour}"
            data-val="${config.format(pt.val)}"
            data-x="${pt.x}"
            data-y="${pt.y}"
          />
        `;

        xLabelsHtml += `
          <text class="chart-axis-label" x="${pt.x}" y="${height - 20}">
            ${pt.hour}
          </text>
        `;
      });

      DOM.svgPoints.innerHTML = circlesHtml;
      if (DOM.svgXAxis) DOM.svgXAxis.innerHTML = xLabelsHtml;

      // Attach tooltip listeners to point circles
      DOM.svgPoints.querySelectorAll('.chart-point-circle').forEach((circle) => {
        circle.addEventListener('mouseenter', handlePointHover);
        circle.addEventListener('focus', handlePointHover);
        circle.addEventListener('mouseleave', hideChartTooltip);
        circle.addEventListener('blur', hideChartTooltip);
      });
    }
  }

  function handlePointHover(e) {
    const circle = e.target;
    const hour = circle.getAttribute('data-hour');
    const val = circle.getAttribute('data-val');
    const x = parseFloat(circle.getAttribute('data-x'));
    const y = parseFloat(circle.getAttribute('data-y'));

    if (DOM.chartTooltip) {
      DOM.chartTooltip.innerHTML = `<strong>${hour}</strong> &bull; <span class="text-cyan">${val}</span>`;
      
      // Calculate percentage inside container
      const percentX = (x / 1000) * 100;
      const percentY = (y / 320) * 100;

      DOM.chartTooltip.style.left = `${percentX}%`;
      DOM.chartTooltip.style.top = `${percentY}%`;
      DOM.chartTooltip.classList.add('is-active');
      DOM.chartTooltip.setAttribute('aria-hidden', 'false');
    }
  }

  function hideChartTooltip() {
    if (DOM.chartTooltip) {
      DOM.chartTooltip.classList.remove('is-active');
      DOM.chartTooltip.setAttribute('aria-hidden', 'true');
    }
  }

  // =========================================================================
  // 5. REACTIVE FILTER & MULTI-COLUMN SORT ENGINE
  // =========================================================================
  function applyFilterAndSort() {
    if (!state.dataset || !state.dataset.services) return;

    let services = [...state.dataset.services];

    // 1. Text Search Filter
    const query = state.filters.search.toLowerCase().trim();
    if (query) {
      services = services.filter((s) => {
        return (
          s.name.toLowerCase().includes(query) ||
          s.id.toLowerCase().includes(query) ||
          s.category.toLowerCase().includes(query) ||
          s.region.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query)
        );
      });
    }

    // 2. Category Dropdown Filter
    if (state.filters.category !== 'all') {
      services = services.filter((s) => s.category === state.filters.category);
    }

    // 3. Region Dropdown Filter
    if (state.filters.region !== 'all') {
      services = services.filter((s) => s.region === state.filters.region);
    }

    // 4. Status Dropdown Filter
    if (state.filters.status !== 'all') {
      services = services.filter((s) => s.status === state.filters.status);
    }

    // 5. Multi-Column Sort
    const { column, order } = state.sort;
    services.sort((a, b) => {
      let valA = a[column];
      let valB = b[column];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
        return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return order === 'asc' ? valA - valB : valB - valA;
      }
    });

    state.filteredServices = services;

    // Reset pagination to page 1 if current page exceeds total pages
    const totalPages = Math.ceil(services.length / state.pagination.pageSize) || 1;
    if (state.pagination.currentPage > totalPages) {
      state.pagination.currentPage = 1;
    }

    renderTable();
    renderPagination();
    updateSortIcons();
  }

  // =========================================================================
  // 6. ACCESSIBLE TABLE RENDERER
  // =========================================================================
  function renderTable() {
    if (!DOM.servicesTbody) return;

    const { currentPage, pageSize } = state.pagination;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageItems = state.filteredServices.slice(startIndex, endIndex);

    // Update Counter
    if (DOM.resultsCount) {
      DOM.resultsCount.textContent = `Showing ${state.filteredServices.length} of ${state.dataset.services.length} services`;
    }
    if (DOM.navActiveCount) {
      DOM.navActiveCount.textContent = state.filteredServices.length;
    }

    if (pageItems.length === 0) {
      DOM.servicesTbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted);">
            <div style="font-size: 1.8rem; margin-bottom: 0.5rem;" aria-hidden="true">🔍</div>
            <p><strong>No services found matching active filters.</strong></p>
            <p style="font-size: 0.85rem; margin-top: 0.25rem;">Try adjusting your keyword query or resetting the category dropdowns.</p>
          </td>
        </tr>
      `;
      return;
    }

    let rowsHtml = '';
    pageItems.forEach((srv) => {
      const statusClass =
        srv.status === 'healthy'
          ? 'status-pill-healthy'
          : srv.status === 'warning'
          ? 'status-pill-warning'
          : 'status-pill-critical';

      // CPU Bar Color
      const cpuColor =
        srv.cpuUtilization > 85
          ? 'var(--accent-red)'
          : srv.cpuUtilization > 65
          ? 'var(--accent-amber)'
          : 'var(--accent-emerald)';

      rowsHtml += `
        <tr data-service-id="${srv.id}">
          <td>
            <div class="service-name-cell">
              <span class="service-title">${srv.name}</span>
              <span class="service-id">${srv.id} &bull; ${srv.deployedVersion}</span>
            </div>
          </td>
          <td>
            <span class="badge-tag" style="margin-bottom: 0;">${srv.category}</span>
          </td>
          <td>
            <span style="color: var(--text-muted); font-size: 0.85rem;">${srv.region}</span>
          </td>
          <td>
            <span class="status-pill ${statusClass}">
              <span class="pill-dot" aria-hidden="true"></span>
              <span>${srv.status}</span>
            </span>
          </td>
          <td>
            <strong class="${srv.latencyMs > 100 ? 'text-amber' : 'text-main'}">${srv.latencyMs} ms</strong>
          </td>
          <td>
            <div class="table-bar-cell">
              <div class="table-bar-track" aria-hidden="true">
                <div class="table-bar-fill" style="width: ${srv.cpuUtilization}%; background-color: ${cpuColor};"></div>
              </div>
              <span class="table-bar-text">${srv.cpuUtilization}%</span>
            </div>
          </td>
          <td>
            <span style="font-weight: 600;">${(srv.requestsPerSec / 1000).toFixed(1)}k/s</span>
          </td>
          <td class="th-action-col">
            <button type="button" class="btn btn-secondary btn-sm btn-inspect-service" data-id="${srv.id}" aria-label="Inspect details for ${srv.name}">
              Inspect
            </button>
          </td>
        </tr>
      `;
    });

    DOM.servicesTbody.innerHTML = rowsHtml;

    // Attach inspect listeners
    DOM.servicesTbody.querySelectorAll('.btn-inspect-service').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const srvId = btn.getAttribute('data-id');
        openServiceModal(srvId, btn);
      });
    });
  }

  // =========================================================================
  // 7. PAGINATION CONTROLS
  // =========================================================================
  function renderPagination() {
    if (!DOM.paginationPages || !DOM.btnPagePrev || !DOM.btnPageNext) return;

    const totalPages = Math.ceil(state.filteredServices.length / state.pagination.pageSize) || 1;
    const current = state.pagination.currentPage;

    DOM.btnPagePrev.disabled = current <= 1;
    DOM.btnPageNext.disabled = current >= totalPages;

    let pagesHtml = '';
    for (let p = 1; p <= totalPages; p++) {
      const activeClass = p === current ? 'is-active' : '';
      pagesHtml += `
        <button 
          type="button" 
          class="btn-page-num ${activeClass}" 
          data-page="${p}" 
          aria-label="Page ${p}" 
          aria-current="${p === current ? 'page' : 'false'}"
        >
          ${p}
        </button>
      `;
    }

    DOM.paginationPages.innerHTML = pagesHtml;

    // Attach click listeners to number buttons
    DOM.paginationPages.querySelectorAll('.btn-page-num').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pageNum = parseInt(btn.getAttribute('data-page'), 10);
        state.pagination.currentPage = pageNum;
        renderTable();
        renderPagination();
        announceA11y(`Navigated to page ${pageNum}`);
      });
    });
  }

  // =========================================================================
  // 8. SORT HEADER VISUAL INDICATORS
  // =========================================================================
  function updateSortIcons() {
    DOM.sortButtons.forEach((btn) => {
      const col = btn.getAttribute('data-sort');
      const icon = btn.querySelector('.sort-icon');
      if (col === state.sort.column) {
        btn.setAttribute('aria-sort', state.sort.order === 'asc' ? 'ascending' : 'descending');
        if (icon) icon.textContent = state.sort.order === 'asc' ? '↑' : '↓';
      } else {
        btn.setAttribute('aria-sort', 'none');
        if (icon) icon.textContent = '↕';
      }
    });
  }

  // =========================================================================
  // 9. ACCESSIBLE MODAL RECORD INSPECTOR (Focus Trap & Keyboard Loop)
  // =========================================================================
  function openServiceModal(serviceId, triggerEl) {
    if (!state.dataset) return;
    const service = state.dataset.services.find((s) => s.id === serviceId);
    if (!service || !DOM.serviceModal) return;

    state.selectedService = service;
    state.lastFocusedTrigger = triggerEl;
    state.isModalOpen = true;

    if (DOM.modalTitle) DOM.modalTitle.textContent = service.name;

    if (DOM.modalStatusBadge) {
      DOM.modalStatusBadge.textContent = service.status.toUpperCase();
      DOM.modalStatusBadge.className =
        service.status === 'healthy'
          ? 'modal-status-badge status-pill-healthy'
          : service.status === 'warning'
          ? 'modal-status-badge status-pill-warning'
          : 'modal-status-badge status-pill-critical';
    }

    if (DOM.modalBody) {
      DOM.modalBody.innerHTML = `
        <div class="modal-spec-grid">
          <div class="modal-spec-card">
            <span class="modal-spec-label">Service ID</span>
            <span class="modal-spec-val font-mono">${service.id}</span>
          </div>
          <div class="modal-spec-card">
            <span class="modal-spec-label">Category</span>
            <span class="modal-spec-val text-cyan">${service.category}</span>
          </div>
          <div class="modal-spec-card">
            <span class="modal-spec-label">Region</span>
            <span class="modal-spec-val">${service.region}</span>
          </div>
          <div class="modal-spec-card">
            <span class="modal-spec-label">Deployed Version</span>
            <span class="modal-spec-val">${service.deployedVersion}</span>
          </div>
          <div class="modal-spec-card">
            <span class="modal-spec-label">Latency SLA</span>
            <span class="modal-spec-val ${service.latencyMs > 100 ? 'text-amber' : 'text-emerald'}">${service.latencyMs} ms</span>
          </div>
          <div class="modal-spec-card">
            <span class="modal-spec-label">Uptime</span>
            <span class="modal-spec-val text-emerald">${service.uptimePercent}%</span>
          </div>
          <div class="modal-spec-card">
            <span class="modal-spec-label">Active Nodes</span>
            <span class="modal-spec-val">${service.activeNodes} Nodes</span>
          </div>
          <div class="modal-spec-card">
            <span class="modal-spec-label">Daily Cost</span>
            <span class="modal-spec-val text-cyan">${service.costPerDayInr}</span>
          </div>
        </div>

        <div class="modal-desc-box">
          <strong>Architecture Role:</strong>
          <p style="margin-top: 0.35rem;">${service.description}</p>
          <p style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-dim);">
            <strong>Incident Log:</strong> ${service.lastIncident}
          </p>
        </div>
      `;
    }

    DOM.serviceModal.classList.add('is-active');
    DOM.serviceModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus close button
    setTimeout(() => {
      if (DOM.btnModalClose) DOM.btnModalClose.focus();
    }, 50);

    announceA11y(`Opened inspection dialog for ${service.name}`);
  }

  function closeServiceModal() {
    if (!DOM.serviceModal || !state.isModalOpen) return;

    DOM.serviceModal.classList.remove('is-active');
    DOM.serviceModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    state.isModalOpen = false;

    // Restore focus
    if (state.lastFocusedTrigger && typeof state.lastFocusedTrigger.focus === 'function') {
      state.lastFocusedTrigger.focus();
    }
  }

  function handleModalKeyDown(e) {
    if (!state.isModalOpen || !DOM.serviceModal) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeServiceModal();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = DOM.serviceModal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
  }

  // =========================================================================
  // 10. THEME SWITCHER (Dark & Light)
  // =========================================================================
  function applyTheme(theme) {
    state.theme = theme;
    DOM.body.setAttribute('data-theme', theme);
    localStorage.setItem('omnitrack-theme', theme);
    announceA11y(`Switched to ${theme} theme mode`);
  }

  // =========================================================================
  // 11. MOBILE SIDEBAR NAVIGATION DRAWER
  // =========================================================================
  function toggleMobileSidebar(open) {
    if (!DOM.sidebar) return;
    const isOpen = open !== undefined ? open : !DOM.sidebar.classList.contains('is-open');

    DOM.sidebar.classList.toggle('is-open', isOpen);
    if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.toggle('is-open', isOpen);
    if (DOM.btnHamburger) DOM.btnHamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (DOM.btnSidebarClose) DOM.btnSidebarClose.focus();
    } else {
      document.body.style.overflow = '';
      if (DOM.btnHamburger) DOM.btnHamburger.focus();
    }
  }

  // =========================================================================
  // 12. UTILITIES: TOAST & A11Y ANNOUNCER
  // =========================================================================
  function announceA11y(message) {
    if (DOM.a11yAnnouncer) {
      DOM.a11yAnnouncer.textContent = message;
    }
  }

  function showToast(message, type = 'info') {
    if (!DOM.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');

    const icon = type === 'error' ? '⚠️' : '✅';
    toast.innerHTML = `<span aria-hidden="true">${icon}</span><span>${message}</span>`;

    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      toast.style.transition = 'all 250ms ease';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // =========================================================================
  // 13. EVENT BINDING & BOOTSTRAP
  // =========================================================================
  function initEvents() {
    // 1. Table Search (Debounced)
    const debouncedSearch = debounce((query) => {
      state.filters.search = query;
      state.pagination.currentPage = 1;
      applyFilterAndSort();
      announceA11y(`Search filtered to ${state.filteredServices.length} services.`);
    }, 180);

    if (DOM.tableSearchInput) {
      DOM.tableSearchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));
    }

    if (DOM.globalSearch) {
      DOM.globalSearch.addEventListener('input', (e) => {
        if (DOM.tableSearchInput) DOM.tableSearchInput.value = e.target.value;
        debouncedSearch(e.target.value);
      });
    }

    // 2. Dropdown Filters
    if (DOM.filterCategory) {
      DOM.filterCategory.addEventListener('change', (e) => {
        state.filters.category = e.target.value;
        state.pagination.currentPage = 1;
        applyFilterAndSort();
      });
    }

    if (DOM.filterRegion) {
      DOM.filterRegion.addEventListener('change', (e) => {
        state.filters.region = e.target.value;
        state.pagination.currentPage = 1;
        applyFilterAndSort();
      });
    }

    if (DOM.filterStatus) {
      DOM.filterStatus.addEventListener('change', (e) => {
        state.filters.status = e.target.value;
        state.pagination.currentPage = 1;
        applyFilterAndSort();
      });
    }

    // 3. Reset Filters
    if (DOM.btnResetFilters) {
      DOM.btnResetFilters.addEventListener('click', () => {
        state.filters = { search: '', category: 'all', region: 'all', status: 'all' };
        if (DOM.tableSearchInput) DOM.tableSearchInput.value = '';
        if (DOM.globalSearch) DOM.globalSearch.value = '';
        if (DOM.filterCategory) DOM.filterCategory.value = 'all';
        if (DOM.filterRegion) DOM.filterRegion.value = 'all';
        if (DOM.filterStatus) DOM.filterStatus.value = 'all';
        state.pagination.currentPage = 1;
        applyFilterAndSort();
        showToast('All filters have been reset.', 'info');
      });
    }

    // 4. Multi-Column Sort Headers
    DOM.sortButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const col = btn.getAttribute('data-sort');
        if (state.sort.column === col) {
          state.sort.order = state.sort.order === 'asc' ? 'desc' : 'asc';
        } else {
          state.sort.column = col;
          state.sort.order = 'asc';
        }
        applyFilterAndSort();
        announceA11y(`Sorted table by ${col} in ${state.sort.order}ending order`);
      });
    });

    // 5. Pagination Buttons
    if (DOM.btnPagePrev) {
      DOM.btnPagePrev.addEventListener('click', () => {
        if (state.pagination.currentPage > 1) {
          state.pagination.currentPage--;
          renderTable();
          renderPagination();
        }
      });
    }

    if (DOM.btnPageNext) {
      DOM.btnPageNext.addEventListener('click', () => {
        const totalPages = Math.ceil(state.filteredServices.length / state.pagination.pageSize);
        if (state.pagination.currentPage < totalPages) {
          state.pagination.currentPage++;
          renderTable();
          renderPagination();
        }
      });
    }

    if (DOM.pageSizeSelect) {
      DOM.pageSizeSelect.addEventListener('change', (e) => {
        state.pagination.pageSize = parseInt(e.target.value, 10);
        state.pagination.currentPage = 1;
        renderTable();
        renderPagination();
      });
    }

    // 6. SVG Chart Metric Channel Tabs
    DOM.chartTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const metric = tab.getAttribute('data-metric');
        state.activeMetricChannel = metric;

        DOM.chartTabs.forEach((t) => {
          const match = t === tab;
          t.classList.toggle('is-active', match);
          t.setAttribute('aria-pressed', match ? 'true' : 'false');
        });

        renderSVGChart();
        announceA11y(`Telemetry chart switched to ${metric} channel`);
      });
    });

    // 7. Modal Dismiss Actions
    if (DOM.btnModalClose) DOM.btnModalClose.addEventListener('click', closeServiceModal);
    if (DOM.btnModalDismiss) DOM.btnModalDismiss.addEventListener('click', closeServiceModal);
    if (DOM.serviceModal) {
      DOM.serviceModal.addEventListener('click', (e) => {
        if (e.target === DOM.serviceModal) closeServiceModal();
      });
    }
    document.addEventListener('keydown', handleModalKeyDown);

    // Modal action: Reboot Service Node
    if (DOM.btnModalActionRestart) {
      DOM.btnModalActionRestart.addEventListener('click', () => {
        if (!state.selectedService) return;
        showToast(`Gracefully rebooting node ${state.selectedService.id}...`, 'info');
        closeServiceModal();
      });
    }

    // 8. Theme Switcher
    if (DOM.btnThemeToggle) {
      DOM.btnThemeToggle.addEventListener('click', () => {
        const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
      });
    }

    // 9. Mobile Sidebar Navigation
    if (DOM.btnHamburger) {
      DOM.btnHamburger.addEventListener('click', () => toggleMobileSidebar(true));
    }
    if (DOM.btnSidebarClose) {
      DOM.btnSidebarClose.addEventListener('click', () => toggleMobileSidebar(false));
    }
    if (DOM.sidebarBackdrop) {
      DOM.sidebarBackdrop.addEventListener('click', () => toggleMobileSidebar(false));
    }

    // 10. Sync Data Button
    if (DOM.btnRefreshData) {
      DOM.btnRefreshData.addEventListener('click', () => {
        loadTelemetryDataset();
      });
    }
  }

  // Boot Application
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(state.theme);
    initEvents();
    loadTelemetryDataset();
  });

  console.log(
    '%c⚡ OmniTrack Cloud Operations Dashboard Online %c| Vanilla ES6+ MVC Architecture',
    'background: #6366f1; color: #ffffff; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
    'color: #06b6d4; font-weight: bold;'
  );
})();
