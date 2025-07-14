/**
 * RegionsComponent.js
 * Advanced region exploration and management system for ASA Service
 */
class RegionsComponent {
  constructor(asaService) {
    this.asaService = asaService;
    this.isLoaded = false;
    this.regionsData = [];
    this.mapsData = [];
    this.currentRegions = [];
    this.selectedMap = null;
  }

  async init() {
    console.log('Initializing RegionsComponent...');
    this.setupEventListeners();
    await this.loadInitialData();
    this.isLoaded = true;
  }

  setupEventListeners() {
    // Map selection
    const mapSelect = document.getElementById('regionMap');
    if (mapSelect) {
      mapSelect.addEventListener('change', () => {
        this.onMapChange();
      });
    }

    // Biome filter
    const biomeSelect = document.getElementById('regionBiome');
    if (biomeSelect) {
      biomeSelect.addEventListener('change', () => {
        this.onBiomeChange();
      });
    }

    // Region actions
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-region-action]')) {
        const action = e.target.dataset.regionAction;
        this.handleRegionAction(action, e.target);
      }
    });

    // Region details expansion
    document.addEventListener('click', (e) => {
      if (e.target.matches('.region-card, .region-card *')) {
        const card = e.target.closest('.region-card');
        if (card && !e.target.matches('button, button *')) {
          this.toggleRegionDetails(card);
        }
      }
    });
  }

  async loadInitialData() {
    try {
      // Load maps for dropdown
      const mapsResponse = await this.asaService.apiCall('/maps');
      this.mapsData = mapsResponse.data || [];
      
      this.populateMapDropdown();
      console.log(`Loaded ${this.mapsData.length} maps for region explorer`);
    } catch (error) {
      console.error('Error loading initial region data:', error);
    }
  }

  populateMapDropdown() {
    const select = document.getElementById('regionMap');
    if (!select) return;

    // Clear existing options
    select.innerHTML = '<option value="">Choose Map...</option>';

    // Group maps by type
    const grouped = this.groupMapsByType();
    
    Object.keys(grouped).forEach(type => {
      if (grouped[type].length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = type;
        
        grouped[type].forEach(map => {
          const option = document.createElement('option');
          option.value = map.id;
          option.textContent = map.name;
          option.dataset.type = type;
          option.dataset.size = map.size || 'unknown';
          optgroup.appendChild(option);
        });
        
        select.appendChild(optgroup);
      }
    });
  }

  groupMapsByType() {
    const groups = {
      'Official Maps': [],
      'DLC Maps': [],
      'Expansion Maps': [],
      'Modded Maps': []
    };

    this.mapsData.forEach(map => {
      let type = 'Official Maps'; // default
      
      if (map.type) {
        switch (map.type.toLowerCase()) {
          case 'dlc':
            type = 'DLC Maps';
            break;
          case 'expansion':
            type = 'Expansion Maps';
            break;
          case 'modded':
          case 'mod':
            type = 'Modded Maps';
            break;
        }
      } else if (map.name) {
        // Fallback categorization based on name patterns
        const name = map.name.toLowerCase();
        if (name.includes('scorched') || name.includes('aberration') || 
            name.includes('extinction') || name.includes('genesis')) {
          type = 'DLC Maps';
        } else if (name.includes('ragnarok') || name.includes('valguero') || 
                   name.includes('crystal') || name.includes('fjordur')) {
          type = 'Expansion Maps';
        }
      }
      
      groups[type].push(map);
    });

    // Sort maps within each group
    Object.keys(groups).forEach(type => {
      groups[type].sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }

  async onMapChange() {
    const select = document.getElementById('regionMap');
    if (!select || !select.value) {
      this.clearMapInfo();
      this.clearRegions();
      return;
    }

    this.selectedMap = this.mapsData.find(m => m.id == select.value);
    if (this.selectedMap) {
      this.displayMapInfo(this.selectedMap);
      await this.loadRegionsForMap(this.selectedMap.id);
    }
  }

  displayMapInfo(map) {
    // Create or update map info panel
    let infoPanel = document.getElementById('mapInfoPanel');
    if (!infoPanel) {
      infoPanel = document.createElement('div');
      infoPanel.id = 'mapInfoPanel';
      infoPanel.className = 'card map-info-panel';
      
      const regionsCard = document.querySelector('#regionsTab .card');
      if (regionsCard) {
        regionsCard.parentNode.insertBefore(infoPanel, regionsCard.nextSibling);
      }
    }

    infoPanel.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">
          <i class="fas fa-map-marked-alt"></i> ${map.name}
        </h3>
      </div>
      <div class="map-info-grid">
        <div class="map-image-section">
          ${map.image_url ? 
            `<img src="${map.image_url}" alt="${map.name}" class="map-preview" onerror="this.style.display='none'">` :
            `<div class="map-placeholder"><i class="fas fa-map"></i></div>`
          }
        </div>
        <div class="map-details-section">
          <div class="map-stats">
            <div class="stat-row">
              <span class="stat-label">Type:</span>
              <span class="stat-value">${map.type || 'Official'}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Size:</span>
              <span class="stat-value">${map.size || 'Unknown'}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Difficulty:</span>
              <span class="stat-value difficulty-${(map.difficulty || 'medium').toLowerCase()}">
                ${this.formatDifficulty(map.difficulty)}
              </span>
            </div>
            ${map.temperature_range ? `
              <div class="stat-row">
                <span class="stat-label">Temperature:</span>
                <span class="stat-value">${map.temperature_range}</span>
              </div>
            ` : ''}
          </div>
          ${map.description ? `
            <div class="map-description">
              <h4>Description</h4>
              <p>${map.description}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Add styles for map info panel
    if (!document.getElementById('mapInfoStyles')) {
      const styles = document.createElement('style');
      styles.id = 'mapInfoStyles';
      styles.textContent = `
        .map-info-panel {
          margin: 1.5rem 0;
          animation: slideIn 0.3s ease-out;
        }
        
        .map-info-grid {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 2rem;
          padding: 1.5rem;
        }
        
        .map-preview {
          width: 100%;
          height: 150px;
          object-fit: cover;
          border-radius: 12px;
          border: 2px solid var(--border-secondary);
          transition: all 0.3s ease;
        }
        
        .map-preview:hover {
          border-color: var(--obelisk-blue);
          transform: scale(1.05);
        }
        
        .map-placeholder {
          width: 100%;
          height: 150px;
          background: var(--surface-2);
          border: 2px dashed var(--border-secondary);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-tertiary);
          font-size: 2rem;
        }
        
        .map-stats {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        
        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-secondary);
        }
        
        .stat-row:last-child {
          border-bottom: none;
        }
        
        .stat-label {
          color: var(--text-secondary);
          font-weight: 500;
        }
        
        .stat-value {
          color: var(--text-primary);
          font-weight: 600;
        }
        
        .stat-value.difficulty-easy {
          color: var(--obelisk-green);
        }
        
        .stat-value.difficulty-medium {
          color: #ffcc00;
        }
        
        .stat-value.difficulty-hard {
          color: var(--obelisk-red);
        }
        
        .map-description h4 {
          color: var(--obelisk-blue);
          margin-bottom: 0.5rem;
          font-size: 1.1rem;
        }
        
        .map-description p {
          color: var(--text-secondary);
          line-height: 1.6;
        }
        
        @media (max-width: 768px) {
          .map-info-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }
      `;
      document.head.appendChild(styles);
    }
  }

  formatDifficulty(difficulty) {
    if (!difficulty) return 'Medium';
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  }

  clearMapInfo() {
    const infoPanel = document.getElementById('mapInfoPanel');
    if (infoPanel) {
      infoPanel.remove();
    }
  }

  async loadRegionsForMap(mapId) {
    try {
      const biome = document.getElementById('regionBiome')?.value;
      let url = `/regions?map_id=${mapId}`;
      if (biome) {
        url += `&biome=${biome}`;
      }

      const response = await this.asaService.apiCall(url);
      this.currentRegions = response.data || [];
      
      this.displayRegions();
      console.log(`Loaded ${this.currentRegions.length} regions for map ${mapId}`);
    } catch (error) {
      console.error('Error loading regions for map:', error);
      this.asaService.showNotification('Failed to load regions for selected map', 'error');
    }
  }

  onBiomeChange() {
    if (this.selectedMap) {
      this.loadRegionsForMap(this.selectedMap.id);
    }
  }

  displayRegions() {
    const resultsContainer = document.getElementById('regionsResults');
    const contentContainer = document.getElementById('regionsContent');
    
    if (!contentContainer) return;

    if (this.currentRegions.length === 0) {
      contentContainer.innerHTML = `
        <div class="no-results">
          <i class="fas fa-search"></i>
          <h3>No Regions Found</h3>
          <p>No regions match your current criteria. Try adjusting your filters.</p>
        </div>
      `;
    } else {
      // Group regions by biome for better organization
      const grouped = this.groupRegionsByBiome();
      
      contentContainer.innerHTML = `
        <div class="regions-overview">
          <div class="regions-stats">
            <div class="stat-item">
              <span class="stat-number">${this.currentRegions.length}</span>
              <span class="stat-label">Total Regions</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">${Object.keys(grouped).length}</span>
              <span class="stat-label">Biome Types</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">${this.calculateAverageDanger()}</span>
              <span class="stat-label">Avg Danger</span>
            </div>
          </div>
        </div>
        
        <div class="regions-grid">
          ${Object.keys(grouped).map(biome => `
            <div class="biome-section">
              <div class="biome-header">
                <h3 class="biome-title">
                  <i class="fas fa-${this.getBiomeIcon(biome)}"></i>
                  ${biome} (${grouped[biome].length})
                </h3>
              </div>
              <div class="biome-regions">
                ${grouped[biome].map(region => this.createRegionCard(region)).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Show results section with animation
    if (resultsContainer) {
      resultsContainer.classList.remove('hidden');
      resultsContainer.style.animation = 'slideIn 0.3s ease-out';
    }

    // Add region card styles
    this.addRegionStyles();
  }

  groupRegionsByBiome() {
    const groups = {};
    
    this.currentRegions.forEach(region => {
      const biome = region.biome || 'Unknown';
      if (!groups[biome]) {
        groups[biome] = [];
      }
      groups[biome].push(region);
    });

    // Sort regions within each biome by name
    Object.keys(groups).forEach(biome => {
      groups[biome].sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }

  getBiomeIcon(biome) {
    const icons = {
      'Forest': 'tree',
      'Desert': 'sun',
      'Snow': 'snowflake',
      'Ocean': 'water',
      'Cave': 'mountain',
      'Swamp': 'seedling',
      'Volcanic': 'fire',
      'Arctic': 'icicles',
      'Unknown': 'question-circle'
    };
    
    return icons[biome] || 'map-marker-alt';
  }

  createRegionCard(region) {
    const dangerClass = this.getDangerClass(region.danger_level);
    const dangerIcon = this.getDangerIcon(region.danger_level);
    
    return `
      <div class="region-card ${dangerClass}" data-region-id="${region.id}">
        <div class="region-header">
          <h4 class="region-name">${region.name}</h4>
          <div class="region-danger">
            <i class="fas fa-${dangerIcon}"></i>
            <span>${region.danger_level || 'Unknown'}</span>
          </div>
        </div>
        
        <div class="region-details">
          <div class="detail-row">
            <span class="detail-label">Biome:</span>
            <span class="detail-value">${region.biome || 'Unknown'}</span>
          </div>
          
          ${region.temperature ? `
            <div class="detail-row">
              <span class="detail-label">Temperature:</span>
              <span class="detail-value">${region.temperature}</span>
            </div>
          ` : ''}
          
          ${region.coordinates ? `
            <div class="detail-row">
              <span class="detail-label">Coordinates:</span>
              <span class="detail-value">${region.coordinates}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="region-expanded-details" style="display: none;">
          ${region.resources ? `
            <div class="resources-section">
              <h5><i class="fas fa-gem"></i> Resources</h5>
              <p>${region.resources}</p>
            </div>
          ` : ''}
          
          ${region.creatures ? `
            <div class="creatures-section">
              <h5><i class="fas fa-paw"></i> Common Creatures</h5>
              <p>${region.creatures}</p>
            </div>
          ` : ''}
          
          ${region.notes ? `
            <div class="notes-section">
              <h5><i class="fas fa-sticky-note"></i> Notes</h5>
              <p>${region.notes}</p>
            </div>
          ` : ''}
          
          <div class="region-actions">
            <button class="btn btn-sm btn-secondary" data-region-action="favorite" data-region-id="${region.id}">
              <i class="fas fa-star"></i> Favorite
            </button>
            <button class="btn btn-sm btn-primary" data-region-action="navigate" data-region-id="${region.id}">
              <i class="fas fa-route"></i> Navigate
            </button>
          </div>
        </div>
        
        <div class="region-toggle">
          <i class="fas fa-chevron-down"></i>
        </div>
      </div>
    `;
  }

  getDangerClass(dangerLevel) {
    if (!dangerLevel) return 'danger-unknown';
    
    switch (dangerLevel.toLowerCase()) {
      case 'very low':
      case 'low':
        return 'danger-low';
      case 'medium':
      case 'moderate':
        return 'danger-medium';
      case 'high':
      case 'very high':
      case 'extreme':
        return 'danger-high';
      default:
        return 'danger-unknown';
    }
  }

  getDangerIcon(dangerLevel) {
    if (!dangerLevel) return 'question-circle';
    
    switch (dangerLevel.toLowerCase()) {
      case 'very low':
      case 'low':
        return 'shield-alt';
      case 'medium':
      case 'moderate':
        return 'exclamation-triangle';
      case 'high':
      case 'very high':
      case 'extreme':
        return 'skull-crossbones';
      default:
        return 'question-circle';
    }
  }

  calculateAverageDanger() {
    if (this.currentRegions.length === 0) return 'N/A';
    
    const dangerValues = {
      'very low': 1,
      'low': 2,
      'medium': 3,
      'moderate': 3,
      'high': 4,
      'very high': 5,
      'extreme': 5
    };
    
    let total = 0;
    let count = 0;
    
    this.currentRegions.forEach(region => {
      if (region.danger_level) {
        const value = dangerValues[region.danger_level.toLowerCase()];
        if (value) {
          total += value;
          count++;
        }
      }
    });
    
    if (count === 0) return 'Unknown';
    
    const average = total / count;
    if (average <= 1.5) return 'Low';
    if (average <= 2.5) return 'Medium';
    if (average <= 3.5) return 'Moderate';
    if (average <= 4.5) return 'High';
    return 'Extreme';
  }

  toggleRegionDetails(card) {
    const expandedDetails = card.querySelector('.region-expanded-details');
    const toggle = card.querySelector('.region-toggle i');
    
    if (expandedDetails.style.display === 'none') {
      expandedDetails.style.display = 'block';
      toggle.classList.remove('fa-chevron-down');
      toggle.classList.add('fa-chevron-up');
      card.classList.add('expanded');
    } else {
      expandedDetails.style.display = 'none';
      toggle.classList.remove('fa-chevron-up');
      toggle.classList.add('fa-chevron-down');
      card.classList.remove('expanded');
    }
  }

  handleRegionAction(action, button) {
    const regionId = button.dataset.regionId;
    
    switch (action) {
      case 'favorite':
        this.toggleFavoriteRegion(regionId);
        break;
      case 'navigate':
        this.navigateToRegion(regionId);
        break;
      default:
        console.warn('Unknown region action:', action);
    }
  }

  toggleFavoriteRegion(regionId) {
    const favorites = JSON.parse(localStorage.getItem('regionFavorites') || '[]');
    const index = favorites.indexOf(regionId);
    
    if (index === -1) {
      favorites.push(regionId);
      this.asaService.showNotification('Region added to favorites!', 'success');
    } else {
      favorites.splice(index, 1);
      this.asaService.showNotification('Region removed from favorites', 'info');
    }
    
    localStorage.setItem('regionFavorites', JSON.stringify(favorites));
    this.updateFavoriteButtons();
  }

  navigateToRegion(regionId) {
    const region = this.currentRegions.find(r => r.id == regionId);
    if (region && region.coordinates) {
      // This would typically open a map view or navigation interface
      this.asaService.showNotification(`Navigation to ${region.name} (${region.coordinates})`, 'info');
      // In a real implementation, this could open an interactive map
    } else {
      this.asaService.showNotification('No coordinates available for this region', 'warning');
    }
  }

  updateFavoriteButtons() {
    const favorites = JSON.parse(localStorage.getItem('regionFavorites') || '[]');
    
    document.querySelectorAll('[data-region-action="favorite"]').forEach(button => {
      const regionId = button.dataset.regionId;
      const icon = button.querySelector('i');
      
      if (favorites.includes(regionId)) {
        icon.classList.remove('far');
        icon.classList.add('fas');
        button.classList.add('favorited');
      } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
        button.classList.remove('favorited');
      }
    });
  }

  clearRegions() {
    const resultsContainer = document.getElementById('regionsResults');
    if (resultsContainer) {
      resultsContainer.classList.add('hidden');
    }
    this.currentRegions = [];
  }

  addRegionStyles() {
    if (document.getElementById('regionStyles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'regionStyles';
    styles.textContent = `
      .regions-overview {
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: var(--surface-1);
        border-radius: 16px;
        border: 1px solid var(--border-secondary);
      }
      
      .regions-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1.5rem;
      }
      
      .stat-item {
        text-align: center;
      }
      
      .stat-number {
        display: block;
        font-size: 2rem;
        font-weight: 800;
        background: linear-gradient(135deg, var(--obelisk-blue), var(--obelisk-green));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      .stat-label {
        color: var(--text-secondary);
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-top: 0.5rem;
      }
      
      .biome-section {
        margin-bottom: 2.5rem;
      }
      
      .biome-header {
        margin-bottom: 1.5rem;
      }
      
      .biome-title {
        color: var(--text-primary);
        font-size: 1.25rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      
      .biome-title i {
        color: var(--obelisk-blue);
      }
      
      .biome-regions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 1.5rem;
      }
      
      .region-card {
        background: var(--surface-1);
        border: 1px solid var(--border-secondary);
        border-radius: 16px;
        padding: 1.5rem;
        position: relative;
        transition: all 0.3s ease;
        cursor: pointer;
        overflow: hidden;
      }
      
      .region-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--border-secondary);
        transition: all 0.3s ease;
      }
      
      .region-card.danger-low::before {
        background: var(--obelisk-green);
      }
      
      .region-card.danger-medium::before {
        background: #ffcc00;
      }
      
      .region-card.danger-high::before {
        background: var(--obelisk-red);
      }
      
      .region-card:hover {
        transform: translateY(-4px);
        border-color: var(--obelisk-blue);
        box-shadow: var(--shadow-lg);
      }
      
      .region-card.expanded {
        transform: translateY(-2px);
        border-color: var(--obelisk-blue);
      }
      
      .region-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
      }
      
      .region-name {
        color: var(--text-primary);
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        flex: 1;
      }
      
      .region-danger {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        font-weight: 600;
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        background: var(--surface-2);
      }
      
      .danger-low .region-danger {
        color: var(--obelisk-green);
        background: rgba(48, 209, 88, 0.1);
      }
      
      .danger-medium .region-danger {
        color: #ffcc00;
        background: rgba(255, 204, 0, 0.1);
      }
      
      .danger-high .region-danger {
        color: var(--obelisk-red);
        background: rgba(255, 59, 48, 0.1);
      }
      
      .region-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      
      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.9rem;
      }
      
      .detail-label {
        color: var(--text-secondary);
        font-weight: 500;
      }
      
      .detail-value {
        color: var(--text-primary);
        font-weight: 600;
      }
      
      .region-expanded-details {
        border-top: 1px solid var(--border-secondary);
        padding-top: 1rem;
        margin-top: 1rem;
      }
      
      .region-expanded-details h5 {
        color: var(--obelisk-blue);
        font-size: 0.95rem;
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .region-expanded-details p {
        color: var(--text-secondary);
        font-size: 0.9rem;
        line-height: 1.5;
        margin-bottom: 1rem;
      }
      
      .region-actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 1rem;
      }
      
      .region-toggle {
        position: absolute;
        bottom: 0.75rem;
        right: 0.75rem;
        color: var(--text-tertiary);
        font-size: 0.8rem;
        transition: all 0.3s ease;
      }
      
      .region-card:hover .region-toggle {
        color: var(--obelisk-blue);
      }
      
      .no-results {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--text-secondary);
      }
      
      .no-results i {
        font-size: 3rem;
        margin-bottom: 1rem;
        color: var(--text-tertiary);
      }
      
      .no-results h3 {
        color: var(--text-primary);
        margin-bottom: 0.5rem;
      }
      
      @media (max-width: 768px) {
        .biome-regions {
          grid-template-columns: 1fr;
        }
        
        .regions-stats {
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        }
      }
    `;
    document.head.appendChild(styles);
  }

  async refresh() {
    this.isLoaded = false;
    await this.loadInitialData();
    if (this.selectedMap) {
      await this.loadRegionsForMap(this.selectedMap.id);
    }
    this.isLoaded = true;
    console.log('RegionsComponent refreshed');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RegionsComponent;
}
