// Search Component for ASA Service
class SearchComponent {
  constructor(asaService) {
    this.asaService = asaService;
  }

  // Initialize the search component
  async init() {
    console.log('🔍 Initializing SearchComponent...');
    
    // Setup event delegation for search results
    this.setupEventDelegation();
    
    console.log('✅ SearchComponent initialized successfully');
  }

  setupEventDelegation() {
    // Remove any existing listeners to prevent duplicates
    document.removeEventListener('click', this.handleSearchEvents);
    document.removeEventListener('change', this.handleSearchEvents);
    
    // Bind the handler to maintain 'this' context
    this.handleSearchEvents = this.handleSearchEvents.bind(this);
    
    // Add event delegation for clicks and changes
    document.addEventListener('click', this.handleSearchEvents);
    document.addEventListener('change', this.handleSearchEvents);
  }

  handleSearchEvents(event) {
    const target = event.target;
    const action = target.getAttribute('data-action') || target.closest('[data-action]')?.getAttribute('data-action');
    
    if (!action) return;
    
    // Prevent event bubbling for action buttons
    if (target.closest('.result-actions, .location-item')) {
      event.stopPropagation();
    }
    
    switch (action) {
      case 'view-details':
        const detailsType = target.getAttribute('data-type') || target.closest('[data-type]')?.getAttribute('data-type');
        const detailsSlug = target.getAttribute('data-slug') || target.closest('[data-slug]')?.getAttribute('data-slug');
        if (window.app && window.app.viewDetails) {
          window.app.viewDetails(detailsType, detailsSlug);
        }
        break;
        
      case 'detailed-view':
        const type = target.getAttribute('data-type');
        const name = target.getAttribute('data-name');
        this.showDetailedView(type, name);
        break;
        
      case 'taming-planner':
        const creatureName = target.getAttribute('data-name');
        this.addToTamingPlanner(creatureName);
        break;
        
      case 'explore-map':
        const mapName = target.getAttribute('data-name');
        this.exploreMap(mapName);
        break;
        
      case 'add-favorites':
        const favType = target.getAttribute('data-type');
        const favName = target.getAttribute('data-name');
        this.addToFavorites(favType, favName);
        break;
        
      case 'location-details':
        const locationName = target.getAttribute('data-location') || target.closest('[data-location]')?.getAttribute('data-location');
        const mapLocation = target.getAttribute('data-map') || target.closest('[data-map]')?.getAttribute('data-map');
        this.showLocationDetails(locationName, mapLocation);
        break;
        
      case 'sort-results':
        this.sortSearchResults();
        break;
        
      case 'export-results':
        this.exportSearchResults();
        break;
    }
  }

  // Search functionality
  async performSearch() {
    console.log('🔍 performSearch called');
    const query = document.getElementById('searchQuery')?.value.trim();
    const type = document.getElementById('searchType')?.value;

    if (!query) {
      this.asaService.showAlert('Please enter a search query', 'warning');
      return;
    }

    this.asaService.showLoading(true);
    
    try {
      const params = new URLSearchParams({ q: query });
      if (type) params.append('type', type);
      
      console.log(`🔄 Searching for: ${query}`);
      const results = await this.asaService.apiCall(`/search?${params}`);
      console.log('✅ Search results:', results);
      this.displaySearchResults(results);
      
    } catch (error) {
      console.error('❌ Search failed:', error);
      this.asaService.showAlert(`Search failed: ${error.message}`, 'error');
    } finally {
      this.asaService.showLoading(false);
    }
  }

