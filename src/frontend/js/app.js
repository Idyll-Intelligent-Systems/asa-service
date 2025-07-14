/**
 * ASA Service Frontend Application
 * Main application class for ARK: Survival Ascended Database interface
 */

class ASAService {
  constructor() {
    this.apiBase = '/api';
    this.currentPage = 1;
    this.pageSize = 20;
    this.isLoading = false;
    this.mapsLoaded = false;
    this.cache = new Map();
  }

  /**
   * Initialize the application
   */
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

  /**
   * Set up event listeners for the application
   */
  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
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
          if (window.searchComponent) {
            window.searchComponent.performSearch();
          }
        }
      }
    });
  }

  /**
   * Switch application theme
   */
  switchTheme(themeName) {
    document.documentElement.dataset.theme = themeName;
    localStorage.setItem('asa-theme', themeName);
  }

  /**
   * Show specific tab
   */
  showTab(tabName) {
    try {
      console.log(`Switching to tab: ${tabName}`);
      
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

      // Dynamically load content if needed
      if (tabName === 'maps' && !this.mapsLoaded) {
          if (window.mapsComponent) {
            window.mapsComponent.loadMaps();
          }
          this.mapsLoaded = true;
      }
    } catch (error) {
      console.error('Error switching tabs:', error);
      this.showAlert(`Error switching to ${tabName} tab: ${error.message}`, 'error');
    }
  }

  /**
   * Test API connection
   */
  async testConnection() {
    const response = await fetch(`${this.apiBase}/health`);
    if (!response.ok) {
      throw new Error(`API connection failed: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Load initial application data
   */
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

  /**
   * Populate creature select dropdown
   */
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

  /**
   * Populate map select dropdown
   */
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

  /**
   * Make API call with error handling
   */
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

  /**
   * Show/hide loading indicator
   */
  showLoading(show = true) {
    this.isLoading = show;
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) {
      indicator.classList.toggle('hidden', !show);
    }
  }

  /**
   * Update connection status
   */
  updateStatus(text, connected = true) {
    const statusText = document.getElementById('statusText');
    const statusDot = document.querySelector('.status-dot');
    
    if (statusText) statusText.textContent = text;
    if (statusDot) {
      statusDot.style.background = connected ? 'var(--success)' : 'var(--error)';
    }
  }

  /**
   * Show alert message
   */
  showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    if (!container) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
      <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check' : 'info-circle'}"></i>
      ${message}
    `;
    
    container.appendChild(alert);
    
    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove();
      }
    }, 5000);
  }
}

/**
 * Main Application Class
 * Manages the overall application state and coordinates between components
 */
class App {
  constructor() {
    this.asaService = new ASAService();
    this.searchComponent = null;
    this.creaturesComponent = null;
    this.mapsComponent = null;
    this.interactiveMapsComponent = null;
  }

  async init() {
    try {
      console.log('ASA Service application initialized successfully');
    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.showError('Failed to initialize application. Please refresh the page.');
      this.hideLoading();
    }
  }

  async initializeComponents() {
    try {
      // Initialize search component
      if (this.searchComponent) {
        await this.searchComponent.init();
      }

      // Initialize creatures component
      if (this.creaturesComponent) {
        await this.creaturesComponent.init();
      }

      // Initialize maps component
      if (this.mapsComponent) {
        await this.mapsComponent.init();
      }

      // Initialize interactive maps component
      if (this.interactiveMapsComponent) {
        await this.interactiveMapsComponent.init();
      }

      console.log('All components initialized successfully');
    } catch (error) {
      console.error('Error initializing components:', error);
    }
  }

  setupEventListeners() {
    // Theme selector
    const themeSelector = document.getElementById('themeSelector');
    if (themeSelector) {
      themeSelector.addEventListener('change', (e) => {
        this.changeTheme(e.target.value);
      });
    }

    // Global action buttons
    document.addEventListener('click', (e) => {
      const actionButton = e.target.closest('[data-action]');
      if (!actionButton) return;

      const action = actionButton.dataset.action;
      this.handleGlobalAction(action, actionButton);
    });

    // Global action selects (for change events)
    document.addEventListener('change', (e) => {
      const actionSelect = e.target.closest('[data-action]');
      if (!actionSelect) return;

      const action = actionSelect.dataset.action;
      this.handleGlobalAction(action, actionSelect);
    });

    // Tab navigation
    document.addEventListener('click', (e) => {
      const tabButton = e.target.closest('[data-tab]');
      if (!tabButton) return;

      const tabName = tabButton.dataset.tab;
      this.showTab(tabName);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });
  }

