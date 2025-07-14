// Interactive Maps Component with Google Maps-like features
class InteractiveMapsComponent {
  constructor(asaService) {
    this.asaService = asaService;
    this.currentMap = null;
    this.mapCanvas = null;
    this.ctx = null;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.locations = [];
    this.userLocations = [];
    this.selectedLocation = null;
    this.userPosition = null;
    this.showCategories = {
      resources: true,
      creatures: true,
      caves: true,
      landmarks: true,
      user_locations: true
    };
    this.searchRadius = 10;
  }

  async init() {
    console.log('🗺️ Initializing Interactive Maps Component...');
    this.setupEventListeners();
    await this.loadAvailableMaps();
    console.log('✅ Interactive Maps Component initialized');
  }

  setupEventListeners() {
    // Map selection
    document.addEventListener('change', (e) => {
      if (e.target.id === 'mapSelector') {
        this.loadMap(e.target.value);
      }
    });

    // Category toggles
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('category-toggle')) {
        const category = e.target.getAttribute('data-category');
        this.showCategories[category] = e.target.checked;
        this.redrawMap();
      }
    });

    // Search and filter events
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('location-search-btn')) {
        this.searchNearbyLocations();
      }
      
      if (e.target.classList.contains('add-user-location-btn')) {
        this.showAddLocationModal();
      }
      
      if (e.target.classList.contains('get-directions-btn')) {
        this.calculateRoute();
      }
      
      if (e.target.classList.contains('zoom-in-btn')) {
        this.zoomIn();
      }
      
      if (e.target.classList.contains('zoom-out-btn')) {
        this.zoomOut();
      }
    });

    // Input events
    document.addEventListener('input', (e) => {
      if (e.target.id === 'searchRadius') {
        this.searchRadius = parseFloat(e.target.value);
        this.updateNearbyLocations();
      }
      
      if (e.target.id === 'userLatInput' || e.target.id === 'userLngInput') {
        this.updateUserPosition();
      }
    });
  }

  async loadAvailableMaps() {
    try {
      const response = await this.asaService.apiCall('/maps');
      const maps = response.data || [];
      
      const selector = document.getElementById('mapSelector');
      if (selector) {
        selector.innerHTML = '<option value="">Select a map...</option>';
        maps.forEach(map => {
          const option = document.createElement('option');
          option.value = map.slug;
          option.textContent = map.name;
          selector.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading maps:', error);
      this.asaService.showAlert('Failed to load available maps', 'error');
    }
  }

  async loadMap(mapSlug) {
    if (!mapSlug) return;
    
    try {
      this.asaService.showLoading(true);
      
      // Load interactive map data
      const response = await this.asaService.apiCall(`/interactive-maps/${mapSlug}/interactive`);
      const mapData = response.data;
      
      this.currentMap = mapData.map;
      this.locations = mapData.locations || [];
      this.userLocations = mapData.user_locations || [];
      
      // Initialize map canvas
      this.initializeMapCanvas();
      
      // Update UI
      this.updateMapInfo();
      this.updateLocationsList();
      this.updateCategoryToggles();
      
      // Draw map
      this.redrawMap();
      
      console.log(`✅ Loaded map: ${this.currentMap.name} with ${this.locations.length} locations`);
      
    } catch (error) {
      console.error('Error loading map:', error);
      this.asaService.showAlert(`Failed to load map: ${error.message}`, 'error');
    } finally {
      this.asaService.showLoading(false);
    }
  }

  initializeMapCanvas() {
    const container = document.getElementById('mapCanvas');
    if (!container) {
      console.error('Map canvas container not found');
      return;
    }
    
    // Create or update canvas
    let canvas = container.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      container.appendChild(canvas);
    }
    
    this.mapCanvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Set canvas size
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Setup canvas event listeners
    this.setupCanvasEvents();
    
    // Initialize view
    this.resetView();
  }

  setupCanvasEvents() {
    if (!this.mapCanvas) return;
    
    // Mouse events for panning and zooming
    this.mapCanvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.offsetX;
      this.lastMouseY = e.offsetY;
      this.mapCanvas.style.cursor = 'grabbing';
    });
    
    this.mapCanvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.offsetX - this.lastMouseX;
        const deltaY = e.offsetY - this.lastMouseY;
        
        this.offsetX += deltaX;
        this.offsetY += deltaY;
        
        this.lastMouseX = e.offsetX;
        this.lastMouseY = e.offsetY;
        
        this.redrawMap();
      } else {
        // Check for hover over locations
        this.handleMouseHover(e.offsetX, e.offsetY);
      }
    });
    
    this.mapCanvas.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.mapCanvas.style.cursor = 'grab';
    });
    
    this.mapCanvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.mapCanvas.style.cursor = 'grab';
    });
    
    // Zoom with mouse wheel
    this.mapCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom(zoomFactor, e.offsetX, e.offsetY);
    });
    
    // Click events for selecting locations
    this.mapCanvas.addEventListener('click', (e) => {
      this.handleCanvasClick(e.offsetX, e.offsetY);
    });
    
    // Double-click to add user location
    this.mapCanvas.addEventListener('dblclick', (e) => {
      this.addUserLocationAtPoint(e.offsetX, e.offsetY);
    });
  }

  resetView() {
    if (!this.currentMap || !this.mapCanvas) return;
    
    // Center the map
    this.offsetX = this.mapCanvas.width / 2;
    this.offsetY = this.mapCanvas.height / 2;
    this.scale = Math.min(
      this.mapCanvas.width / 100,
      this.mapCanvas.height / 100
    ) * 0.8;
    
    this.redrawMap();
  }

  zoom(factor, centerX, centerY) {
    const oldScale = this.scale;
    this.scale *= factor;
    
    // Limit zoom levels
    this.scale = Math.max(0.1, Math.min(10, this.scale));
    
    // Adjust offset to zoom towards cursor position
    if (centerX !== undefined && centerY !== undefined) {
      const scaleChange = this.scale / oldScale;
      this.offsetX = centerX - (centerX - this.offsetX) * scaleChange;
      this.offsetY = centerY - (centerY - this.offsetY) * scaleChange;
    }
    
    this.redrawMap();
  }

  zoomIn() {
    this.zoom(1.2, this.mapCanvas.width / 2, this.mapCanvas.height / 2);
  }

  zoomOut() {
    this.zoom(0.8, this.mapCanvas.width / 2, this.mapCanvas.height / 2);
  }

  worldToScreen(worldX, worldY) {
    return {
      x: this.offsetX + worldX * this.scale,
      y: this.offsetY + worldY * this.scale
    };
  }

  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.offsetX) / this.scale,
      y: (screenY - this.offsetY) / this.scale
    };
  }

  redrawMap() {
    if (!this.ctx || !this.mapCanvas) return;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);
    
    // Draw background
    this.drawBackground();
    
    // Draw grid
    this.drawGrid();
    
    // Draw locations
    this.drawLocations();
    
    // Draw user position
    if (this.userPosition) {
      this.drawUserPosition();
    }
    
    // Draw search radius
    if (this.userPosition && this.searchRadius > 0) {
      this.drawSearchRadius();
    }
    
    // Draw selected location highlight
    if (this.selectedLocation) {
      this.drawLocationHighlight(this.selectedLocation);
    }
  }

  drawBackground() {
    // Draw a simple background
    this.ctx.fillStyle = '#1a472a'; // Dark green for land
    this.ctx.fillRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);
    
    // Add some texture/noise for terrain feel
    this.ctx.fillStyle = '#0066aa'; // Blue for water bodies
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * this.mapCanvas.width;
      const y = Math.random() * this.mapCanvas.height;
      const size = Math.random() * 30 + 10;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawGrid() {
    const gridSize = 10 * this.scale;
    const startX = this.offsetX % gridSize;
    const startY = this.offsetY % gridSize;
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = startX; x < this.mapCanvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.mapCanvas.height);
      this.ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = startY; y < this.mapCanvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.mapCanvas.width, y);
      this.ctx.stroke();
    }
  }

  drawLocations() {
    this.locations.forEach(location => {
      if (!this.showCategories[location.category]) return;
      
      const screen = this.worldToScreen(location.latitude, location.longitude);
      
      // Skip if outside visible area
      if (screen.x < -20 || screen.x > this.mapCanvas.width + 20 ||
          screen.y < -20 || screen.y > this.mapCanvas.height + 20) {
        return;
      }
      
      this.drawLocationMarker(location, screen.x, screen.y);
    });
    
    // Draw user locations
    if (this.showCategories.user_locations) {
      this.userLocations.forEach(location => {
        const screen = this.worldToScreen(location.latitude, location.longitude);
        this.drawUserLocationMarker(location, screen.x, screen.y);
      });
    }
  }

  drawLocationMarker(location, x, y) {
    const size = Math.max(8, 12 * this.scale);
    const color = location.marker_color || this.getCategoryColor(location.category);
    
    // Draw marker background
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Draw category icon
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `${size - 4}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const icon = this.getCategoryIcon(location.category);
    this.ctx.fillText(icon, x, y);
    
    // Draw label if zoomed in enough
    if (this.scale > 2) {
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(x - 30, y + size / 2 + 2, 60, 16);
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '12px Arial';
      this.ctx.fillText(location.name.substring(0, 8), x, y + size / 2 + 10);
    }
  }

  drawUserLocationMarker(location, x, y) {
    const size = 16;
    
    // Draw base marker
    this.ctx.fillStyle = location.color || '#0066CC';
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 3;
    
    if (location.is_base) {
      // Draw house icon for base
      this.ctx.fillRect(x - size/2, y - size/2, size, size);
      this.ctx.strokeRect(x - size/2, y - size/2, size, size);
      
      // Roof
      this.ctx.beginPath();
      this.ctx.moveTo(x - size/2, y - size/2);
      this.ctx.lineTo(x, y - size);
      this.ctx.lineTo(x + size/2, y - size/2);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    } else {
      // Regular circular marker
      this.ctx.beginPath();
      this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    }
    
    // Label
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(x - 25, y + size / 2 + 2, 50, 14);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '11px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(location.name.substring(0, 6), x, y + size / 2 + 9);
  }

  drawUserPosition() {
    const screen = this.worldToScreen(this.userPosition.lat, this.userPosition.lng);
    const size = 20;
    
    // Pulsing circle effect
    const time = Date.now() / 1000;
    const pulse = 1 + 0.3 * Math.sin(time * 3);
    
    // Outer circle (pulse)
    this.ctx.fillStyle = 'rgba(0, 102, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(screen.x, screen.y, size * pulse, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Inner circle (solid)
    this.ctx.fillStyle = '#0066ff';
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(screen.x, screen.y, size / 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Center dot
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(screen.x, screen.y, 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawSearchRadius() {
    const screen = this.worldToScreen(this.userPosition.lat, this.userPosition.lng);
    const radiusPixels = this.searchRadius * this.scale;
    
    this.ctx.strokeStyle = 'rgba(0, 102, 255, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    
    this.ctx.beginPath();
    this.ctx.arc(screen.x, screen.y, radiusPixels, 0, Math.PI * 2);
    this.ctx.stroke();
    
    this.ctx.setLineDash([]);
  }

  drawLocationHighlight(location) {
    const screen = this.worldToScreen(location.latitude, location.longitude);
    const size = 30;
    
    this.ctx.strokeStyle = '#ffff00';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([3, 3]);
    
    this.ctx.beginPath();
    this.ctx.arc(screen.x, screen.y, size, 0, Math.PI * 2);
    this.ctx.stroke();
    
    this.ctx.setLineDash([]);
  }

  getCategoryColor(category) {
    const colors = {
      resource: '#808080',
      creature: '#ff4444',
      cave: '#8B4513',
      landmark: '#00aa00',
      spawn_point: '#0066ff'
    };
    return colors[category] || '#666666';
  }

  getCategoryIcon(category) {
    const icons = {
      resource: '⛏️',
      creature: '🦕',
      cave: '🕳️',
      landmark: '🏛️',
      spawn_point: '📍'
    };
    return icons[category] || '📍';
  }

  handleCanvasClick(x, y) {
    // Check if clicking on a location
    const clickedLocation = this.findLocationAtPoint(x, y);
    
    if (clickedLocation) {
      this.selectLocation(clickedLocation);
    } else {
      // Clear selection
      this.selectedLocation = null;
      this.updateLocationDetails(null);
      this.redrawMap();
    }
  }

  findLocationAtPoint(x, y) {
    const tolerance = 15;
    
    // Check regular locations
    for (const location of this.locations) {
      if (!this.showCategories[location.category]) continue;
      
      const screen = this.worldToScreen(location.latitude, location.longitude);
      const distance = Math.sqrt(
        Math.pow(x - screen.x, 2) + Math.pow(y - screen.y, 2)
      );
      
      if (distance <= tolerance) {
        return location;
      }
    }
    
    // Check user locations
    if (this.showCategories.user_locations) {
      for (const location of this.userLocations) {
        const screen = this.worldToScreen(location.latitude, location.longitude);
        const distance = Math.sqrt(
          Math.pow(x - screen.x, 2) + Math.pow(y - screen.y, 2)
        );
        
        if (distance <= tolerance) {
          return location;
        }
      }
    }
    
    return null;
  }

  selectLocation(location) {
    this.selectedLocation = location;
    this.updateLocationDetails(location);
    this.redrawMap();
  }

  updateLocationDetails(location) {
    const container = document.getElementById('locationDetails');
    if (!container) return;
    
    if (!location) {
      container.innerHTML = '<p class="text-muted">Click on a location to see details</p>';
      return;
    }
    
    container.innerHTML = `
      <div class="location-detail-card">
        <div class="location-header">
          <h4>${location.name}</h4>
          <span class="location-category ${location.category}">${location.category}</span>
        </div>
        
        <div class="location-info">
          <div class="coordinates">
            <strong>Coordinates:</strong> ${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}
          </div>
          
          ${location.description ? `<div class="description">${location.description}</div>` : ''}
          
          ${location.rarity ? `<div class="rarity">Rarity: <span class="rarity-${location.rarity}">${location.rarity}</span></div>` : ''}
          
          ${location.danger_level ? `<div class="danger">Danger Level: ${location.danger_level}/10</div>` : ''}
        </div>
        
        <div class="location-actions">
          <button class="btn btn-primary btn-sm get-directions-btn" 
                  data-lat="${location.latitude}" data-lng="${location.longitude}">
            <i class="fas fa-route"></i> Get Directions
          </button>
          
          <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${location.latitude}, ${location.longitude}')">
            <i class="fas fa-copy"></i> Copy Coords
          </button>
        </div>
      </div>
    `;
  }

  updateMapInfo() {
    const container = document.getElementById('mapInfo');
    if (!container || !this.currentMap) return;
    
    container.innerHTML = `
      <div class="map-info-card">
        <h3>${this.currentMap.name}</h3>
        <div class="map-stats">
          <span class="stat">
            <i class="fas fa-map-marker-alt"></i>
            ${this.locations.length} locations
          </span>
          <span class="stat">
            <i class="fas fa-home"></i>
            ${this.userLocations.length} user locations
          </span>
        </div>
      </div>
    `;
  }

  updateLocationsList() {
    const container = document.getElementById('locationsList');
    if (!container) return;
    
    const categories = this.groupLocationsByCategory();
    
    let html = '';
    for (const [category, locations] of Object.entries(categories)) {
      if (locations.length === 0) continue;
      
      html += `
        <div class="category-section">
          <h5>
            <i class="category-icon ${category}"></i>
            ${category.charAt(0).toUpperCase() + category.slice(1)} (${locations.length})
          </h5>
          <div class="locations-list">
            ${locations.slice(0, 5).map(loc => `
              <div class="location-item" onclick="window.interactiveMaps.selectLocation(${JSON.stringify(loc).replace(/"/g, '&quot;')})">
                <span class="location-name">${loc.name}</span>
                <span class="location-coords">${loc.latitude.toFixed(1)}, ${loc.longitude.toFixed(1)}</span>
              </div>
            `).join('')}
            ${locations.length > 5 ? `<div class="more-locations">+${locations.length - 5} more...</div>` : ''}
          </div>
        </div>
      `;
    }
    
    container.innerHTML = html;
  }

  groupLocationsByCategory() {
    const groups = {
      resource: [],
      creature: [],
      cave: [],
      landmark: [],
      spawn_point: []
    };
    
    this.locations.forEach(location => {
      if (groups[location.category]) {
        groups[location.category].push(location);
      }
    });
    
    return groups;
  }

  updateCategoryToggles() {
    const container = document.getElementById('categoryToggles');
    if (!container) return;
    
    const categories = Object.keys(this.showCategories);
    
    container.innerHTML = categories.map(category => {
      const count = category === 'user_locations' ? 
        this.userLocations.length : 
        this.locations.filter(loc => loc.category === category).length;
      
      return `
        <label class="category-toggle-label">
          <input type="checkbox" class="category-toggle" 
                 data-category="${category}" 
                 ${this.showCategories[category] ? 'checked' : ''}>
          <span class="category-name">
            ${this.getCategoryIcon(category)} ${category.replace('_', ' ')} (${count})
          </span>
        </label>
      `;
    }).join('');
  }

  async searchNearbyLocations() {
    if (!this.userPosition || !this.currentMap) {
      this.asaService.showAlert('Please set your position first', 'warning');
      return;
    }
    
    try {
      const response = await this.asaService.apiCall(
        `/interactive-maps/${this.currentMap.slug}/nearest?lat=${this.userPosition.lat}&lng=${this.userPosition.lng}&radius=${this.searchRadius}`
      );
      
      const nearbyLocations = response.data || [];
      this.displayNearbyLocations(nearbyLocations);
      
    } catch (error) {
      console.error('Error searching nearby locations:', error);
      this.asaService.showAlert('Failed to search nearby locations', 'error');
    }
  }

  displayNearbyLocations(locations) {
    const container = document.getElementById('nearbyLocationsList');
    if (!container) return;
    
    if (locations.length === 0) {
      container.innerHTML = '<p class="text-muted">No locations found within search radius</p>';
      return;
    }
    
    container.innerHTML = `
      <h5>Nearby Locations (${locations.length})</h5>
      <div class="nearby-locations">
        ${locations.map(loc => `
          <div class="nearby-location-item" onclick="window.interactiveMaps.selectLocation(${JSON.stringify(loc).replace(/"/g, '&quot;')})">
            <div class="location-info">
              <span class="location-name">${loc.name}</span>
              <span class="location-category ${loc.category}">${loc.category}</span>
            </div>
            <div class="location-distance">
              ${loc.distance ? `${loc.distance.toFixed(1)} units` : 'Unknown distance'}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  updateUserPosition() {
    const latInput = document.getElementById('userLatInput');
    const lngInput = document.getElementById('userLngInput');
    
    if (!latInput || !lngInput) return;
    
    const lat = parseFloat(latInput.value);
    const lng = parseFloat(lngInput.value);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      this.userPosition = { lat, lng };
      this.redrawMap();
      this.updateNearbyLocations();
    }
  }

  async updateNearbyLocations() {
    if (this.userPosition && this.currentMap) {
      await this.searchNearbyLocations();
    }
  }

  async addUserLocationAtPoint(screenX, screenY) {
    const world = this.screenToWorld(screenX, screenY);
    const name = prompt('Enter location name:');
    
    if (!name) return;
    
    const description = prompt('Enter description (optional):') || '';
    const isBase = confirm('Is this a base location?');
    
    await this.addUserLocation({
      name,
      description,
      latitude: world.x,
      longitude: world.y,
      is_base: isBase
    });
  }

  async addUserLocation(locationData) {
    if (!this.currentMap) return;
    
    try {
      const userId = 'user-' + Date.now(); // Simple user ID for demo
      
      const response = await this.asaService.apiCall(
        `/interactive-maps/${this.currentMap.slug}/user-locations`,
        'POST',
        {
          user_id: userId,
          ...locationData
        }
      );
      
      if (response.success) {
        // Add to local array
        this.userLocations.push(response.data);
        
        // Update UI
        this.updateMapInfo();
        this.updateCategoryToggles();
        this.redrawMap();
        
        this.asaService.showAlert('Location added successfully!', 'success');
      }
      
    } catch (error) {
      console.error('Error adding user location:', error);
      this.asaService.showAlert('Failed to add location', 'error');
    }
  }

  showAddLocationModal() {
    // Create and show a modal for adding user locations
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Add User Location</h3>
          <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
        </div>
        <div class="modal-body">
          <form id="addLocationForm">
            <div class="form-group">
              <label>Location Name:</label>
              <input type="text" id="newLocationName" required>
            </div>
            <div class="form-group">
              <label>Description:</label>
              <textarea id="newLocationDescription"></textarea>
            </div>
            <div class="form-group">
              <label>Latitude:</label>
              <input type="number" id="newLocationLat" step="0.01" required>
            </div>
            <div class="form-group">
              <label>Longitude:</label>
              <input type="number" id="newLocationLng" step="0.01" required>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" id="newLocationIsBase">
                This is a base location
              </label>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="window.interactiveMaps.submitNewLocation()">Add Location</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
  }

  async submitNewLocation() {
    const name = document.getElementById('newLocationName').value;
    const description = document.getElementById('newLocationDescription').value;
    const lat = parseFloat(document.getElementById('newLocationLat').value);
    const lng = parseFloat(document.getElementById('newLocationLng').value);
    const isBase = document.getElementById('newLocationIsBase').checked;
    
    if (!name || isNaN(lat) || isNaN(lng)) {
      this.asaService.showAlert('Please fill in all required fields', 'warning');
      return;
    }
    
    await this.addUserLocation({
      name,
      description,
      latitude: lat,
      longitude: lng,
      is_base: isBase
    });
    
    // Close modal
    document.querySelector('.modal').remove();
  }

  async calculateRoute() {
    if (!this.userPosition || !this.selectedLocation) {
      this.asaService.showAlert('Please set your position and select a destination', 'warning');
      return;
    }
    
    try {
      const response = await this.asaService.apiCall(
        `/interactive-maps/${this.currentMap.slug}/route`,
        'POST',
        {
          start_lat: this.userPosition.lat,
          start_lng: this.userPosition.lng,
          end_lat: this.selectedLocation.latitude,
          end_lng: this.selectedLocation.longitude,
          route_type: 'walking'
        }
      );
      
      const route = response.data;
      this.displayRouteInfo(route);
      
    } catch (error) {
      console.error('Error calculating route:', error);
      this.asaService.showAlert('Failed to calculate route', 'error');
    }
  }

  displayRouteInfo(route) {
    const container = document.getElementById('routeInfo');
    if (!container) return;
    
    container.innerHTML = `
      <div class="route-info-card">
        <h5><i class="fas fa-route"></i> Route Information</h5>
        <div class="route-details">
          <div class="route-stat">
            <span class="label">Distance:</span>
            <span class="value">${route.distance_km} km</span>
          </div>
          <div class="route-stat">
            <span class="label">Estimated Time:</span>
            <span class="value">${route.estimated_time} minutes</span>
          </div>
          <div class="route-stat">
            <span class="label">Difficulty:</span>
            <span class="value difficulty-${route.difficulty}">${route.difficulty}</span>
          </div>
          ${route.dangers && route.dangers.length > 0 ? `
            <div class="route-dangers">
              <span class="label">Dangers:</span>
              <div class="danger-tags">
                ${route.dangers.map(danger => `<span class="danger-tag">${danger}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}

// Make it globally available
window.InteractiveMapsComponent = InteractiveMapsComponent;
