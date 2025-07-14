/**
 * Search Component
 * Handles all search-related functionality
 */

class SearchComponent {
  constructor(asaService) {
    this.asaService = asaService;
    this.searchResults = [];
    this.currentSort = 'relevance';
  }

  /**
   * Perform search operation
   */
  async performSearch() {
    console.log('🔍 performSearch called');
    const query = document.getElementById('searchQuery').value.trim();
    const type = document.getElementById('searchType').value;

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

  /**
   * Display search results
   */
  displaySearchResults(results) {
    const container = document.getElementById('searchResults');
    const content = document.getElementById('searchResultsContent');
    
    if (!container || !content) return;

    const data = results.data || results;
    const resultsArray = data.results || data;
    
    if (!Array.isArray(resultsArray) || resultsArray.length === 0) {
      content.innerHTML = '<div class="no-results">No results found. Try different search terms.</div>';
      container.classList.remove('hidden');
      return;
    }

    this.searchResults = resultsArray;
    
    let html = `
      <div class="results-header">
        <div class="results-meta">
          <span class="result-count">${resultsArray.length} results found</span>
        </div>
        <div class="results-controls">
          <select id="sortResults" onchange="window.app.searchComponent.sortSearchResults()">
            <option value="relevance">Sort by Relevance</option>
            <option value="name">Sort by Name</option>
            <option value="type">Sort by Type</option>
          </select>
          <button class="btn btn-sm btn-secondary" onclick="window.app.searchComponent.exportSearchResults()">
            <i class="fas fa-download"></i> Export
          </button>
        </div>
      </div>
      <div class="enhanced-results-grid">
    `;

    resultsArray.forEach(result => {
      html += this.createResultCard(result);
    });

    html += '</div>';
    content.innerHTML = html;
    container.classList.remove('hidden');
  }

  /**
   * Create result card HTML
   */
  createResultCard(result) {
    const type = result.type || 'unknown';
    const name = result.name || 'Unknown';
    const description = result.description || 'No description available.';
    
    return `
      <div class="enhanced-search-result" onclick="window.app.searchComponent.showDetailedView('${type}', '${name}')">
        <div class="result-header">
          <div class="result-icon">
            <i class="fas fa-${this.getTypeIcon(type)}"></i>
          </div>
          <div class="result-main">
            <h4>${name}</h4>
            <div class="result-stats">
              <span class="result-type ${type}">${type}</span>
              ${result.is_tameable ? '<span class="stat-badge tameable">Tameable</span>' : ''}
              ${result.rarity ? `<span class="stat-badge rarity-${result.rarity.toLowerCase()}">${result.rarity}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="result-content">
          <p class="result-description">${description}</p>
          ${result.locations ? this.createLocationsSection(result.locations) : ''}
          ${result.properties ? this.createPropertiesSection(result.properties) : ''}
        </div>
        <div class="result-actions">
          <button class="action-btn primary" onclick="event.stopPropagation(); window.app.searchComponent.showDetailedView('${type}', '${name}')">
            <i class="fas fa-eye"></i> View Details
          </button>
          ${result.type === 'creature' ? `
            <button class="action-btn secondary" onclick="event.stopPropagation(); window.app.searchComponent.addToTamingPlanner('${name}')">
              <i class="fas fa-plus"></i> Add to Taming
            </button>
          ` : ''}
          ${result.map_name ? `
            <button class="action-btn tertiary" onclick="event.stopPropagation(); window.app.searchComponent.exploreMap('${result.map_name}')">
              <i class="fas fa-map"></i> Explore Map
            </button>
          ` : ''}
          <button class="action-btn tertiary" onclick="event.stopPropagation(); window.app.searchComponent.addToFavorites('${type}', '${name}')">
            <i class="fas fa-heart"></i> Favorite
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Get icon for result type
   */
  getTypeIcon(type) {
    const icons = {
      creature: 'dragon',
      map: 'map',
      region: 'mountain',
      resource: 'gem',
      cave: 'cave',
      item: 'box'
    };
    return icons[type] || 'question';
  }

  /**
   * Create locations section HTML
   */
  createLocationsSection(locations) {
    if (!Array.isArray(locations) || locations.length === 0) return '';

    let html = `
      <div class="result-locations">
        <h5><i class="fas fa-map-marker"></i> Found on Maps</h5>
        <div class="location-grid">
    `;

    locations.forEach(location => {
      html += `
        <div class="location-item" onclick="window.app.searchComponent.showLocationDetails('${location.name}', '${location.map}')">
          <span class="location-name">${location.name}</span>
          <span class="location-map">${location.map}</span>
          ${location.coordinates ? `<span class="coordinates">${location.coordinates}</span>` : ''}
        </div>
      `;
    });

    html += '</div></div>';
    return html;
  }

  /**
   * Create properties section HTML
   */
  createPropertiesSection(properties) {
    if (!properties || typeof properties !== 'object') return '';

    let html = '<div class="result-properties">';
    
    Object.entries(properties).forEach(([key, value]) => {
      html += `
        <div class="property">
          <span class="property-key">${key}:</span>
          <span class="property-value">${value}</span>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * Sort search results
   */
  sortSearchResults() {
    const sortBy = document.getElementById('sortResults').value;
    this.currentSort = sortBy;

    if (!this.searchResults.length) return;

    let sortedResults = [...this.searchResults];

    switch (sortBy) {
      case 'name':
        sortedResults.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'type':
        sortedResults.sort((a, b) => (a.type || '').localeCompare(b.type || ''));
        break;
      case 'relevance':
      default:
        // Keep original order for relevance
        break;
    }

    this.searchResults = sortedResults;
    this.displaySearchResults({ data: { results: sortedResults } });
  }

  /**
   * Export search results
   */
  exportSearchResults() {
    if (!this.searchResults.length) {
      this.asaService.showAlert('No results to export', 'warning');
      return;
    }

    const csvData = this.convertToCSV(this.searchResults);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asa-search-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    this.asaService.showAlert('Search results exported successfully', 'success');
  }

  /**
   * Convert results to CSV format
   */
  convertToCSV(results) {
    const headers = ['Name', 'Type', 'Description', 'Tameable', 'Rarity'];
    const csvRows = [headers.join(',')];

    results.forEach(result => {
      const row = [
        `"${(result.name || '').replace(/"/g, '""')}"`,
        `"${(result.type || '').replace(/"/g, '""')}"`,
        `"${(result.description || '').replace(/"/g, '""')}"`,
        result.is_tameable ? 'Yes' : 'No',
        `"${(result.rarity || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Show detailed view of a result
   */
  showDetailedView(type, name) {
    this.asaService.showAlert(`Showing detailed view for ${type}: ${name}`, 'info');
    // TODO: Implement detailed view modal
  }

  /**
   * Add creature to taming planner
   */
  addToTamingPlanner(creatureName) {
    this.asaService.showAlert(`Added ${creatureName} to taming planner`, 'success');
    // TODO: Implement taming planner functionality
  }

  /**
   * Explore map
   */
  exploreMap(mapName) {
    this.asaService.showAlert(`Exploring map: ${mapName}`, 'info');
    // Switch to maps tab and load specific map
    this.asaService.showTab('maps');
  }

  /**
   * Add to favorites
   */
  addToFavorites(type, name) {
    const favorites = JSON.parse(localStorage.getItem('asa-favorites') || '[]');
    const favorite = { type, name, timestamp: Date.now() };
    
    if (!favorites.some(fav => fav.type === type && fav.name === name)) {
      favorites.push(favorite);
      localStorage.setItem('asa-favorites', JSON.stringify(favorites));
      this.asaService.showAlert(`Added ${name} to favorites`, 'success');
    } else {
      this.asaService.showAlert(`${name} is already in favorites`, 'info');
    }
  }

  /**
   * Show location details
   */
  showLocationDetails(locationName, mapName) {
    this.asaService.showAlert(`Location: ${locationName} on ${mapName}`, 'info');
    // TODO: Implement location details modal
  }
}