  async handleGlobalAction(action, button) {
    try {
      switch (action) {
        case 'sync':
          await this.syncAllData();
          break;
        case 'open-update-modal':
          await this.openUpdateModal();
          break;
        case 'search':
          await this.searchComponent?.performSearch();
          break;
        case 'load-creatures':
          await this.creaturesComponent?.loadCreatures();
          break;
        case 'load-maps':
          await this.mapsComponent?.loadMaps();
          break;
        case 'calculate-taming':
          await this.calculateTaming();
          break;
        case 'load-tameable':
          await this.loadTameableCreatures();
          break;
        case 'load-regions':
          await this.loadRegions();
          break;
        case 'close-modal':
          this.closeDataUpdateModal();
          break;
        case 'start-update':
          this.startDataUpdate();
          break;
        case 'view-details':
          this.viewDetails(button.dataset.type, button.dataset.slug);
          break;
        case 'show-location':
          this.showLocationDetails(button.dataset.name, button.dataset.map);
          break;
        case 'show-detailed-view':
          this.showDetailedView(button.dataset.type, button.dataset.name);
          break;
        case 'add-to-taming':
          this.addToTamingPlanner(button.dataset.name);
          break;
        case 'explore-map':
          this.exploreMap(button.dataset.name);
          break;
        case 'add-to-favorites':
          this.addToFavorites(button.dataset.type, button.dataset.name);
          break;
        case 'sort-results':
          this.sortSearchResults();
          break;
        case 'export-results':
          this.exportSearchResults();
          break;
        case 'show-map-details':
          this.showMapDetails(button.dataset.name);
          break;
        case 'show-map-regions':
          this.showMapRegions(button.dataset.name);
          break;
        case 'show-detail-tab':
          this.showDetailTab(button.dataset.map, button.dataset.tab);
          break;
        case 'toggle-all-map-details':
          this.toggleAllMapDetails();
          break;
        case 'sort-maps':
          this.sortMaps();
          break;
        case 'select-for-taming':
          this.selectCreatureForTaming(button.dataset.creature);
          break;
        case 'show-region-details':
          this.showRegionDetails(button.dataset.name, button.dataset.map);
          break;
        case 'show-creature-details':
          this.showCreatureDetails(button.dataset.name);
          break;
        case 'show-resource-details':
          this.showResourceDetails(button.dataset.name);
          break;
        default:
          console.warn('Unknown action:', action);
      }
    } catch (error) {
      console.error(`Error handling action ${action}:`, error);
      this.showError(`Failed to execute ${action}. Please try again.`);
    }
  }

  showTab(tabName) {
    // Update navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`)?.classList.add('active');

    // Initialize tab-specific content if needed
    this.initializeTabContent(tabName);
  }

  async initializeTabContent(tabName) {
    switch (tabName) {
      case 'search':
        // Search tab is always ready
        break;
      case 'creatures':
        if (this.creaturesComponent && !this.creaturesComponent.isLoaded) {
          await this.creaturesComponent.loadCreatures();
        }
        break;
      case 'maps':
        if (this.mapsComponent && !this.mapsComponent.isLoaded) {
          await this.mapsComponent.loadMaps();
        }
        break;
      case 'taming':
        await this.loadTamingData();
        break;
      case 'regions':
        await this.loadRegionData();
        break;
    }
  }