  displaySearchResults(results) {
    const container = document.getElementById('searchResults');
    const content = document.getElementById('searchResultsContent');
    
    if (!container || !content) {
      console.error('Search results containers not found');
      return;
    }
    
    const data = results.data || results;
    const resultsArray = data.results || data;
    
    if (!resultsArray || resultsArray.length === 0) {
      content.innerHTML = `
        <div class="no-results">
          <i class="fas fa-search"></i>
          <h3>No Results Found</h3>
          <p>Try adjusting your search terms or filters</p>
        </div>
      `;
    } else {
      // Enhanced search results with location info and symbols
      const enhancedResults = resultsArray.map(result => {
        const typeIcons = {
          'creature': 'fas fa-dragon',
          'map': 'fas fa-map',
          'region': 'fas fa-mountain',
          'resource': 'fas fa-gem',
          'cave': 'fas fa-dungeon'
        };

        const typeIcon = typeIcons[result.type] || 'fas fa-circle';
        const locations = this.getResultLocations(result);
        
        return `
          <div class="enhanced-search-result" data-action="view-details" data-type="${result.type}" data-slug="${result.slug || result.name}">
            <div class="result-header">
              <div class="result-icon">
                <i class="${typeIcon}"></i>
              </div>
              <div class="result-main">
                <h4>${result.name}</h4>
                <span class="result-type ${result.type}">${result.type.charAt(0).toUpperCase() + result.type.slice(1)}</span>
              </div>
              <div class="result-stats">
                ${result.rarity ? `<span class="stat-badge rarity-${result.rarity.toLowerCase()}">${result.rarity}</span>` : ''}
                ${result.is_tameable ? '<span class="stat-badge tameable">Tameable</span>' : ''}
                ${result.difficulty ? `<span class="stat-badge difficulty-${result.difficulty.toLowerCase().replace(' ', '-')}">${result.difficulty}</span>` : ''}
              </div>
            </div>

            <div class="result-content">
              <p class="result-description">${result.description || 'No description available'}</p>
              
              ${locations.length > 0 ? `
                <div class="result-locations">
                  <h5><i class="fas fa-map-marker-alt"></i> Found In:</h5>
                  <div class="location-grid">
                    ${locations.map(loc => `
                      <div class="location-item" data-action="location-details" data-location="${loc.name}" data-map="${loc.map}">
                        <span class="location-name">${loc.name}</span>
                        <span class="location-map">${loc.map}</span>
                        ${loc.coordinates ? `<span class="coordinates">${loc.coordinates}</span>` : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              ${result.properties ? `
                <div class="result-properties">
                  ${Object.entries(result.properties).map(([key, value]) => `
                    <div class="property">
                      <span class="property-key">${key}:</span>
                      <span class="property-value">${value}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>

            <div class="result-actions">
              <button class="action-btn primary" data-action="detailed-view" data-type="${result.type}" data-name="${result.name}">
                <i class="fas fa-eye"></i> View Details
              </button>
              ${result.type === 'creature' && result.is_tameable ? `
                <button class="action-btn secondary" data-action="taming-planner" data-name="${result.name}">
                  <i class="fas fa-heart"></i> Plan Taming
                </button>
              ` : ''}
              ${result.type === 'map' ? `
                <button class="action-btn secondary" data-action="explore-map" data-name="${result.name}">
                  <i class="fas fa-compass"></i> Explore Map
                </button>
              ` : ''}
              <button class="action-btn tertiary" data-action="add-favorites" data-type="${result.type}" data-name="${result.name}">
                <i class="fas fa-star"></i> Favorite
              </button>
            </div>
          </div>
        `;
      }).join('');

      content.innerHTML = `
        <div class="results-header">
          <h3><i class="fas fa-search"></i> Search Results</h3>
          <div class="results-meta">
            <span class="result-count">${resultsArray.length} results found</span>
            <div class="results-controls">
              <select id="resultsSort" data-action="sort-results">
                <option value="relevance">Sort by Relevance</option>
                <option value="name">Sort by Name</option>
                <option value="type">Sort by Type</option>
              </select>
              <button class="btn btn-secondary btn-sm" data-action="export-results">
                <i class="fas fa-download"></i> Export
              </button>
            </div>
          </div>
        </div>
        <div class="enhanced-results-grid">
          ${enhancedResults}
        </div>
      `;
    }
    
    container.classList.remove('hidden');
  }

  // Enhanced Search Result Functions
  getResultLocations(result) {
    // Mock location data - in real app, this would come from the API
    const mockLocations = {
      'Rex': [
        { name: 'Northern Plains', map: 'The Island', coordinates: '50.2, 25.8' },
        { name: 'Redwood Forest', map: 'The Center', coordinates: '42.1, 58.3' }
      ],
      'Parasaur': [
        { name: 'Beach Areas', map: 'The Island', coordinates: '30.5, 70.2' },
        { name: 'Central Valley', map: 'Ragnarok', coordinates: '45.8, 35.1' }
      ],
      'Metal': [
        { name: 'Mountain Peaks', map: 'The Island', coordinates: '80.2, 15.8' },
        { name: 'Volcano', map: 'The Center', coordinates: '62.1, 78.3' }
      ]
    };

    return mockLocations[result.name] || [
      { name: 'Various Locations', map: 'Multiple Maps', coordinates: null }
    ];
  }

  sortSearchResults() {
    const sortBy = document.getElementById('resultsSort')?.value;
    const grid = document.querySelector('.enhanced-results-grid');
    if (!grid) return;

    const results = Array.from(grid.children);
    
    results.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.querySelector('h4')?.textContent || '';
          bValue = b.querySelector('h4')?.textContent || '';
          break;
        case 'type':
          aValue = a.querySelector('.result-type')?.textContent || '';
          bValue = b.querySelector('.result-type')?.textContent || '';
          break;
        case 'relevance':
        default:
          return 0; // Keep original order for relevance
      }
      
      return aValue.localeCompare(bValue);
    });
    
    results.forEach(result => grid.appendChild(result));
  }

  exportSearchResults() {
    const results = document.querySelectorAll('.enhanced-search-result');
    const data = Array.from(results).map(result => ({
      name: result.querySelector('h4')?.textContent || '',
      type: result.querySelector('.result-type')?.textContent || '',
      description: result.querySelector('.result-description')?.textContent || ''
    }));

    const csv = [
      'Name,Type,Description',
      ...data.map(row => `"${row.name}","${row.type}","${row.description}"`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asa-search-results.csv';
    a.click();
    URL.revokeObjectURL(url);

    this.asaService.showAlert('Search results exported successfully!', 'success');
  }

  showDetailedView(type, name) {
    this.asaService.showAlert(`Opening detailed view for ${type}: ${name}`, 'info');
    // Could implement detailed view modals here
  }

  addToTamingPlanner(creatureName) {
    // Add to local storage taming planner
    const planner = JSON.parse(localStorage.getItem('asa-taming-planner') || '[]');
    if (!planner.find(item => item.name === creatureName)) {
      planner.push({
        name: creatureName,
        level: 1,
        addedAt: new Date().toISOString()
      });
      localStorage.setItem('asa-taming-planner', JSON.stringify(planner));
      this.asaService.showAlert(`${creatureName} added to taming planner!`, 'success');
    } else {
      this.asaService.showAlert(`${creatureName} is already in your taming planner`, 'warning');
    }
  }

  exploreMap(mapName) {
    // Switch to maps tab and load the specific map
    this.asaService.showTab('maps');
    setTimeout(() => {
      this.asaService.loadMaps();
      this.asaService.showAlert(`Exploring ${mapName}...`, 'info');
    }, 500);
  }

  addToFavorites(type, name) {
    // Add to local storage favorites
    const favorites = JSON.parse(localStorage.getItem('asa-favorites') || '[]');
    const favoriteId = `${type}-${name}`;
    
    if (!favorites.find(item => item.id === favoriteId)) {
      favorites.push({
        id: favoriteId,
        type: type,
        name: name,
        addedAt: new Date().toISOString()
      });
      localStorage.setItem('asa-favorites', JSON.stringify(favorites));
      this.asaService.showAlert(`${name} added to favorites!`, 'success');
    } else {
      this.asaService.showAlert(`${name} is already in your favorites`, 'warning');
    }
  }

  showLocationDetails(locationName, mapName) {
    this.asaService.showAlert(`Location: ${locationName} on ${mapName}`, 'info');
    // In a real app, this would show detailed location info
  }
}
