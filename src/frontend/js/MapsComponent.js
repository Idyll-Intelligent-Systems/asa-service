// Maps Component for ASA Service
class MapsComponent {
  constructor(asaService) {
    this.asaService = asaService;
  }

  // Initialize the maps component
  async init() {
    console.log('🗺️ Initializing MapsComponent...');
    // Setup any specific event listeners or initial state here
    // For now, just log that it's initialized
    console.log('✅ MapsComponent initialized successfully');
  }

  async loadMaps() {
    const type = document.getElementById('mapType')?.value;
    const size = document.getElementById('mapSize')?.value;
    const button = document.getElementById('loadMapsBtn');

    // Set button to loading state
    this.asaService.setButtonLoading(button, true);
    this.asaService.showLoading(true);
    
    try {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (size) params.append('size', size);
      
      this.asaService.showAlert('Loading maps data...', 'info');
      
      const results = await this.asaService.apiCall(`/maps?${params}`);
      this.displayMaps(results);
      
      const count = Array.isArray(results.data) ? results.data.length : (results.data?.results?.length || 0);
      this.asaService.showAlert(`Loaded ${count} maps successfully`, 'success');
      
    } catch (error) {
      console.error('Failed to load maps:', error);
      this.asaService.showAlert(`Failed to load maps: ${error.message}`, 'error');
    } finally {
      this.asaService.setButtonLoading(button, false);
      this.asaService.showLoading(false);
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

  displayMaps(results) {
    const container = document.getElementById('mapsResults');
    const content = document.getElementById('mapsContent');
    
    if (!container || !content) {
      console.error('Maps results containers not found');
      return;
    }
    
    const data = results.data || results;
    const mapsArray = Array.isArray(data) ? data : (data.results || []);
    
    if (!mapsArray || mapsArray.length === 0) {
      content.innerHTML = '<div class="no-results">No maps found.</div>';
    } else {
      // Create interactive map grid
      const mapGrid = mapsArray.map(map => `
        <div class="interactive-map-card" data-map-id="${map.id || map.name}">
          <div class="map-header">
            <h3>${map.name}</h3>
            <span class="map-type ${map.type || 'official'}">${map.type || 'Official'}</span>
          </div>
          
          <div class="map-image-container">
            <img src="${map.image || this.asaService.getMapImagePath(map.name)}" 
                 alt="${map.name}" 
                 class="map-image"
                 onerror="this.src='/images/maps/default.jpg'">
            <div class="map-overlay">
              <div class="map-stats">
                <div class="stat">
                  <i class="fas fa-mountain"></i>
                  <span>${map.regions?.length || 12} Regions</span>
                </div>
                <div class="stat">
                  <i class="fas fa-paw"></i>
                  <span>${map.creatures?.length || 45} Creatures</span>
                </div>
                <div class="stat">
                  <i class="fas fa-gem"></i>
                  <span>${map.resources?.length || 28} Resources</span>
                </div>
                <div class="stat">
                  <i class="fas fa-dungeon"></i>
                  <span>${map.caves?.length || 8} Caves</span>
                </div>
              </div>
            </div>
          </div>

          <div class="map-info">
            <p class="map-description">${map.description || 'Explore this unique ARK map with diverse biomes and creatures.'}</p>
            <div class="map-features">
              <span class="feature">Size: ${map.size || 'Large'}</span>
              <span class="feature">Climate: ${map.climate || 'Varied'}</span>
              <span class="feature">DLC: ${map.dlc ? 'Yes' : 'No'}</span>
            </div>
          </div>

          <div class="map-actions">
            <button class="btn btn-primary" onclick="showMapDetails('${map.name}')">
              <i class="fas fa-map-marked-alt"></i> Explore Map
            </button>
            <button class="btn btn-secondary" onclick="showMapRegions('${map.name}')">
              <i class="fas fa-layer-group"></i> View Regions
            </button>
          </div>

          <!-- Interactive Map Details (Initially Hidden) -->
          <div class="map-details-panel" id="details-${map.name}" style="display: none;">
            <div class="details-tabs">
              <button class="details-tab active" onclick="showDetailTab('${map.name}', 'regions')">Regions</button>
              <button class="details-tab" onclick="showDetailTab('${map.name}', 'creatures')">Creatures</button>
              <button class="details-tab" onclick="showDetailTab('${map.name}', 'resources')">Resources</button>
              <button class="details-tab" onclick="showDetailTab('${map.name}', 'caves')">Caves</button>
            </div>

            <div class="details-content">
              <div class="detail-tab-content" id="regions-${map.name}">
                <div class="regions-grid" id="regions-grid-${map.name}">
                  Loading regions...
                </div>
              </div>
              <div class="detail-tab-content" id="creatures-${map.name}" style="display: none;">
                <div class="creatures-grid" id="creatures-grid-${map.name}">
                  Loading creatures...
                </div>
              </div>
              <div class="detail-tab-content" id="resources-${map.name}" style="display: none;">
                <div class="resources-grid" id="resources-grid-${map.name}">
                  Loading resources...
                </div>
              </div>
              <div class="detail-tab-content" id="caves-${map.name}" style="display: none;">
                <div class="caves-grid" id="caves-grid-${map.name}">
                  Loading caves...
                </div>
              </div>
            </div>
          </div>
        </div>
      `).join('');

      content.innerHTML = `
        <div class="maps-header">
          <h3>Available Maps</h3>
          <div class="maps-controls">
            <button class="btn btn-secondary" onclick="toggleAllMapDetails()">
              <i class="fas fa-expand-arrows-alt"></i> Expand All
            </button>
            <select id="mapSortBy" onchange="sortMaps()">
              <option value="name">Sort by Name</option>
              <option value="type">Sort by Type</option>
              <option value="size">Sort by Size</option>
            </select>
          </div>
        </div>
        <div class="interactive-maps-grid">
          ${mapGrid}
        </div>
      `;
    }
    
    container.classList.remove('hidden');
  }
}
