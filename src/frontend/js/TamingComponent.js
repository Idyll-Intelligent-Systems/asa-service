/**
 * TamingComponent.js
 * Advanced taming calculator and management system for ASA Service
 */
class TamingComponent {
  constructor(asaService) {
    this.asaService = asaService;
    this.isLoaded = false;
    this.tamingData = [];
    this.currentCalculation = null;
  }

  async init() {
    console.log('Initializing TamingComponent...');
    this.setupEventListeners();
    await this.loadInitialData();
    this.isLoaded = true;
  }

  setupEventListeners() {
    // Taming calculator form
    const creatureSelect = document.getElementById('tamingCreature');
    const levelInput = document.getElementById('creatureLevel');
    
    if (creatureSelect) {
      creatureSelect.addEventListener('change', () => {
        this.onCreatureChange();
      });
    }

    if (levelInput) {
      levelInput.addEventListener('input', () => {
        this.validateLevel();
      });
    }

    // Advanced taming options
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-taming-action]')) {
        const action = e.target.dataset.tamingAction;
        this.handleTamingAction(action, e.target);
      }
    });

    // Real-time calculation updates
    document.addEventListener('input', (e) => {
      if (e.target.matches('.taming-input')) {
        this.updateCalculation();
      }
    });
  }

  async loadInitialData() {
    try {
      // Load all tameable creatures
      const response = await this.asaService.apiCall('/creatures?tameable=true');
      this.tamingData = response.data || [];
      
      this.populateCreatureDropdown();
      console.log(`Loaded ${this.tamingData.length} tameable creatures`);
    } catch (error) {
      console.error('Error loading taming data:', error);
    }
  }

  populateCreatureDropdown() {
    const select = document.getElementById('tamingCreature');
    if (!select) return;

    // Clear existing options
    select.innerHTML = '<option value="">Select Creature...</option>';

    // Group creatures by category for better organization
    const grouped = this.groupCreaturesByCategory();
    
    Object.keys(grouped).forEach(category => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = category;
      
      grouped[category].forEach(creature => {
        const option = document.createElement('option');
        option.value = creature.id;
        option.textContent = creature.name;
        option.dataset.category = category;
        option.dataset.difficulty = creature.taming_difficulty || 'medium';
        optgroup.appendChild(option);
      });
      
      select.appendChild(optgroup);
    });
  }

  groupCreaturesByCategory() {
    const groups = {
      'Small Creatures': [],
      'Medium Creatures': [],
      'Large Creatures': [],
      'Flying Creatures': [],
      'Aquatic Creatures': [],
      'Boss Creatures': []
    };

    this.tamingData.forEach(creature => {
      let category = 'Medium Creatures'; // default
      
      if (creature.category) {
        switch (creature.category.toLowerCase()) {
          case 'small':
          case 'tiny':
            category = 'Small Creatures';
            break;
          case 'large':
          case 'huge':
            category = 'Large Creatures';
            break;
          case 'flying':
          case 'aerial':
            category = 'Flying Creatures';
            break;
          case 'aquatic':
          case 'marine':
            category = 'Aquatic Creatures';
            break;
          case 'boss':
          case 'alpha':
            category = 'Boss Creatures';
            break;
        }
      } else if (creature.name) {
        // Fallback categorization based on name patterns
        const name = creature.name.toLowerCase();
        if (name.includes('small') || name.includes('micro')) {
          category = 'Small Creatures';
        } else if (name.includes('giga') || name.includes('titan') || name.includes('king')) {
          category = 'Large Creatures';
        } else if (name.includes('pterano') || name.includes('quetzal') || name.includes('wyvern')) {
          category = 'Flying Creatures';
        } else if (name.includes('mosa') || name.includes('megalo') || name.includes('whale')) {
          category = 'Aquatic Creatures';
        } else if (name.includes('boss') || name.includes('alpha')) {
          category = 'Boss Creatures';
        }
      }
      
      groups[category].push(creature);
    });

    // Sort creatures within each group
    Object.keys(groups).forEach(category => {
      groups[category].sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }

  onCreatureChange() {
    const select = document.getElementById('tamingCreature');
    if (!select || !select.value) {
      this.clearCreatureInfo();
      return;
    }

    const creature = this.tamingData.find(c => c.id == select.value);
    if (creature) {
      this.displayCreatureInfo(creature);
      this.updateCalculation();
    }
  }

  displayCreatureInfo(creature) {
    // Create or update creature info panel
    let infoPanel = document.getElementById('creatureInfoPanel');
    if (!infoPanel) {
      infoPanel = document.createElement('div');
      infoPanel.id = 'creatureInfoPanel';
      infoPanel.className = 'card creature-info-panel';
      
      const tamingCard = document.querySelector('#tamingTab .card');
      if (tamingCard) {
        tamingCard.parentNode.insertBefore(infoPanel, tamingCard.nextSibling);
      }
    }

    infoPanel.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">
          <i class="fas fa-paw"></i> ${creature.name}
        </h3>
      </div>
      <div class="creature-info-grid">
        <div class="info-section">
          <h4>Basic Information</h4>
          <div class="info-stats">
            <div class="stat-item">
              <span class="stat-label">Temperament:</span>
              <span class="stat-value">${creature.temperament || 'Unknown'}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Diet:</span>
              <span class="stat-value">${creature.diet || 'Unknown'}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Rideable:</span>
              <span class="stat-value ${creature.rideable ? 'positive' : 'negative'}">
                ${creature.rideable ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
        <div class="info-section">
          <h4>Taming Information</h4>
          <div class="info-stats">
            <div class="stat-item">
              <span class="stat-label">Preferred Food:</span>
              <span class="stat-value">${creature.preferred_food || 'Unknown'}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Taming Method:</span>
              <span class="stat-value">${creature.taming_method || 'Knockout'}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Difficulty:</span>
              <span class="stat-value difficulty-${creature.taming_difficulty || 'medium'}">
                ${this.formatDifficulty(creature.taming_difficulty)}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add styles for creature info panel
    if (!document.getElementById('creatureInfoStyles')) {
      const styles = document.createElement('style');
      styles.id = 'creatureInfoStyles';
      styles.textContent = `
        .creature-info-panel {
          margin: 1.5rem 0;
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .creature-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          padding: 1.5rem;
        }
        
        .info-section h4 {
          color: var(--obelisk-blue);
          margin-bottom: 1rem;
          font-size: 1.1rem;
          font-weight: 600;
        }
        
        .info-stats {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-secondary);
        }
        
        .stat-item:last-child {
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
        
        .stat-value.positive {
          color: var(--obelisk-green);
        }
        
        .stat-value.negative {
          color: var(--obelisk-red);
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
      `;
      document.head.appendChild(styles);
    }
  }

  formatDifficulty(difficulty) {
    if (!difficulty) return 'Medium';
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  }

  clearCreatureInfo() {
    const infoPanel = document.getElementById('creatureInfoPanel');
    if (infoPanel) {
      infoPanel.remove();
    }
  }

  validateLevel() {
    const levelInput = document.getElementById('creatureLevel');
    if (!levelInput) return;

    const level = parseInt(levelInput.value);
    
    // Visual feedback for level validation
    levelInput.classList.remove('invalid', 'valid');
    
    if (level < 1 || level > 150 || isNaN(level)) {
      levelInput.classList.add('invalid');
    } else {
      levelInput.classList.add('valid');
    }
  }

  async updateCalculation() {
    const creatureId = document.getElementById('tamingCreature')?.value;
    const level = document.getElementById('creatureLevel')?.value;

    if (!creatureId || !level || level < 1 || level > 150) {
      this.clearCalculation();
      return;
    }

    try {
      // Debounce calculation updates
      clearTimeout(this.calculationTimeout);
      this.calculationTimeout = setTimeout(async () => {
        await this.performCalculation(creatureId, level);
      }, 500);
    } catch (error) {
      console.error('Error updating calculation:', error);
    }
  }

  async performCalculation(creatureId, level) {
    try {
      const response = await this.asaService.apiCall(`/taming/${creatureId}?level=${level}`);
      this.currentCalculation = response.data;
      this.displayCalculationResults();
    } catch (error) {
      console.error('Error performing taming calculation:', error);
    }
  }

  displayCalculationResults() {
    if (!this.currentCalculation) return;

    const resultsContainer = document.getElementById('tamingResults');
    const contentContainer = document.getElementById('tamingContent');
    
    if (!contentContainer) return;

    const data = this.currentCalculation;

    contentContainer.innerHTML = `
      <div class="taming-calculator-results">
        <div class="calculation-summary">
          <div class="summary-card primary">
            <div class="summary-header">
              <i class="fas fa-clock"></i>
              <h4>Taming Time</h4>
            </div>
            <div class="summary-value">${data.taming_time || 'Unknown'}</div>
          </div>
          <div class="summary-card secondary">
            <div class="summary-header">
              <i class="fas fa-drumstick-bite"></i>
              <h4>Food Required</h4>
            </div>
            <div class="summary-value">${data.food_amount || 'Unknown'}</div>
          </div>
          <div class="summary-card tertiary">
            <div class="summary-header">
              <i class="fas fa-syringe"></i>
              <h4>Narcotics</h4>
            </div>
            <div class="summary-value">${data.narcotic || data.narcoberries || 'Unknown'}</div>
          </div>
        </div>

        <div class="detailed-breakdown">
          <div class="breakdown-section">
            <h4><i class="fas fa-list"></i> Food Options</h4>
            <div class="food-options">
              ${this.generateFoodOptions(data)}
            </div>
          </div>
          
          <div class="breakdown-section">
            <h4><i class="fas fa-shield-alt"></i> Narcotic Options</h4>
            <div class="narcotic-options">
              ${this.generateNarcoticOptions(data)}
            </div>
          </div>
          
          <div class="breakdown-section">
            <h4><i class="fas fa-info-circle"></i> Additional Information</h4>
            <div class="additional-info">
              ${this.generateAdditionalInfo(data)}
            </div>
          </div>
        </div>
      </div>
    `;

    // Show results section with animation
    if (resultsContainer) {
      resultsContainer.classList.remove('hidden');
      resultsContainer.style.animation = 'slideIn 0.3s ease-out';
    }
  }

  generateFoodOptions(data) {
    const foods = [
      { name: data.preferred_food || 'Preferred Food', amount: data.food_amount, efficiency: '100%', color: 'green' },
      { name: 'Regular Kibble', amount: Math.ceil((data.food_amount || 0) * 1.5), efficiency: '85%', color: 'blue' },
      { name: 'Raw Meat', amount: Math.ceil((data.food_amount || 0) * 2), efficiency: '50%', color: 'orange' },
      { name: 'Cooked Meat', amount: Math.ceil((data.food_amount || 0) * 3), efficiency: '25%', color: 'red' }
    ];

    return foods.map(food => `
      <div class="food-option ${food.color}">
        <div class="food-name">${food.name}</div>
        <div class="food-stats">
          <span class="food-amount">${food.amount || 'Unknown'}</span>
          <span class="food-efficiency">${food.efficiency}</span>
        </div>
      </div>
    `).join('');
  }

  generateNarcoticOptions(data) {
    const narcotics = [
      { name: 'Bio Toxin', amount: data.bio_toxin || Math.ceil((data.narcotic || 0) * 0.5), duration: '16min', color: 'purple' },
      { name: 'Narcotic', amount: data.narcotic || 'Unknown', duration: '8min', color: 'blue' },
      { name: 'Narcoberries', amount: data.narcoberries || Math.ceil((data.narcotic || 0) * 7.5), duration: '4sec', color: 'green' }
    ];

    return narcotics.map(narcotic => `
      <div class="narcotic-option ${narcotic.color}">
        <div class="narcotic-name">${narcotic.name}</div>
        <div class="narcotic-stats">
          <span class="narcotic-amount">${narcotic.amount}</span>
          <span class="narcotic-duration">${narcotic.duration}</span>
        </div>
      </div>
    `).join('');
  }

  generateAdditionalInfo(data) {
    const info = [];
    
    if (data.taming_method) {
      info.push(`<div class="info-item"><strong>Method:</strong> ${data.taming_method}</div>`);
    }
    
    if (data.tamming_effectiveness) {
      info.push(`<div class="info-item"><strong>Effectiveness:</strong> ${data.tamming_effectiveness}%</div>`);
    }
    
    if (data.torpor_drain) {
      info.push(`<div class="info-item"><strong>Torpor Drain:</strong> ${data.torpor_drain}/min</div>`);
    }
    
    info.push(`<div class="info-item"><strong>Level:</strong> ${data.level}</div>`);
    
    return info.join('');
  }

  clearCalculation() {
    const resultsContainer = document.getElementById('tamingResults');
    if (resultsContainer) {
      resultsContainer.classList.add('hidden');
    }
    this.currentCalculation = null;
  }

  handleTamingAction(action, button) {
    switch (action) {
      case 'export-calculation':
        this.exportCalculation();
        break;
      case 'save-favorite':
        this.saveFavoriteCreature();
        break;
      case 'reset-calculator':
        this.resetCalculator();
        break;
      default:
        console.warn('Unknown taming action:', action);
    }
  }

  exportCalculation() {
    if (!this.currentCalculation) {
      this.asaService.showNotification('No calculation to export', 'warning');
      return;
    }

    const data = this.currentCalculation;
    const exportData = {
      creature: data.creature_name,
      level: data.level,
      tamingTime: data.taming_time,
      preferredFood: data.preferred_food,
      foodAmount: data.food_amount,
      narcotic: data.narcotic,
      narcoberries: data.narcoberries,
      bioToxin: data.bio_toxin,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taming-calculation-${data.creature_name}-level-${data.level}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.asaService.showNotification('Calculation exported successfully!', 'success');
  }

  saveFavoriteCreature() {
    const creatureId = document.getElementById('tamingCreature')?.value;
    if (!creatureId) return;

    const favorites = JSON.parse(localStorage.getItem('tamingFavorites') || '[]');
    if (!favorites.includes(creatureId)) {
      favorites.push(creatureId);
      localStorage.setItem('tamingFavorites', JSON.stringify(favorites));
      this.asaService.showNotification('Creature added to favorites!', 'success');
    } else {
      this.asaService.showNotification('Creature already in favorites', 'info');
    }
  }

  resetCalculator() {
    document.getElementById('tamingCreature').value = '';
    document.getElementById('creatureLevel').value = '';
    this.clearCreatureInfo();
    this.clearCalculation();
    this.asaService.showNotification('Calculator reset', 'info');
  }

  async refresh() {
    this.isLoaded = false;
    await this.loadInitialData();
    this.isLoaded = true;
    console.log('TamingComponent refreshed');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TamingComponent;
}