  async loadTamingData() {
    try {
      // Load tameable creatures into dropdown
      const response = await this.asaService.apiCall('/creatures?tameable=true');
      const creatures = response.data || [];
      
      const select = document.getElementById('tamingCreature');
      if (select) {
        select.innerHTML = '<option value="">Select Creature...</option>';
        creatures.forEach(creature => {
          const option = document.createElement('option');
          option.value = creature.id;
          option.textContent = creature.name;
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading taming data:', error);
    }
  }

  async loadRegionData() {
    try {
      // Load maps into dropdown
      const response = await this.asaService.apiCall('/maps');
      const maps = response.data || [];
      
      const select = document.getElementById('regionMap');
      if (select) {
        select.innerHTML = '<option value="">Choose Map...</option>';
        maps.forEach(map => {
          const option = document.createElement('option');
          option.value = map.id;
          option.textContent = map.name;
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading region data:', error);
    }
  }

  async calculateTaming() {
    const creatureId = document.getElementById('tamingCreature')?.value;
    const level = document.getElementById('creatureLevel')?.value;

    if (!creatureId || !level) {
      this.showError('Please select a creature and enter a level.');
      return;
    }

    try {
      this.showLoading('Calculating taming requirements...');
      
      const response = await this.asaService.apiCall(`/taming/${creatureId}?level=${level}`);
      const tamingData = response.data;

      this.displayTamingResults(tamingData);
      
      // Show results section
      const resultsSection = document.getElementById('tamingResults');
      if (resultsSection) {
        resultsSection.classList.remove('hidden');
      }

      this.hideLoading();
    } catch (error) {
      console.error('Error calculating taming:', error);
      this.showError('Failed to calculate taming requirements.');
      this.hideLoading();
    }
  }

  displayTamingResults(data) {
    const content = document.getElementById('tamingContent');
    if (!content) return;

    content.innerHTML = `
      <div class="taming-results">
        <div class="data-grid">
          <div class="data-item">
            <h4>${data.creature_name || 'Unknown'}</h4>
            <p><strong>Level:</strong> ${data.level || 'N/A'}</p>
            <p><strong>Taming Method:</strong> ${data.taming_method || 'Unknown'}</p>
          </div>
          <div class="data-item">
            <h4>Food Requirements</h4>
            <p><strong>Primary Food:</strong> ${data.preferred_food || 'Unknown'}</p>
            <p><strong>Amount:</strong> ${data.food_amount || 'N/A'}</p>
            <p><strong>Time:</strong> ${data.taming_time || 'N/A'}</p>
          </div>
          <div class="data-item">
            <h4>Narcotics</h4>
            <p><strong>Narcoberries:</strong> ${data.narcoberries || 'N/A'}</p>
            <p><strong>Narcotic:</strong> ${data.narcotic || 'N/A'}</p>
            <p><strong>Bio Toxin:</strong> ${data.bio_toxin || 'N/A'}</p>
          </div>
        </div>
      </div>
    `;
  }

  async loadTameableCreatures() {
    try {
      this.showLoading('Loading tameable creatures...');
      
      const response = await this.asaService.apiCall('/creatures?tameable=true');
      const creatures = response.data || [];

      this.displayTameableList(creatures);
      this.hideLoading();
    } catch (error) {
      console.error('Error loading tameable creatures:', error);
      this.showError('Failed to load tameable creatures.');
      this.hideLoading();
    }
  }

  displayTameableList(creatures) {
    const container = document.getElementById('tameableList');
    if (!container) return;

    container.innerHTML = `
      <div class="data-grid">
        ${creatures.map(creature => `
          <div class="data-item">
            <h4>${creature.name}</h4>
            <p><strong>Temperament:</strong> ${creature.temperament || 'Unknown'}</p>
            <p><strong>Diet:</strong> ${creature.diet || 'Unknown'}</p>
            <p><strong>Rideable:</strong> ${creature.rideable ? 'Yes' : 'No'}</p>
            ${creature.preferred_food ? `<p><strong>Preferred Food:</strong> ${creature.preferred_food}</p>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  async loadRegions() {
    const mapId = document.getElementById('regionMap')?.value;
    const biome = document.getElementById('regionBiome')?.value;

    if (!mapId) {
      this.showError('Please select a map first.');
      return;
    }

    try {
      this.showLoading('Loading regions...');
      
      let url = `/regions?map_id=${mapId}`;
      if (biome) {
        url += `&biome=${biome}`;
      }

      const response = await this.asaService.apiCall(url);
      const regions = response.data || [];

      this.displayRegions(regions);
      
      // Show results section
      const resultsSection = document.getElementById('regionsResults');
      if (resultsSection) {
        resultsSection.classList.remove('hidden');
      }

      this.hideLoading();
    } catch (error) {
      console.error('Error loading regions:', error);
      this.showError('Failed to load regions.');
      this.hideLoading();
    }
  }

  displayRegions(regions) {
    const content = document.getElementById('regionsContent');
    if (!content) return;

    content.innerHTML = `
      <div class="data-grid">
        ${regions.map(region => `
          <div class="data-item">
            <h4>${region.name}</h4>
            <p><strong>Biome:</strong> ${region.biome || 'Unknown'}</p>
            <p><strong>Danger Level:</strong> ${region.danger_level || 'Unknown'}</p>
            ${region.temperature ? `<p><strong>Temperature:</strong> ${region.temperature}</p>` : ''}
            ${region.resources ? `<p><strong>Resources:</strong> ${region.resources}</p>` : ''}
            ${region.creatures ? `<p><strong>Common Creatures:</strong> ${region.creatures}</p>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  async syncAllData() {
    try {
      this.showLoading('Syncing all data...');
      
      await this.asaService.apiCall('/admin/populate-data', { method: 'POST' });
      
      // Refresh all loaded data
      if (this.searchComponent) {
        await this.searchComponent.refresh();
      }
      if (this.creaturesComponent) {
        await this.creaturesComponent.refresh();
      }
      if (this.mapsComponent) {
        await this.mapsComponent.refresh();
      }

      this.showSuccess('Data synchronized successfully!');
      this.hideLoading();
    } catch (error) {
      console.error('Error syncing data:', error);
      this.showError('Failed to sync data.');
      this.hideLoading();
    }
  }

  async openUpdateModal() {
    try {
      // Show loading state
      this.showLoading('Checking database status...');
      
      // Check if update is needed
      const healthResponse = await this.asaService.apiCall('/health');
      const isDbConnected = healthResponse.database?.connected;
      
      if (!isDbConnected) {
        this.hideLoading();
        this.showNotification('Database not connected. Please check your database configuration.', 'error');
        return;
      }
      
      // Check current data status
      const statsResponse = await this.asaService.apiCall('/admin/stats');
      const stats = statsResponse.data || {};
      
      this.hideLoading();
      
      // Show update options modal
      const modal = this.createUpdateModal(stats);
      document.body.appendChild(modal);
      modal.style.display = 'block';
      
    } catch (error) {
      this.hideLoading();
      console.error('Error checking database status:', error);
      this.showNotification('Error checking database status: ' + error.message, 'error');
    }
  }
  
  createUpdateModal(stats) {
    const modal = document.createElement('div');
    modal.id = 'dataUpdateModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="fas fa-database"></i> Database Update</h3>
          <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
        </div>
        <div class="modal-body">
          <div class="db-status">
            <h4>Current Database Status:</h4>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">Creatures:</span>
                <span class="stat-value">${stats.creatures || 0}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Maps:</span>
                <span class="stat-value">${stats.maps || 0}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Regions:</span>
                <span class="stat-value">${stats.regions || 0}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Last Updated:</span>
                <span class="stat-value">${stats.lastUpdated || 'Never'}</span>
              </div>
            </div>
          </div>
          
          <div class="update-options">
            <h4>Available Update Options:</h4>
            <div class="option-buttons">
              <button class="btn btn-primary" onclick="window.app.performDbUpdate('sync')">
                <i class="fas fa-sync"></i> Sync from DodoDex & Wiki
              </button>
              <button class="btn btn-secondary" onclick="window.app.performDbUpdate('refresh')">
                <i class="fas fa-refresh"></i> Refresh Search Indexes
              </button>
              <button class="btn btn-warning" onclick="window.app.performDbUpdate('reset')">
                <i class="fas fa-exclamation-triangle"></i> Reset Database
              </button>
            </div>
          </div>
          
          <div id="updateProgress" class="update-progress" style="display: none;">
            <div class="progress-bar">
              <div class="progress-fill" id="progressFill"></div>
            </div>
            <div class="progress-text" id="progressText">Starting update...</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
        </div>
      </div>
    `;
    return modal;
  }
  
  async performDbUpdate(type) {
    const progressDiv = document.getElementById('updateProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressDiv.style.display = 'block';
    progressFill.style.width = '0%';
    
    try {
      let endpoint, message;
      
      switch(type) {
        case 'sync':
          endpoint = '/admin/sync-data';
          message = 'Syncing data from external sources...';
          break;
        case 'refresh':
          endpoint = '/admin/refresh-indexes';
          message = 'Refreshing search indexes...';
          break;
        case 'reset':
          if (!confirm('This will delete all data and reset the database. Are you sure?')) {
            progressDiv.style.display = 'none';
            return;
          }
          endpoint = '/admin/reset-database';
          message = 'Resetting database...';
          break;
        default:
          throw new Error('Unknown update type');
      }
      
      progressText.textContent = message;
      progressFill.style.width = '25%';
      
      const response = await this.asaService.apiCall(endpoint, 'POST');
      
      progressFill.style.width = '75%';
      progressText.textContent = 'Update completed successfully!';
      
      setTimeout(() => {
        progressFill.style.width = '100%';
        progressText.textContent = 'Refreshing page...';
        
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }, 500);
      
    } catch (error) {
      console.error('Database update failed:', error);
      progressText.textContent = 'Update failed: ' + error.message;
      progressFill.style.backgroundColor = '#dc3545';
      progressFill.style.width = '100%';
    }
  }

  // Handler methods for various actions
  closeDataUpdateModal() {
    const modal = document.getElementById('dataUpdateModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  startDataUpdate() {
    console.log('Starting data update...');
    // Trigger the admin populate endpoint
    this.syncAllData();
  }

  viewDetails(type, slug) {
    console.log(`Viewing details for ${type}: ${slug}`);
    // Navigate to details view
  }

  showLocationDetails(name, map) {
    console.log(`Showing location details for ${name} on ${map}`);
    // Show location modal or details
  }

  showDetailedView(type, name) {
    console.log(`Showing detailed view for ${type}: ${name}`);
    // Show detailed modal
  }

  addToTamingPlanner(name) {
    console.log(`Adding ${name} to taming planner`);
    // Add to taming planner
  }

  exploreMap(name) {
    console.log(`Exploring map: ${name}`);
    // Navigate to map exploration
  }

  addToFavorites(type, name) {
    console.log(`Adding ${type} ${name} to favorites`);
    // Add to favorites list
  }

  sortSearchResults() {
    console.log('Sorting search results');
    // Sort results based on selection
  }

  exportSearchResults() {
    console.log('Exporting search results');
    // Export results to CSV/JSON
  }

  showMapDetails(name) {
    console.log(`Showing map details for: ${name}`);
    // Show map details panel
  }

  showMapRegions(name) {
    console.log(`Showing regions for map: ${name}`);
    // Load and show regions
  }

  showDetailTab(mapName, tabType) {
    console.log(`Showing ${tabType} tab for map: ${mapName}`);
    // Switch tabs in map details
  }

  toggleAllMapDetails() {
    console.log('Toggling all map details');
    // Expand/collapse all map details
  }

  sortMaps() {
    console.log('Sorting maps');
    // Sort maps based on selection
  }

  selectCreatureForTaming(creature) {
    console.log(`Selecting creature for taming: ${creature}`);
    // Set creature in taming calculator
    const select = document.getElementById('tamingCreature');
    if (select) {
      select.value = creature;
    }
  }

  showRegionDetails(name, map) {
    console.log(`Showing region details for ${name} on ${map}`);
    // Show region details modal
  }

  showCreatureDetails(name) {
    console.log(`Showing creature details for: ${name}`);
    // Show creature details modal
  }

  showResourceDetails(name) {
    console.log(`Showing resource details for: ${name}`);
    // Show resource details modal
  }

  changeTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('asaTheme', themeName);
  }

  handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('searchQuery')?.focus();
    }

    // Escape to close modals/results
    if (e.key === 'Escape') {
      this.hideAllModals();
    }

    // Tab numbers for navigation
    if (e.altKey && e.key >= '1' && e.key <= '5') {
      e.preventDefault();
      const tabs = ['search', 'creatures', 'maps', 'taming', 'regions'];
      const tabIndex = parseInt(e.key) - 1;
      if (tabs[tabIndex]) {
        this.showTab(tabs[tabIndex]);
      }
    }
  }

  hideAllModals() {
    // Hide any open modals or expanded sections
    document.querySelectorAll('.modal, .expanded').forEach(element => {
      element.classList.add('hidden');
    });
  }

  showLoading(message = 'Loading...') {
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) {
      const span = indicator.querySelector('span');
      if (span) {
        span.textContent = message;
        indicator.classList.remove('hidden');
      } else {
        console.error('Loading indicator span not found');
        // Fallback: create the span if it doesn't exist
        const newSpan = document.createElement('span');
        newSpan.textContent = message;
        indicator.appendChild(newSpan);
        indicator.classList.remove('hidden');
      }
    } else {
      console.error('Loading indicator element not found');
    }
  }

  hideLoading() {
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) {
      indicator.classList.add('hidden');
    }
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.innerHTML = `
      <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    `;

    // Add to container
    const container = document.querySelector('.container');
    if (container) {
      container.insertBefore(notification, container.firstChild);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);

    // Add click to dismiss
    notification.addEventListener('click', () => {
      notification.remove();
    });
  }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing ASA Service Application...');
  
  // Load saved theme
  const savedTheme = localStorage.getItem('asaTheme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  const themeSelector = document.getElementById('themeSelector');
  if (themeSelector) {
    themeSelector.value = savedTheme;
  }

  // Initialize app
  const app = new App();
  await app.init();

  // Make app globally available for debugging
  window.asaApp = app;
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && window.asaApp) {
    // Optionally refresh data when page becomes visible
    console.log('Page became visible - consider refreshing data');
  }
});

// Handle errors globally
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  if (window.asaApp) {
    window.asaApp.showError('An unexpected error occurred. Please refresh the page.');
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  if (window.asaApp) {
    window.asaApp.showError('An unexpected error occurred. Please try again.');
  }
});
