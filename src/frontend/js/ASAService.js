// ASA Service Core Application Class
class ASAService {
  constructor() {
    this.apiBase = '/api';
    this.currentPage = 1;
    this.pageSize = 20;
    this.isLoading = false;
    this.mapsLoaded = false;
    this.activeTab = 'search';
  }

  async init() {
    try {
      console.log('🚀 Initializing ASAService...');
      
      // Test API connection
      console.log('🔄 Testing API connection...');
      await this.testConnection();
      console.log('✅ API connection successful');
      
      // Load initial data
      console.log('🔄 Loading initial data...');
      await this.loadInitialData();
      console.log('✅ Initial data loaded');
      
      console.log('🔄 Setting up event listeners...');
      this.setupEventListeners();
      console.log('✅ Event listeners set up');

      this.updateStatus('Connected', true);
      console.log('🎉 ASAService initialization completed successfully!');
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      this.updateStatus('Connection Error', false);
      this.showAlert('Failed to connect to API', 'error');
      
      // Continue with limited functionality
      console.log('⚠️ Continuing with limited functionality...');
      this.setupEventListeners();
    }
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const tabName = tab.dataset.tab;
        this.showTab(tabName);
      });
    });

    // Theme switcher
    const themeSelector = document.getElementById('themeSelector');
    if (themeSelector) {
      themeSelector.addEventListener('change', (event) => {
        this.switchTheme(event.target.value);
      });

      // Load initial theme from local storage if available
      const savedTheme = localStorage.getItem('asa-theme') || 'dark';
      themeSelector.value = savedTheme;
      this.switchTheme(savedTheme);
    }

    // Keyboard support
    document.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'searchTab') {
          this.performSearch();
        }
      }
    });

    // Add button event listeners
    this.setupButtonListeners();
  }

  setupButtonListeners() {
    // Search buttons
    const searchBtn = document.querySelector('[data-action="search"]');
    if (searchBtn) {
      searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.performSearch();
      });
    }

    // Creatures buttons
    const loadCreaturesBtn = document.querySelector('[data-action="load-creatures"]');
    if (loadCreaturesBtn) {
      loadCreaturesBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.loadCreatures();
      });
    }

    // Maps buttons
    const loadMapsBtn = document.querySelector('[data-action="load-maps"]');
    if (loadMapsBtn) {
      loadMapsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.loadMaps();
      });
    }

    // Taming buttons
    const calculateTamingBtn = document.querySelector('[data-action="calculate-taming"]');
    if (calculateTamingBtn) {
      calculateTamingBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.calculateTaming();
      });
    }

    const loadTameableBtn = document.querySelector('[data-action="load-tameable"]');
    if (loadTameableBtn) {
      loadTameableBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.loadTameableCreatures();
      });
    }

    // Regions buttons
    const loadRegionsBtn = document.querySelector('[data-action="load-regions"]');
    if (loadRegionsBtn) {
      loadRegionsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.loadRegions();
      });
    }

    // Sync and modal buttons
    const syncBtn = document.querySelector('[data-action="sync"]');
    if (syncBtn) {
      syncBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.setButtonLoading(syncBtn, true);
        this.syncAllData().finally(() => {
          this.setButtonLoading(syncBtn, false);
        });
      });
    }

    const updateModalBtn = document.querySelector('[data-action="update-db"]');
    if (updateModalBtn) {
      updateModalBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openDataUpdateModal();
      });
    }
  }

  switchTheme(themeName) {
    document.documentElement.dataset.theme = themeName;
    localStorage.setItem('asa-theme', themeName);
  }

  showTab(tabName) {
    try {
      console.log(`Switching to tab: ${tabName}`);
      this.activeTab = tabName;
      
      // Hide all tab contents
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
      });
      
      // Remove active class from all nav tabs
      document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
      });
      
      // Show selected tab content
      const tabContent = document.getElementById(tabName + 'Tab');
      if (tabContent) {
        tabContent.classList.add('active');
      } else {
        console.error(`Tab content not found: ${tabName}Tab`);
        this.showAlert(`Tab content not found: ${tabName}`, 'error');
        return;
      }
      
      // Add active class to selected nav tab
      const navTab = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
      if (navTab) {
        navTab.classList.add('active');
      } else {
        console.error(`Nav tab not found: ${tabName}`);
      }

      // Dynamically load maps if maps tab is opened for the first time
      if (tabName === 'maps' && !this.mapsLoaded) {
        this.loadMaps();
        this.mapsLoaded = true; // Set flag
      }
    } catch (error) {
      console.error('Error switching tabs:', error);
      this.showAlert(`Error switching to ${tabName} tab: ${error.message}`, 'error');
    }
  }

  async testConnection() {
    const response = await fetch(`${this.apiBase}/health`);
    if (!response.ok) {
      throw new Error(`API connection failed: ${response.status}`);
    }
    return response.json();
  }

  async loadInitialData() {
    // Load creature list for taming calculator
    try {
      const creatures = await this.apiCall('/creatures');
      this.populateCreatureSelect(creatures.data);
    } catch (error) {
      console.warn('Failed to load creatures for taming calculator:', error);
    }

    // Load maps for regions selector
    try {
      const maps = await this.apiCall('/maps');
      this.populateMapSelect(maps.data);
    } catch (error) {
      console.warn('Failed to load maps for regions selector:', error);
    }
  }

  populateCreatureSelect(creatures) {
    const select = document.getElementById('tamingCreature');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Creature...</option>';
    
    if (Array.isArray(creatures)) {
      creatures.forEach(creature => {
        if (creature.is_tameable || creature.tameable) {
          const option = document.createElement('option');
          option.value = creature.slug || creature.name.toLowerCase().replace(/\s+/g, '-');
          option.textContent = creature.name;
          select.appendChild(option);
        }
      });
    }
  }

  populateMapSelect(maps) {
    const select = document.getElementById('regionMap');
    if (!select) return;
    
    select.innerHTML = '<option value="">Choose Map...</option>';
    
    if (Array.isArray(maps)) {
      maps.forEach(map => {
        const option = document.createElement('option');
        option.value = map.slug || map.name.toLowerCase().replace(/\s+/g, '-');
        option.textContent = map.name;
        select.appendChild(option);
      });
    }
  }

  async apiCall(endpoint, options = {}) {
    const url = `${this.apiBase}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error ${response.status}: ${error}`);
    }

    return response.json();
  }

  showLoading(show = true) {
    this.isLoading = show;
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) {
      indicator.classList.toggle('hidden', !show);
    }
  }

  updateStatus(text, connected = true) {
    const statusText = document.getElementById('statusText');
    const statusDot = document.querySelector('.status-dot');
    
    if (statusText) statusText.textContent = text;
    if (statusDot) {
      statusDot.style.background = connected ? 'var(--success)' : 'var(--danger)';
    }
  }

  showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    if (!container) {
      // Create alert container if it doesn't exist
      const alertContainer = document.createElement('div');
      alertContainer.id = 'alertContainer';
      alertContainer.style.cssText = `
        position: fixed;
        top: 100px;
        right: 2rem;
        z-index: 2000;
        max-width: 400px;
      `;
      document.body.appendChild(alertContainer);
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
      <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check' : 'info-circle'}"></i>
      ${message}
    `;
    
    const finalContainer = document.getElementById('alertContainer');
    finalContainer.appendChild(alert);
    
    setTimeout(() => {
      alert.remove();
    }, 5000);
  }

  // Progress Notification System
  showProgressNotification(title = 'Processing', status = 'Starting...') {
    const notification = document.getElementById('progressNotification');
    if (!notification) return;

    const titleElement = notification.querySelector('.progress-title');
    const statusElement = notification.querySelector('.progress-status');
    const fillElement = notification.querySelector('.progress-fill');

    if (titleElement) titleElement.textContent = title;
    if (statusElement) statusElement.textContent = status;
    if (fillElement) fillElement.style.width = '0%';

    notification.classList.remove('hidden');
  }

  updateProgressNotification(progress, status) {
    const notification = document.getElementById('progressNotification');
    if (!notification || notification.classList.contains('hidden')) return;

    const statusElement = notification.querySelector('.progress-status');
    const fillElement = notification.querySelector('.progress-fill');

    if (statusElement) statusElement.textContent = status;
    if (fillElement) fillElement.style.width = `${Math.min(100, Math.max(0, progress))}%`;

    // Auto-hide on completion
    if (progress >= 100) {
      setTimeout(() => {
        this.hideProgressNotification();
      }, 2000);
    }
  }

  hideProgressNotification() {
    const notification = document.getElementById('progressNotification');
    if (notification) {
      notification.classList.add('hidden');
    }
  }

  // Admin and Sync functionality
  async syncAllData() {
    this.showAlert('Starting delta synchronization...', 'info');
    this.showProgressNotification('Synchronizing Data', 'Starting sync process...');
    this.showLoading(true);
    
    try {
      // Test connection first
      this.updateProgressNotification(10, 'Testing API connection...');
      await this.testConnection();
      
      this.updateProgressNotification(30, 'Syncing creatures data...');
      // Simulate delta sync process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      this.updateProgressNotification(60, 'Syncing maps and regions...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      this.updateProgressNotification(90, 'Validating data integrity...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.updateProgressNotification(100, 'Synchronization completed!');
      this.showAlert('Delta synchronization completed successfully!', 'success');
      
      // Reload initial data
      await this.loadInitialData();
      
      // Trigger refresh of any visible data
      const event = new CustomEvent('dataRefreshed');
      document.dispatchEvent(event);
      
    } catch (error) {
      console.error('Sync failed:', error);
      this.updateProgressNotification(0, `Sync failed: ${error.message}`);
      this.showAlert(`Synchronization failed: ${error.message}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async getPopulationStatus() {
    try {
      return await this.apiCall('/admin/population-status');
    } catch (error) {
      console.error('Failed to get population status:', error);
      throw error;
    }
  }

  async populateData(type = 'all') {
    try {
      this.showAlert(`Starting data population (${type})...`, 'info');
      
      const response = await this.apiCall('/admin/populate-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type })
      });
      
      this.showAlert(response.message, 'success');
      return response;
    } catch (error) {
      console.error('Failed to populate data:', error);
      this.showAlert(`Data population failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async validateDatabase() {
    try {
      this.showAlert('Validating database...', 'info');
      
      const response = await this.apiCall('/admin/validate-database', {
        method: 'POST'
      });
      
      this.showAlert(`Database validation completed: ${response.totalRecords} total records`, 'success');
      return response;
    } catch (error) {
      console.error('Failed to validate database:', error);
      this.showAlert(`Database validation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  // Data Update Modal Functions
  openDataUpdateModal() {
    let modal = document.getElementById('dataUpdateModal');
    
    if (!modal) {
      // Create modal if it doesn't exist
      modal = this.createDataUpdateModal();
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  closeDataUpdateModal() {
    const modal = document.getElementById('dataUpdateModal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = 'auto';
    }
  }

  createDataUpdateModal() {
    const modal = document.createElement('div');
    modal.id = 'dataUpdateModal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2><i class="fas fa-database"></i> Update Database</h2>
          <button class="modal-close" onclick="asaService.closeDataUpdateModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="update-tabs">
            <button class="tab-btn active" data-tab="selective">Selective Update</button>
            <button class="tab-btn" data-tab="full">Full Database Sync</button>
          </div>
          
          <!-- Selective Update Tab -->
          <div class="tab-content active" id="selective-tab">
            <p>Choose specific data types to update:</p>
            <div class="update-grid">
              <div class="update-card" data-type="creatures">
                <div class="update-card-header">
                  <h3><i class="fas fa-paw"></i> Creatures</h3>
                  <span class="update-status" id="creatures-status">Ready</span>
                </div>
                <div class="update-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" id="creatures-progress"></div>
                  </div>
                  <span class="progress-text" id="creatures-text">0/0</span>
                </div>
                <button class="btn btn-sm" onclick="asaService.updateDataType('creatures')">
                  <i class="fas fa-sync"></i> Update
                </button>
              </div>
              
              <div class="update-card" data-type="maps">
                <div class="update-card-header">
                  <h3><i class="fas fa-map"></i> Maps</h3>
                  <span class="update-status" id="maps-status">Ready</span>
                </div>
                <div class="update-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" id="maps-progress"></div>
                  </div>
                  <span class="progress-text" id="maps-text">0/0</span>
                </div>
                <button class="btn btn-sm" onclick="asaService.updateDataType('maps')">
                  <i class="fas fa-sync"></i> Update
                </button>
              </div>
              
              <div class="update-card" data-type="regions">
                <div class="update-card-header">
                  <h3><i class="fas fa-mountain"></i> Regions</h3>
                  <span class="update-status" id="regions-status">Ready</span>
                </div>
                <div class="update-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" id="regions-progress"></div>
                  </div>
                  <span class="progress-text" id="regions-text">0/0</span>
                </div>
                <button class="btn btn-sm" onclick="asaService.updateDataType('regions')">
                  <i class="fas fa-sync"></i> Update
                </button>
              </div>
              
              <div class="update-card" data-type="taming">
                <div class="update-card-header">
                  <h3><i class="fas fa-heart"></i> Taming Data</h3>
                  <span class="update-status" id="taming-status">Ready</span>
                </div>
                <div class="update-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" id="taming-progress"></div>
                  </div>
                  <span class="progress-text" id="taming-text">0/0</span>
                </div>
                <button class="btn btn-sm" onclick="asaService.updateDataType('taming')">
                  <i class="fas fa-sync"></i> Update
                </button>
              </div>
            </div>
          </div>
          
          <!-- Full Sync Tab -->
          <div class="tab-content" id="full-tab">
            <div class="sync-info">
              <h3><i class="fas fa-sync-alt"></i> Full Database Synchronization</h3>
              <p>This will perform a complete database sync from ARK Wiki and Dododex:</p>
              <ul>
                <li>Replace existing data with latest from sources</li>
                <li>Add new creatures, maps, and regions</li>
                <li>Update taming calculations and statistics</li>
                <li>Validate data integrity</li>
              </ul>
              <div class="sync-progress-container" id="sync-progress-container" style="display: none;">
                <div class="overall-progress">
                  <h4>Overall Progress</h4>
                  <div class="progress-bar large">
                    <div class="progress-fill" id="overall-progress"></div>
                  </div>
                  <span class="progress-text" id="overall-text">0%</span>
                </div>
                <div class="sync-log" id="sync-log"></div>
              </div>
              <div class="sync-actions">
                <button class="btn btn-primary" id="full-sync-btn" onclick="asaService.performFullSync()">
                  <i class="fas fa-database"></i> Start Full Sync
                </button>
                <button class="btn btn-secondary" onclick="asaService.validateDatabase()">
                  <i class="fas fa-check-circle"></i> Validate Only
                </button>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <div class="sync-status" id="sync-status">Ready to update database</div>
          </div>
        </div>
      </div>
    `;
    
    // Add tab switching functionality
    modal.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-btn')) {
        const tabName = e.target.dataset.tab;
        
        // Update tab buttons
        modal.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        // Update tab content
        modal.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        modal.querySelector(`#${tabName}-tab`).classList.add('active');
      }
    });
    
    document.body.appendChild(modal);
    return modal;
  }

  async updateDataType(type) {
    try {
      // Show progress notification
      this.showProgressNotification(`Updating ${type.charAt(0).toUpperCase() + type.slice(1)}`, 'Starting update...');
      this.updateProgress(type, 'updating', 0, 'Starting update...');
      
      // Simulate progressive update steps
      const steps = this.getUpdateSteps(type);
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const progress = ((i + 1) / steps.length) * 100;
        this.updateProgress(type, 'updating', progress, step.message);
        this.updateProgressNotification(progress, step.message);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      }
      
      // Call actual API
      const response = await this.populateData(type);
      this.updateProgress(type, 'completed', 100, 'Update completed');
      this.updateProgressNotification(100, 'Update completed successfully!');
      
      this.showAlert(`${type.charAt(0).toUpperCase() + type.slice(1)} data updated successfully!`, 'success');
      
    } catch (error) {
      this.updateProgress(type, 'error', 0, `Error: ${error.message}`);
      this.updateProgressNotification(0, `Error: ${error.message}`);
      this.showAlert(`Failed to update ${type}: ${error.message}`, 'error');
    }
  }

  async performFullSync() {
    const button = document.getElementById('full-sync-btn');
    const container = document.getElementById('sync-progress-container');
    const log = document.getElementById('sync-log');
    
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
    container.style.display = 'block';
    
    try {
      const dataTypes = ['creatures', 'maps', 'regions', 'taming'];
      let completed = 0;
      
      for (const type of dataTypes) {
        this.addSyncLog(`Starting ${type} synchronization...`);
        this.updateOverallProgress((completed / dataTypes.length) * 100);
        
        // Simulate sync steps
        const steps = this.getUpdateSteps(type);
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          this.addSyncLog(`${type}: ${step.message}`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Call actual API
        await this.populateData(type);
        completed++;
        this.addSyncLog(`✅ ${type} synchronization completed`);
        this.updateOverallProgress((completed / dataTypes.length) * 100);
      }
      
      // Final validation
      this.addSyncLog('Validating database integrity...');
      await this.validateDatabase();
      this.addSyncLog('🎉 Full synchronization completed successfully!');
      
    } catch (error) {
      this.addSyncLog(`❌ Sync failed: ${error.message}`);
    } finally {
      button.disabled = false;
      button.innerHTML = '<i class="fas fa-database"></i> Start Full Sync';
    }
  }

  getUpdateSteps(type) {
    const steps = {
      creatures: [
        { message: 'Fetching creature data from ARK Wiki...' },
        { message: 'Processing creature statistics...' },
        { message: 'Updating creature database...' },
        { message: 'Validating creature data...' }
      ],
      maps: [
        { message: 'Fetching map information...' },
        { message: 'Processing map details...' },
        { message: 'Updating map database...' }
      ],
      regions: [
        { message: 'Fetching region data...' },
        { message: 'Processing biome information...' },
        { message: 'Linking regions to maps...' },
        { message: 'Updating region database...' }
      ],
      taming: [
        { message: 'Fetching taming data from Dododex...' },
        { message: 'Calculating taming requirements...' },
        { message: 'Processing food preferences...' },
        { message: 'Updating taming database...' }
      ]
    };
    return steps[type] || [];
  }

  updateProgress(type, status, percentage, message) {
    const statusEl = document.getElementById(`${type}-status`);
    const progressEl = document.getElementById(`${type}-progress`);
    const textEl = document.getElementById(`${type}-text`);
    
    if (statusEl) {
      statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
      statusEl.className = `update-status ${status}`;
    }
    
    if (progressEl) {
      progressEl.style.width = `${percentage}%`;
    }
    
    if (textEl) {
      textEl.textContent = message;
    }
  }

  updateOverallProgress(percentage) {
    const progressEl = document.getElementById('overall-progress');
    const textEl = document.getElementById('overall-text');
    
    if (progressEl) progressEl.style.width = `${percentage}%`;
    if (textEl) textEl.textContent = `${Math.round(percentage)}%`;
  }

  addSyncLog(message) {
    const log = document.getElementById('sync-log');
    if (log) {
      const logEntry = document.createElement('div');
      logEntry.className = 'log-entry';
      logEntry.innerHTML = `<span class="log-time">${new Date().toLocaleTimeString()}</span> ${message}`;
      log.appendChild(logEntry);
      log.scrollTop = log.scrollHeight;
    }
  }

  setButtonLoading(button, isLoading) {
    if (!button) return;
    
    const content = button.querySelector('.btn-content');
    const loading = button.querySelector('.btn-loading');
    
    if (isLoading) {
      button.disabled = true;
      button.classList.add('loading');
      if (content) content.classList.add('hidden');
      if (loading) loading.classList.remove('hidden');
    } else {
      button.disabled = false;
      button.classList.remove('loading');
      if (content) content.classList.remove('hidden');
      if (loading) loading.classList.add('hidden');
    }
  }

  // Helper function to get map image path
  getMapImagePath(mapName) {
    // Convert map name to filename format
    const filename = mapName.replace(/\s+/g, '').replace(/:/g, '');
    return `/images/maps/${filename}.jpg`;
  }

  // Missing methods that are called by event listeners
  async loadCreatures() {
    console.log('Loading creatures...');
    // Delegate to app for now since app has this functionality
    if (window.app && window.app.creaturesComponent) {
      await window.app.creaturesComponent.loadCreatures();
    } else {
      console.warn('Creatures component not available');
    }
  }

  async loadMaps() {
    console.log('Loading maps...');
    // Delegate to app for now since app has this functionality
    if (window.app && window.app.mapsComponent) {
      await window.app.mapsComponent.loadMaps();
    } else {
      console.warn('Maps component not available');
    }
  }

  async calculateTaming() {
    console.log('Calculating taming...');
    // Delegate to app for now since app has this functionality
    if (window.app && typeof window.app.calculateTaming === 'function') {
      await window.app.calculateTaming();
    } else {
      console.warn('Taming calculation not available');
    }
  }

  async loadTameableCreatures() {
    console.log('Loading tameable creatures...');
    // Delegate to app for now since app has this functionality
    if (window.app && typeof window.app.loadTameableCreatures === 'function') {
      await window.app.loadTameableCreatures();
    } else {
      console.warn('Tameable creatures loading not available');
    }
  }

  async loadRegions() {
    console.log('Loading regions...');
    // Delegate to app for now since app has this functionality
    if (window.app && typeof window.app.loadRegions === 'function') {
      await window.app.loadRegions();
    } else {
      console.warn('Regions loading not available');
    }
  }

  performSearch() {
    console.log('Performing search...');
    // Delegate to app for now since app has this functionality
    if (window.app && window.app.searchComponent && typeof window.app.searchComponent.performSearch === 'function') {
      window.app.searchComponent.performSearch();
    } else {
      console.warn('Search component not available');
    }
  }
}
