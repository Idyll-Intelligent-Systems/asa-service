// Creatures Component for ASA Service
class CreaturesComponent {
  constructor(asaService) {
    this.asaService = asaService;
  }

  // Initialize the creatures component
  async init() {
    console.log('🦕 Initializing CreaturesComponent...');
    // Setup any specific event listeners or initial state here
    // For now, just log that it's initialized
    console.log('✅ CreaturesComponent initialized successfully');
  }

  async loadCreatures() {
    const filter = document.getElementById('creatureFilter')?.value;
    const sort = document.getElementById('creatureSort')?.value;
    const button = document.getElementById('loadCreaturesBtn');

    // Set button to loading state
    this.asaService.setButtonLoading(button, true);
    this.asaService.showLoading(true);
    
    try {
      const params = new URLSearchParams();
      
      if (filter) {
        switch (filter) {
          case 'tameable':
            params.append('tameable', 'true');
            break;
          case 'rideable':
            params.append('rideable', 'true');
            break;
          case 'aggressive':
            params.append('temperament', 'aggressive');
            break;
          case 'passive':
            params.append('temperament', 'passive');
            break;
        }
      }
      
      if (sort) params.append('sort', sort);
      
      // Show progressive loading message
      this.asaService.showAlert('Loading creatures data...', 'info');
      
      const results = await this.asaService.apiCall(`/creatures?${params}`);
      this.displayCreatures(results);
      this.updateCreatureStats(results);
      
      this.asaService.showAlert(`Loaded ${results.data.length} creatures successfully`, 'success');
      
    } catch (error) {
      console.error('Failed to load creatures:', error);
      this.asaService.showAlert(`Failed to load creatures: ${error.message}`, 'error');
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

  displayCreatures(results) {
    const container = document.getElementById('creaturesResults');
    const content = document.getElementById('creaturesContent');
    
    if (!container || !content) {
      console.error('Creatures results containers not found');
      return;
    }
    
    const data = results.data || results;
    const creaturesArray = Array.isArray(data) ? data : (data.results || []);
    
    if (!creaturesArray || creaturesArray.length === 0) {
      content.innerHTML = '<div class="no-results">No creatures found.</div>';
    } else {
      content.innerHTML = `
        <div class="data-grid">
          ${creaturesArray.map(creature => `
            <div class="data-item creature-card" onclick="showCreatureDetails('${creature.name}')">
              <div class="creature-header">
                <h4>${creature.name}</h4>
                <div class="creature-badges">
                  ${(creature.is_tameable || creature.tameable) ? '<span class="badge tameable">Tameable</span>' : ''}
                  ${(creature.is_rideable || creature.rideable) ? '<span class="badge rideable">Rideable</span>' : ''}
                  ${creature.temperament ? `<span class="badge temperament-${creature.temperament.toLowerCase()}">${creature.temperament}</span>` : ''}
                </div>
              </div>
              
              <div class="creature-stats">
                <div class="stat">
                  <i class="fas fa-heart"></i>
                  <span class="stat-label">Health</span>
                  <span class="stat-value">${creature.health || 'Unknown'}</span>
                </div>
                <div class="stat">
                  <i class="fas fa-fist-raised"></i>
                  <span class="stat-label">Damage</span>
                  <span class="stat-value">${creature.melee_damage || creature.damage || 'Unknown'}</span>
                </div>
                <div class="stat">
                  <i class="fas fa-running"></i>
                  <span class="stat-label">Speed</span>
                  <span class="stat-value">${creature.movement_speed || creature.speed || 'Unknown'}</span>
                </div>
              </div>

              <div class="creature-description">
                <p>${creature.description || 'A mysterious creature roaming the ARK.'}</p>
              </div>

              <div class="creature-actions">
                <button class="action-btn primary" onclick="event.stopPropagation(); showCreatureDetails('${creature.name}')">
                  <i class="fas fa-eye"></i> Details
                </button>
                ${(creature.is_tameable || creature.tameable) ? `
                  <button class="action-btn secondary" onclick="event.stopPropagation(); selectCreatureForTaming('${creature.slug || creature.name.toLowerCase().replace(/\\s+/g, '-')}')">
                    <i class="fas fa-calculator"></i> Taming
                  </button>
                ` : ''}
                <button class="action-btn tertiary" onclick="event.stopPropagation(); addToFavorites('creature', '${creature.name}')">
                  <i class="fas fa-star"></i> Favorite
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
    
    container.classList.remove('hidden');
  }

  updateCreatureStats(results) {
    const statsContainer = document.getElementById('creatureStats');
    const data = results.data || results;
    const creaturesArray = Array.isArray(data) ? data : (data.results || []);
    
    if (!statsContainer) return;
    
    const total = creaturesArray.length;
    const tameable = creaturesArray.filter(c => c.is_tameable || c.tameable).length;
    const rideable = creaturesArray.filter(c => c.is_rideable || c.rideable).length;
    
    const totalElement = document.getElementById('totalCreatures');
    const tameableElement = document.getElementById('tameableCreatures');
    const rideableElement = document.getElementById('rideableCreatures');
    
    if (totalElement) totalElement.textContent = total;
    if (tameableElement) tameableElement.textContent = tameable;
    if (rideableElement) rideableElement.textContent = rideable;
    
    statsContainer.style.display = 'grid';
  }

  showCreatureDetails(creatureName) {
    this.asaService.showAlert(`Creature Details: ${creatureName}`, 'info');
    // In a real app, this would open a detailed modal or page
  }

  selectCreatureForTaming(slug) {
    const tamingCreatureSelect = document.getElementById('tamingCreature');
    if (tamingCreatureSelect) {
      tamingCreatureSelect.value = slug;
      this.asaService.showTab('taming');
      const levelInput = document.getElementById('creatureLevel');
      if (levelInput) {
        levelInput.focus();
      }
    }
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
}
