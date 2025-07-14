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
