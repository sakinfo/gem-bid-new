/**
 * GeM Maharashtra Pulse - City-Wise Ingestion & Analytics Controller
 */

// Application State
const state = {
  allBids: [],
  filteredBids: [],
  selectedCity: 'All',
  trackedBidIds: new Set(JSON.parse(localStorage.getItem('gem_tracked_bids') || '[]')),
  currentTab: 'all', // 'all', 'urgent', 'tracked', 'analytics'
  currentView: 'card', // 'card', 'table'
  isLoading: false,
  activeBid: null,
  schedules: {}
};

// DOM Elements
const elements = {
  bidsGrid: document.getElementById('bidsGrid'),
  bidsTableWrap: document.getElementById('bidsTableWrap'),
  bidsTableBody: document.getElementById('bidsTableBody'),
  loadingState: document.getElementById('loadingState'),
  emptyState: document.getElementById('emptyState'),
  emptyStateTitle: document.getElementById('emptyStateTitle'),
  emptyStateDesc: document.getElementById('emptyStateDesc'),
  analyticsView: document.getElementById('analyticsView'),
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  cityFilter: document.getElementById('cityFilter'),
  categoryFilter: document.getElementById('categoryFilter'),
  ministryFilter: document.getElementById('ministryFilter'),
  bidTypeFilter: document.getElementById('bidTypeFilter'),
  sortBy: document.getElementById('sortBy'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
  syncBtn: document.getElementById('syncBtn'),
  syncIcon: document.getElementById('syncIcon'),
  syncBtnText: document.getElementById('syncBtnText'),
  lastSyncTime: document.getElementById('lastSyncTime'),
  liveStatusText: document.getElementById('liveStatusText'),
  nashikNextSync: document.getElementById('nashikNextSync'),
  themeToggle: document.getElementById('themeToggle'),
  themeIcon: document.getElementById('themeIcon'),
  exportBtn: document.getElementById('exportBtn'),
  exportDropdown: document.getElementById('exportDropdown'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  viewCardBtn: document.getElementById('viewCardBtn'),
  viewTableBtn: document.getElementById('viewTableBtn'),
  cityPills: document.querySelectorAll('.city-pill'),
  // Schedule Modal
  scheduleBtn: document.getElementById('scheduleBtn'),
  scheduleModal: document.getElementById('scheduleModal'),
  closeScheduleModalBtn: document.getElementById('closeScheduleModalBtn'),
  scheduleCitySelect: document.getElementById('scheduleCitySelect'),
  scheduleIntervalSelect: document.getElementById('scheduleIntervalSelect'),
  saveScheduleBtn: document.getElementById('saveScheduleBtn'),
  schedulesTableContainer: document.getElementById('schedulesTableContainer'),
  syncLogsContainer: document.getElementById('syncLogsContainer'),
  // KPIs
  kpiTotalOnPortal: document.getElementById('kpiTotalOnPortal'),
  kpiTotalBids: document.getElementById('kpiTotalBids'),
  kpiUrgentBids: document.getElementById('kpiUrgentBids'),
  kpiHighValue: document.getElementById('kpiHighValue'),
  kpiCityLabel: document.getElementById('kpiCityLabel'),
  allCount: document.getElementById('allCount'),
  urgentCount: document.getElementById('urgentCount'),
  trackedCount: document.getElementById('trackedCount'),
  // Bid Modal
  bidModal: document.getElementById('bidModal'),
  modalBidNo: document.getElementById('modalBidNo'),
  modalStatus: document.getElementById('modalStatus'),
  modalBody: document.getElementById('modalBody'),
  modalDocLink: document.getElementById('modalDocLink'),
  modalTrackBtn: document.getElementById('modalTrackBtn'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  // Toast
  toast: document.getElementById('toast'),
  toastMsg: document.getElementById('toastMsg')
};

// =========================================================
// Initialization
// =========================================================
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupEventListeners();
  await refreshPortalData();
  await loadSchedules();
  startCountdownTicker();
  startScheduleTicker();
});

async function refreshPortalData() {
  await loadBids();
  await loadStats();
}

// =========================================================
// Fetch & Load Real Live Maharashtra GeM Data
// =========================================================
async function loadBids() {
  state.isLoading = true;
  updateLoadingView();

  try {
    const res = await fetch('/api/bids');
    const result = await res.json();

    if (result && result.success && Array.isArray(result.data)) {
      state.allBids = result.data;
      if (result.lastSync) {
        updateLastSyncDisplay(result.lastSync);
      }
      applyFilters();
    }
  } catch (err) {
    console.error('Error fetching Maharashtra bids:', err);
    showToast('Failed to connect to backend server', true);
  } finally {
    state.isLoading = false;
    updateLoadingView();
  }
}

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const result = await res.json();
    if (result && result.success && result.stats) {
      const stats = result.stats;
      if (elements.kpiTotalOnPortal) {
        elements.kpiTotalOnPortal.textContent = `${(stats.totalFoundOnGeM || 4634).toLocaleString('en-IN')}`;
      }
      if (elements.kpiUrgentBids) {
        elements.kpiUrgentBids.textContent = stats.urgentClosingCount || 0;
      }
      if (elements.kpiHighValue) {
        elements.kpiHighValue.textContent = stats.highValueCount || 0;
      }
      if (stats.schedules) {
        state.schedules = stats.schedules;
        updateScheduleDisplay();
      }
      renderAnalytics(stats);
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

// =========================================================
// Schedules & Frequency Management
// =========================================================
async function loadSchedules() {
  try {
    const res = await fetch('/api/sync/schedules');
    const result = await res.json();
    if (result && result.success) {
      state.schedules = result.schedules || {};
      renderSchedulesList(result.schedules || {});
      renderSyncLogs(result.logs || []);
      updateScheduleDisplay();
    }
  } catch (err) {
    console.error('Error loading schedules:', err);
  }
}

async function saveCitySchedule() {
  const city = elements.scheduleCitySelect.value;
  const interval = parseInt(elements.scheduleIntervalSelect.value, 10) || 5;

  try {
    const res = await fetch('/api/sync/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city, intervalMinutes: interval, enabled: true })
    });
    const result = await res.json();
    if (result && result.success) {
      showToast(`⚙️ Auto-Sync for ${city} configured to every ${interval} minutes!`);
      await loadSchedules();
      updateScheduleDisplay();
    }
  } catch (err) {
    showToast('Failed to update schedule config', true);
  }
}

function renderSchedulesList(schedules) {
  if (!elements.schedulesTableContainer) return;

  elements.schedulesTableContainer.innerHTML = Object.entries(schedules).map(([cityKey, config]) => {
    const nextMs = new Date(config.nextSync).getTime() - Date.now();
    const nextMins = Math.max(0, Math.ceil(nextMs / 60000));
    return `
      <div class="schedule-row-item">
        <div class="schedule-row-left">
          <i class="fa-solid fa-city" style="color: var(--accent-orange);"></i>
          <div>
            <span class="schedule-city-name">${cityKey}</span>
            <small style="display: block; color: var(--text-muted); font-size: 0.72rem;">Last Synced: ${new Date(config.lastSync).toLocaleTimeString()}</small>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <span class="schedule-freq-tag">Every ${config.intervalMinutes} min</span>
          <span style="font-size: 0.74rem; color: var(--accent-emerald); font-family: 'JetBrains Mono', monospace;">Next: in ${nextMins}m</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderSyncLogs(logs) {
  if (!elements.syncLogsContainer) return;
  if (logs.length === 0) {
    elements.syncLogsContainer.innerHTML = '<div style="color: var(--text-muted);">No sync events recorded yet.</div>';
    return;
  }

  elements.syncLogsContainer.innerHTML = logs.map(l => `
    <div class="log-entry ${l.status === 'SUCCESS' ? 'success' : 'warning'}">
      <span>[${new Date(l.timestamp).toLocaleTimeString()}]</span>
      <strong>${l.city}:</strong>
      <span>${l.message}</span>
    </div>
  `).join('');
}

function updateScheduleDisplay() {
  const nashikConfig = state.schedules?.NASHIK;
  if (nashikConfig && elements.nashikNextSync) {
    const diffMs = new Date(nashikConfig.nextSync).getTime() - Date.now();
    const remainingSecs = Math.max(0, Math.floor(diffMs / 1000));
    const mins = Math.floor(remainingSecs / 60);
    const secs = remainingSecs % 60;
    elements.nashikNextSync.textContent = `Every ${nashikConfig.intervalMinutes}m (${mins}m ${secs}s)`;
  }
}

function startScheduleTicker() {
  setInterval(() => {
    updateScheduleDisplay();
  }, 1000);
}

function openScheduleModal() {
  if (elements.scheduleModal) {
    elements.scheduleModal.classList.add('active');
    loadSchedules();
  }
}

function closeScheduleModal() {
  if (elements.scheduleModal) {
    elements.scheduleModal.classList.remove('active');
  }
}

// =========================================================
// Live Sync Action
// =========================================================
async function triggerSync() {
  elements.syncBtn.disabled = true;
  if (elements.syncIcon) elements.syncIcon.classList.add('fa-spin');
  if (elements.syncBtnText) elements.syncBtnText.textContent = 'Syncing GeM...';
  if (elements.liveStatusText) elements.liveStatusText.textContent = 'Syncing...';

  try {
    const res = await fetch('/api/bids/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: state.selectedCity })
    });
    const result = await res.json();
    if (result && result.success) {
      showToast(`🟢 Synced live Maharashtra bids from GeM (${result.result?.totalFoundOnGeM?.toLocaleString('en-IN') || 4634} total on portal)`);
      await refreshPortalData();
      await loadSchedules();
      if (elements.liveStatusText) elements.liveStatusText.textContent = 'Maharashtra (Live)';
    }
  } catch (err) {
    showToast('Live GeM Sync failed. Please check network.', true);
    if (elements.liveStatusText) elements.liveStatusText.textContent = 'Retry Needed';
  } finally {
    elements.syncBtn.disabled = false;
    if (elements.syncIcon) elements.syncIcon.classList.remove('fa-spin');
    if (elements.syncBtnText) elements.syncBtnText.textContent = 'Fetch Live Bids';
  }
}

// =========================================================
// Filter & Search Engine
// =========================================================
function applyFilters() {
  const searchTerm = elements.searchInput ? elements.searchInput.value.toLowerCase().trim() : '';
  const selectedCat = elements.categoryFilter ? elements.categoryFilter.value : 'All';
  const selectedMin = elements.ministryFilter ? elements.ministryFilter.value : 'All';
  const selectedType = elements.bidTypeFilter ? elements.bidTypeFilter.value : 'All';
  const sortBy = elements.sortBy ? elements.sortBy.value : 'ending_soon';

  let bids = [...state.allBids];

  // 1. City Filter (Pill Selection)
  if (state.selectedCity && state.selectedCity !== 'All') {
    bids = bids.filter(b => b.city && b.city.toLowerCase().includes(state.selectedCity.toLowerCase()));
  }

  // 2. Tab Filter
  if (state.currentTab === 'urgent') {
    bids = bids.filter(b => b.status === 'Urgent');
  } else if (state.currentTab === 'tracked') {
    bids = bids.filter(b => state.trackedBidIds.has(b.id));
  }

  // 3. Search Filter across all fields
  if (searchTerm) {
    bids = bids.filter(b =>
      (b.bidNumber && b.bidNumber.toLowerCase().includes(searchTerm)) ||
      (b.title && b.title.toLowerCase().includes(searchTerm)) ||
      (b.ministry && b.ministry.toLowerCase().includes(searchTerm)) ||
      (b.department && b.department.toLowerCase().includes(searchTerm)) ||
      (b.category && b.category.toLowerCase().includes(searchTerm)) ||
      (b.city && b.city.toLowerCase().includes(searchTerm)) ||
      (b.rawCategory && b.rawCategory.toLowerCase().includes(searchTerm))
    );
  }

  // 4. Category Filter
  if (selectedCat !== 'All') {
    bids = bids.filter(b => b.category && b.category.toLowerCase() === selectedCat.toLowerCase());
  }

  // 5. Ministry Filter
  if (selectedMin !== 'All') {
    bids = bids.filter(b => b.ministry && b.ministry.toLowerCase().includes(selectedMin.toLowerCase()));
  }

  // 6. Bid Type Filter
  if (selectedType !== 'All') {
    bids = bids.filter(b => b.bidType && b.bidType.toLowerCase().includes(selectedType.toLowerCase()));
  }

  // 7. Sort
  if (sortBy === 'ending_soon') {
    bids.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
  } else if (sortBy === 'newest') {
    bids.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  }

  state.filteredBids = bids;

  // Update Counters & KPI Labels
  updateCounters();
  renderBids();
}

function updateCounters() {
  const currentCityBids = state.selectedCity === 'All' 
    ? state.allBids 
    : state.allBids.filter(b => b.city && b.city.toLowerCase().includes(state.selectedCity.toLowerCase()));

  const urgentCountInCurrent = currentCityBids.filter(b => b.status === 'Urgent').length;

  if (elements.kpiTotalBids) {
    elements.kpiTotalBids.textContent = `${state.filteredBids.length} Bids`;
  }
  if (elements.kpiCityLabel) {
    elements.kpiCityLabel.textContent = state.selectedCity === 'All' ? 'All Maharashtra Cities' : `${state.selectedCity} Area`;
  }
  if (elements.allCount) {
    elements.allCount.textContent = currentCityBids.length;
  }
  if (elements.urgentCount) {
    elements.urgentCount.textContent = urgentCountInCurrent;
  }
  if (elements.trackedCount) {
    elements.trackedCount.textContent = state.trackedBidIds.size;
  }
}

// =========================================================
// Render Views (Card & Table)
// =========================================================
function renderBids() {
  if (state.currentTab === 'analytics') {
    if (elements.analyticsView) elements.analyticsView.style.display = 'block';
    if (elements.bidsGrid) elements.bidsGrid.style.display = 'none';
    if (elements.bidsTableWrap) elements.bidsTableWrap.style.display = 'none';
    if (elements.emptyState) elements.emptyState.style.display = 'none';
    return;
  }

  if (elements.analyticsView) elements.analyticsView.style.display = 'none';

  if (state.filteredBids.length === 0 && !state.isLoading) {
    if (elements.emptyState) {
      elements.emptyState.style.display = 'block';
      if (elements.emptyStateTitle) {
        elements.emptyStateTitle.textContent = state.selectedCity === 'All'
          ? 'No matching Maharashtra bids found'
          : `No matching bids found in ${state.selectedCity}`;
      }
      if (elements.emptyStateDesc) {
        elements.emptyStateDesc.textContent = `Try resetting Sector/Bid Type filters or fetch more live tenders for ${state.selectedCity}.`;
      }
    }
    if (elements.bidsGrid) elements.bidsGrid.style.display = 'none';
    if (elements.bidsTableWrap) elements.bidsTableWrap.style.display = 'none';
    return;
  }

  if (elements.emptyState) elements.emptyState.style.display = 'none';

  if (state.currentView === 'card') {
    if (elements.bidsGrid) elements.bidsGrid.style.display = 'grid';
    if (elements.bidsTableWrap) elements.bidsTableWrap.style.display = 'none';
    renderCardView(state.filteredBids);
  } else {
    if (elements.bidsGrid) elements.bidsGrid.style.display = 'none';
    if (elements.bidsTableWrap) elements.bidsTableWrap.style.display = 'block';
    renderTableView(state.filteredBids);
  }
}

function renderCardView(bids) {
  if (!elements.bidsGrid) return;

  elements.bidsGrid.innerHTML = bids.map(bid => {
    const isTracked = state.trackedBidIds.has(bid.id);
    const remainingTime = calculateTimeRemaining(bid.endDate);
    const isUrgent = remainingTime.totalSecs <= 86400; // <= 24 hrs

    return `
      <div class="bid-card" id="card-${bid.id}">
        <div>
          <div class="card-top">
            <div class="bid-no-tag">
              <i class="fa-solid fa-file-contract"></i>
              <span>${bid.bidNumber}</span>
            </div>
            <div class="card-actions-quick">
              <span class="city-badge-pill"><i class="fa-solid fa-location-dot"></i> ${bid.city || 'Maharashtra'}</span>
              <button class="star-btn ${isTracked ? 'active' : ''}" onclick="toggleTrackBid('${bid.id}', event)" title="${isTracked ? 'Untrack bid' : 'Track bid'}">
                <i class="fa-${isTracked ? 'solid' : 'regular'} fa-star"></i>
              </button>
            </div>
          </div>

          <div class="bid-category-badge">
            <i class="${getCategoryIcon(bid.category)}"></i>
            <span>${bid.category}</span>
          </div>

          <h3 class="bid-title" title="${escapeHtml(bid.title)}">${bid.title}</h3>

          <div class="bid-org-info">
            <div class="org-ministry" title="${escapeHtml(bid.ministry)}">
              <i class="fa-solid fa-landmark"></i> ${bid.ministry}
            </div>
            <div class="org-dept" title="${escapeHtml(bid.department)}">${bid.department}</div>
          </div>

          <div class="meta-chips-grid">
            <div class="chip-item">
              <span class="chip-label">Consignee City</span>
              <span class="chip-val value-highlight"><i class="fa-solid fa-city"></i> ${bid.city || 'Maharashtra'}</span>
            </div>
            <div class="chip-item">
              <span class="chip-label">Quantity</span>
              <span class="chip-val">${bid.quantity}</span>
            </div>
            <div class="chip-item">
              <span class="chip-label">Bid Type</span>
              <span class="chip-val">${bid.bidType}</span>
            </div>
            <div class="chip-item">
              <span class="chip-label">Reverse Auction</span>
              <span class="chip-val">${bid.hasReverseAuction ? '⚡ Yes (RA Active)' : 'No'}</span>
            </div>
          </div>

          <div class="countdown-box ${isUrgent ? 'urgent' : ''}" data-end-date="${bid.endDate}">
            <span><i class="fa-solid ${isUrgent ? 'fa-fire' : 'fa-hourglass-half'}"></i> ${isUrgent ? 'Closing Soon:' : 'Submission Closes in:'}</span>
            <strong class="ticker-text">${remainingTime.formatted}</strong>
          </div>
        </div>

        <div class="card-footer">
          <button class="btn btn-secondary btn-card" onclick="openBidModal('${bid.id}')">
            <i class="fa-solid fa-eye"></i> Details
          </button>
          <a href="${bid.documentUrl}" target="_blank" class="btn btn-primary btn-card" rel="noopener noreferrer">
            <i class="fa-solid fa-file-pdf"></i> Official PDF
          </a>
        </div>
      </div>
    `;
  }).join('');
}

function renderTableView(bids) {
  if (!elements.bidsTableBody) return;

  elements.bidsTableBody.innerHTML = bids.map(bid => {
    const isTracked = state.trackedBidIds.has(bid.id);
    const remainingTime = calculateTimeRemaining(bid.endDate);

    return `
      <tr>
        <td>
          <div class="table-title-wrap">
            <div class="table-bid-no">${bid.bidNumber}</div>
            <div class="table-title" title="${escapeHtml(bid.title)}">${bid.title}</div>
          </div>
        </td>
        <td>
          <span class="city-badge-pill"><i class="fa-solid fa-location-dot"></i> ${bid.city || 'Maharashtra'}</span>
        </td>
        <td>
          <strong>${bid.ministry}</strong><br>
          <small style="color: var(--text-muted)">${bid.department}</small>
        </td>
        <td><span class="bid-no-tag"><i class="${getCategoryIcon(bid.category)}"></i> ${bid.category}</span></td>
        <td><strong>${bid.quantity}</strong></td>
        <td>
          <div class="countdown-box ${remainingTime.totalSecs <= 86400 ? 'urgent' : ''}" style="margin: 0;" data-end-date="${bid.endDate}">
            <span class="ticker-text">${remainingTime.formatted}</span>
          </div>
        </td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-secondary" style="padding: 0.4rem 0.6rem; font-size: 0.75rem;" onclick="openBidModal('${bid.id}')">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="star-btn ${isTracked ? 'active' : ''}" onclick="toggleTrackBid('${bid.id}', event)">
              <i class="fa-${isTracked ? 'solid' : 'regular'} fa-star"></i>
            </button>
            <a href="${bid.documentUrl}" target="_blank" class="btn btn-primary" style="padding: 0.4rem 0.6rem; font-size: 0.75rem;" title="Download PDF">
              <i class="fa-solid fa-file-pdf"></i>
            </a>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// =========================================================
// Analytics Tab Renderer
// =========================================================
function renderAnalytics(stats) {
  const cityContainer = document.getElementById('cityBars');
  const catContainer = document.getElementById('categoryBars');

  if (!cityContainer || !catContainer) return;

  const total = stats.totalBids || 1;

  // City Progress Bars
  cityContainer.innerHTML = (stats.topCities || []).map(item => {
    const percent = Math.round((item.count / total) * 100);
    return `
      <div class="cat-bar-item">
        <div class="cat-bar-meta">
          <span><i class="fa-solid fa-city"></i> ${item.name}</span>
          <span>${item.count} Bids (${percent}%)</span>
        </div>
        <div class="cat-progress-bg">
          <div class="cat-progress-fill" style="width: ${percent}%"></div>
        </div>
      </div>
    `;
  }).join('');

  // Category Progress Bars
  catContainer.innerHTML = Object.entries(stats.categories || {}).map(([cat, count]) => {
    const percent = Math.round((count / total) * 100);
    return `
      <div class="cat-bar-item">
        <div class="cat-bar-meta">
          <span><i class="${getCategoryIcon(cat)}"></i> ${cat}</span>
          <span>${count} Live Bids (${percent}%)</span>
        </div>
        <div class="cat-progress-bg">
          <div class="cat-progress-fill" style="width: ${percent}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// =========================================================
// Bid Modal Inspection
// =========================================================
function openBidModal(bidId) {
  const bid = state.allBids.find(b => b.id === bidId);
  if (!bid) return;

  state.activeBid = bid;
  const isTracked = state.trackedBidIds.has(bid.id);

  if (elements.modalBidNo) elements.modalBidNo.textContent = bid.bidNumber;
  if (elements.modalStatus) {
    elements.modalStatus.textContent = bid.status;
    elements.modalStatus.className = `status-badge ${bid.status.toLowerCase()}`;
  }
  if (elements.modalDocLink) elements.modalDocLink.href = bid.documentUrl;
  
  if (elements.modalTrackBtn) {
    elements.modalTrackBtn.innerHTML = `
      <i class="fa-${isTracked ? 'solid' : 'regular'} fa-star"></i>
      ${isTracked ? 'Tracked' : 'Track Bid'}
    `;
  }

  if (elements.modalBody) {
    elements.modalBody.innerHTML = `
      <div>
        <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem;">${bid.title}</h2>
        <div class="modal-desc-box">
          ${bid.description}
        </div>
      </div>

      <div class="modal-section">
        <h4>Consignee Location & Procuring Office</h4>
        <div class="modal-meta-grid">
          <div class="modal-meta-card">
            <span>Consignee City</span>
            <strong style="color: var(--accent-orange);"><i class="fa-solid fa-location-dot"></i> ${bid.city || 'Maharashtra'}</strong>
          </div>
          <div class="modal-meta-card">
            <span>State</span>
            <strong>Maharashtra</strong>
          </div>
          <div class="modal-meta-card">
            <span>Ministry / Authority</span>
            <strong>${bid.ministry}</strong>
          </div>
          <div class="modal-meta-card">
            <span>Department / Office</span>
            <strong>${bid.department}</strong>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <h4>Tender Terms & Compliance</h4>
        <div class="modal-meta-grid">
          <div class="modal-meta-card">
            <span>Required Quantity</span>
            <strong style="color: var(--accent-emerald); font-size: 1rem;">${bid.quantity}</strong>
          </div>
          <div class="modal-meta-card">
            <span>Bid Format</span>
            <strong>${bid.bidType}</strong>
          </div>
          <div class="modal-meta-card">
            <span>Make In India Compliance</span>
            <strong>${bid.makeInIndia}</strong>
          </div>
          <div class="modal-meta-card">
            <span>Reverse Auction (RA)</span>
            <strong>${bid.hasReverseAuction ? 'Yes (Mandatory Bidding)' : 'No'}</strong>
          </div>
          <div class="modal-meta-card">
            <span>Submission Deadline</span>
            <strong>${new Date(bid.endDate).toLocaleString('en-IN')}</strong>
          </div>
          <div class="modal-meta-card">
            <span>EMD Guarantee</span>
            <strong>${bid.emdAmount}</strong>
          </div>
        </div>
      </div>
    `;
  }

  if (elements.bidModal) elements.bidModal.classList.add('active');
}

function closeBidModal() {
  if (elements.bidModal) elements.bidModal.classList.remove('active');
  state.activeBid = null;
}

// =========================================================
// Tracking & Bookmarking
// =========================================================
function toggleTrackBid(bidId, e) {
  if (e) e.stopPropagation();

  if (state.trackedBidIds.has(bidId)) {
    state.trackedBidIds.delete(bidId);
    showToast('Removed from tracked bids');
  } else {
    state.trackedBidIds.add(bidId);
    showToast('⭐ Bid added to your tracking list');
  }

  localStorage.setItem('gem_tracked_bids', JSON.stringify([...state.trackedBidIds]));
  if (elements.trackedCount) elements.trackedCount.textContent = state.trackedBidIds.size;

  if (state.activeBid && state.activeBid.id === bidId) {
    const isTracked = state.trackedBidIds.has(bidId);
    if (elements.modalTrackBtn) {
      elements.modalTrackBtn.innerHTML = `
        <i class="fa-${isTracked ? 'solid' : 'regular'} fa-star"></i>
        ${isTracked ? 'Tracked' : 'Track Bid'}
      `;
    }
  }

  applyFilters();
}

// =========================================================
// Export Utility
// =========================================================
function exportData(format) {
  const cityParam = state.selectedCity !== 'All' ? `&city=${encodeURIComponent(state.selectedCity)}` : '';
  window.open(`/api/export?format=${format}${cityParam}`, '_blank');
  if (elements.exportDropdown) elements.exportDropdown.classList.remove('show');
  showToast(`Downloading Maharashtra ${state.selectedCity} Bids as ${format.toUpperCase()}...`);
}

// =========================================================
// Tickers & Countdown Engine
// =========================================================
function startCountdownTicker() {
  setInterval(() => {
    document.querySelectorAll('.countdown-box[data-end-date]').forEach(box => {
      const endDate = box.getAttribute('data-end-date');
      const time = calculateTimeRemaining(endDate);
      const tickerElem = box.querySelector('.ticker-text');
      if (tickerElem) {
        tickerElem.textContent = time.formatted;
      }
      if (time.totalSecs <= 86400) {
        box.classList.add('urgent');
      }
    });
  }, 1000);
}

function calculateTimeRemaining(endDateStr) {
  const diffMs = new Date(endDateStr).getTime() - Date.now();
  if (diffMs <= 0) {
    return { formatted: 'Bidding Closed', totalSecs: 0 };
  }

  const totalSecs = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  if (days > 0) {
    return { formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`, totalSecs };
  }
  return { formatted: `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`, totalSecs };
}

// =========================================================
// Helpers & Utilities
// =========================================================
function updateLastSyncDisplay(isoTime) {
  const d = new Date(isoTime);
  if (elements.lastSyncTime) {
    elements.lastSyncTime.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}

function getCategoryIcon(cat) {
  const map = {
    'IT & Computing': 'fa-solid fa-microchip',
    'Medical & Healthcare': 'fa-solid fa-heart-pulse',
    'Defence & Security': 'fa-solid fa-shield-halved',
    'Energy & Petroleum': 'fa-solid fa-gas-pump',
    'Solar & Clean Energy': 'fa-solid fa-solar-panel',
    'Aerospace & Space': 'fa-solid fa-shuttle-space',
    'Automotive & EV': 'fa-solid fa-car-battery',
    'Railways & Infra': 'fa-solid fa-train-subway',
    'Food & Rations': 'fa-solid fa-bowl-rice',
    'Services & Facility': 'fa-solid fa-server',
    'Goods & Equipment': 'fa-solid fa-boxes-stacked'
  };
  return map[cat] || 'fa-solid fa-box';
}

function escapeHtml(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showToast(msg, isError = false) {
  if (!elements.toast || !elements.toastMsg) return;

  elements.toastMsg.textContent = msg;
  const icon = elements.toast.querySelector('.toast-icon');
  if (icon) {
    icon.className = isError ? 'fa-solid fa-circle-exclamation toast-icon' : 'fa-solid fa-circle-check toast-icon';
    icon.style.color = isError ? 'var(--accent-rose)' : 'var(--accent-emerald)';
  }

  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 3500);
}

function updateLoadingView() {
  if (elements.loadingState) {
    elements.loadingState.style.display = state.isLoading ? 'block' : 'none';
  }
}

function resetAllFilters() {
  if (elements.searchInput) {
    elements.searchInput.value = '';
    if (elements.clearSearchBtn) elements.clearSearchBtn.style.display = 'none';
  }
  if (elements.categoryFilter) elements.categoryFilter.value = 'All';
  if (elements.ministryFilter) elements.ministryFilter.value = 'All';
  if (elements.cityFilter) elements.cityFilter.value = 'All';
  if (elements.bidTypeFilter) elements.bidTypeFilter.value = 'All';
  if (elements.sortBy) elements.sortBy.value = 'ending_soon';
  
  // Reset city pills
  elements.cityPills.forEach(p => p.classList.remove('active'));
  const allPill = document.querySelector('.city-pill[data-city="All"]');
  if (allPill) allPill.classList.add('active');
  state.selectedCity = 'All';

  applyFilters();
}

// =========================================================
// Theme Management
// =========================================================
function initTheme() {
  const saved = localStorage.getItem('gem_theme') || 'dark';
  if (saved === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    if (elements.themeIcon) elements.themeIcon.className = 'fa-solid fa-sun';
  } else {
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
    if (elements.themeIcon) elements.themeIcon.className = 'fa-solid fa-moon';
  }
}

function toggleTheme() {
  const isDark = document.body.classList.contains('dark-theme');
  if (isDark) {
    document.body.classList.replace('dark-theme', 'light-theme');
    if (elements.themeIcon) elements.themeIcon.className = 'fa-solid fa-sun';
    localStorage.setItem('gem_theme', 'light');
  } else {
    document.body.classList.replace('light-theme', 'dark-theme');
    if (elements.themeIcon) elements.themeIcon.className = 'fa-solid fa-moon';
    localStorage.setItem('gem_theme', 'dark');
  }
}

// =========================================================
// Event Listeners
// =========================================================
function setupEventListeners() {
  // Search
  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (e) => {
      if (elements.clearSearchBtn) {
        elements.clearSearchBtn.style.display = e.target.value ? 'block' : 'none';
      }
      applyFilters();
    });
  }

  if (elements.clearSearchBtn) {
    elements.clearSearchBtn.addEventListener('click', () => {
      if (elements.searchInput) elements.searchInput.value = '';
      elements.clearSearchBtn.style.display = 'none';
      applyFilters();
    });
  }

  // City Pills Selection
  elements.cityPills.forEach(pill => {
    pill.addEventListener('click', () => {
      elements.cityPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedCity = pill.getAttribute('data-city');
      
      if (elements.cityFilter) {
        elements.cityFilter.value = state.selectedCity;
      }
      
      // Auto-reset sub-filters to 'All'
      if (elements.categoryFilter) elements.categoryFilter.value = 'All';
      if (elements.bidTypeFilter) elements.bidTypeFilter.value = 'All';

      applyFilters();
    });
  });

  // City Dropdown Filter
  if (elements.cityFilter) {
    elements.cityFilter.addEventListener('change', (e) => {
      state.selectedCity = e.target.value;
      elements.cityPills.forEach(p => {
        p.classList.toggle('active', p.getAttribute('data-city') === state.selectedCity);
      });
      if (elements.categoryFilter) elements.categoryFilter.value = 'All';
      if (elements.bidTypeFilter) elements.bidTypeFilter.value = 'All';
      
      applyFilters();
    });
  }

  // Schedule Modal Buttons
  if (elements.scheduleBtn) elements.scheduleBtn.addEventListener('click', openScheduleModal);
  if (elements.closeScheduleModalBtn) elements.closeScheduleModalBtn.addEventListener('click', closeScheduleModal);
  if (elements.saveScheduleBtn) elements.saveScheduleBtn.addEventListener('click', saveCitySchedule);
  if (elements.scheduleModal) {
    elements.scheduleModal.addEventListener('click', (e) => {
      if (e.target === elements.scheduleModal) closeScheduleModal();
    });
  }

  // Other Filters
  if (elements.categoryFilter) elements.categoryFilter.addEventListener('change', applyFilters);
  if (elements.ministryFilter) elements.ministryFilter.addEventListener('change', applyFilters);
  if (elements.bidTypeFilter) elements.bidTypeFilter.addEventListener('change', applyFilters);
  if (elements.sortBy) elements.sortBy.addEventListener('change', applyFilters);
  if (elements.resetFiltersBtn) elements.resetFiltersBtn.addEventListener('click', resetAllFilters);

  // Sync
  if (elements.syncBtn) elements.syncBtn.addEventListener('click', triggerSync);

  // Theme
  if (elements.themeToggle) elements.themeToggle.addEventListener('click', toggleTheme);

  // Export dropdown
  if (elements.exportBtn) {
    elements.exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (elements.exportDropdown) elements.exportDropdown.classList.toggle('show');
    });
  }

  document.addEventListener('click', () => {
    if (elements.exportDropdown) elements.exportDropdown.classList.remove('show');
  });

  // Tabs
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentTab = btn.getAttribute('data-tab');
      applyFilters();
    });
  });

  // View Switches
  if (elements.viewCardBtn) {
    elements.viewCardBtn.addEventListener('click', () => {
      state.currentView = 'card';
      elements.viewCardBtn.classList.add('active');
      if (elements.viewTableBtn) elements.viewTableBtn.classList.remove('active');
      renderBids();
    });
  }

  if (elements.viewTableBtn) {
    elements.viewTableBtn.addEventListener('click', () => {
      state.currentView = 'table';
      elements.viewTableBtn.classList.add('active');
      if (elements.viewCardBtn) elements.viewCardBtn.classList.remove('active');
      renderBids();
    });
  }

  // Bid Modal
  if (elements.closeModalBtn) elements.closeModalBtn.addEventListener('click', closeBidModal);
  if (elements.bidModal) {
    elements.bidModal.addEventListener('click', (e) => {
      if (e.target === elements.bidModal) closeBidModal();
    });
  }
  if (elements.modalTrackBtn) {
    elements.modalTrackBtn.addEventListener('click', () => {
      if (state.activeBid) {
        toggleTrackBid(state.activeBid.id);
      }
    });
  }
}
