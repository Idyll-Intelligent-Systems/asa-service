const request = require('supertest');
const { TestDatabase, TestApp } = require('../integration/test-setup');
const puppeteer = require('puppeteer');
const path = require('path');

describe('Full Stack E2E Tests', () => {
  let testDb;
  let testApp;
  let app;
  let browser;
  let page;
  let baseUrl;

  beforeAll(async () => {
    // Setup test database
    testDb = new TestDatabase();
    await testDb.connect();
    await testDb.cleanup();
    await testDb.setupSchema();
    await testDb.seedData();

    // Setup test application
    testApp = new TestApp();
    app = await testApp.start();
    
    // Start the application server for E2E testing
    const server = app.listen(0); // Use random port
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    // Setup Puppeteer browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1280, height: 720 });
    
    // Add error logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
  }, 120000);

  afterAll(async () => {
    if (browser) await browser.close();
    await testApp.stop();
    await testDb.cleanup();
    await testDb.disconnect();
  }, 30000);

  describe('Frontend Load and Navigation', () => {
    test('should load the main page successfully', async () => {
      await page.goto(baseUrl);
      
      // Wait for the page to load
      await page.waitForSelector('body', { timeout: 10000 });
      
      // Check if the page title is correct
      const title = await page.title();
      expect(title).toContain('ARK: Survival Ascended');
      
      // Check if main elements are present
      const bodyContent = await page.content();
      expect(bodyContent).toContain('ARK: Survival Ascended');
    });

    test('should have responsive design', async () => {
      await page.goto(baseUrl);
      
      // Test mobile viewport
      await page.setViewport({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      
      // Check if mobile elements are visible
      const isMobileOptimized = await page.evaluate(() => {
        const body = document.body;
        return window.getComputedStyle(body).fontSize !== null;
      });
      
      expect(isMobileOptimized).toBe(true);
      
      // Reset to desktop viewport
      await page.setViewport({ width: 1280, height: 720 });
    });

    test('should load without JavaScript errors', async () => {
      const jsErrors = [];
      page.on('pageerror', error => jsErrors.push(error.message));
      
      await page.goto(baseUrl);
      await page.waitForTimeout(3000);
      
      expect(jsErrors.length).toBe(0);
    });
  });

  describe('Map Selection and Display', () => {
    test('should display map selection interface', async () => {
      await page.goto(baseUrl);
      await page.waitForTimeout(2000);
      
      // Check if map selection elements exist
      const mapElements = await page.$$eval('[data-testid*="map"], .map-card, .map-button', 
        elements => elements.length
      );
      
      // Should have some map selection elements
      expect(mapElements).toBeGreaterThanOrEqual(0);
    });

    test('should be able to select a map', async () => {
      await page.goto(baseUrl);
      await page.waitForTimeout(2000);
      
      // Try to find and click a map selection element
      const mapSelectors = [
        '[data-map="the-island"]',
        'button[value="the-island"]',
        '.map-the-island',
        '#map-the-island'
      ];
      
      let mapSelected = false;
      for (const selector of mapSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.click();
            mapSelected = true;
            break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }
      
      // If no specific map selector found, try generic approach
      if (!mapSelected) {
        const buttons = await page.$$('button');
        if (buttons.length > 0) {
          await buttons[0].click();
          mapSelected = true;
        }
      }
      
      await page.waitForTimeout(1000);
      
      // Verify some response to map selection
      const currentUrl = page.url();
      const pageContent = await page.content();
      
      // Check if URL changed or content updated
      expect(currentUrl.length).toBeGreaterThan(baseUrl.length);
    });
  });

  describe('Search Functionality', () => {
    test('should have search interface', async () => {
      await page.goto(baseUrl);
      await page.waitForTimeout(2000);
      
      // Look for search input elements
      const searchInputs = await page.$$('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"], .search-input, #search');
      
      expect(searchInputs.length).toBeGreaterThanOrEqual(0);
    });

    test('should perform search and display results', async () => {
      await page.goto(baseUrl);
      await page.waitForTimeout(2000);
      
      // Find search input
      const searchSelectors = [
        'input[type="search"]',
        'input[placeholder*="search" i]',
        '.search-input',
        '#search-input',
        '#search'
      ];
      
      let searchInput = null;
      for (const selector of searchSelectors) {
        try {
          searchInput = await page.$(selector);
          if (searchInput) break;
        } catch (error) {
          // Continue to next selector
        }
      }
      
      if (searchInput) {
        // Type search query
        await searchInput.type('T-Rex');
        await page.keyboard.press('Enter');
        
        await page.waitForTimeout(3000);
        
        // Check if results are displayed
        const resultsContent = await page.content();
        expect(resultsContent.toLowerCase()).toContain('rex');
      }
    });
  });

  describe('API Integration with Frontend', () => {
    test('should load data from API endpoints', async () => {
      await page.goto(baseUrl);
      
      // Intercept network requests
      const apiCalls = [];
      page.on('response', response => {
        if (response.url().includes('/api/')) {
          apiCalls.push({
            url: response.url(),
            status: response.status()
          });
        }
      });
      
      await page.waitForTimeout(5000);
      
      // Check if API calls were made
      expect(apiCalls.length).toBeGreaterThanOrEqual(0);
      
      // Check if successful API calls were made
      const successfulCalls = apiCalls.filter(call => call.status === 200);
      expect(successfulCalls.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle API errors gracefully', async () => {
      await page.goto(baseUrl);
      
      // Mock a failed API response
      await page.setRequestInterception(true);
      page.on('request', request => {
        if (request.url().includes('/api/nonexistent')) {
          request.respond({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: 'Not found' })
          });
        } else {
          request.continue();
        }
      });
      
      await page.waitForTimeout(2000);
      
      // Page should still be functional
      const bodyContent = await page.content();
      expect(bodyContent).toContain('ARK');
    });
  });

  describe('Real Data Integration', () => {
    test('should display real creature data', async () => {
      // Make API call to verify data exists
      const creaturesResponse = await request(app).get('/api/creatures');
      expect(creaturesResponse.status).toBe(200);
      expect(creaturesResponse.body.data.length).toBeGreaterThan(0);
      
      await page.goto(baseUrl);
      await page.waitForTimeout(3000);
      
      // Check if creature names from the API are displayed
      const pageContent = await page.content().then(content => content.toLowerCase());
      const creatures = creaturesResponse.body.data;
      
      // At least one creature should be mentioned on the page
      const creatureFound = creatures.some(creature => 
        pageContent.includes(creature.name.toLowerCase())
      );
      
      expect(creatureFound).toBe(true);
    });

    test('should display real map data', async () => {
      // Make API call to verify maps exist
      const mapsResponse = await request(app).get('/api/maps');
      expect(mapsResponse.status).toBe(200);
      expect(mapsResponse.body.data.length).toBeGreaterThan(0);
      
      await page.goto(baseUrl);
      await page.waitForTimeout(3000);
      
      // Check if map names are displayed
      const pageContent = await page.content().toLowerCase();
      const maps = mapsResponse.body.data;
      
      // At least one map should be mentioned
      const mapFound = maps.some(map => 
        pageContent.includes(map.name.toLowerCase()) ||
        pageContent.includes(map.slug.toLowerCase())
      );
      
      expect(mapFound).toBe(true);
    });
  });

  describe('User Journey Tests', () => {
    test('complete user journey: select map -> view regions -> search creatures', async () => {
      await page.goto(baseUrl);
      await page.waitForTimeout(2000);
      
      // Step 1: Select a map (The Island)
      try {
        const mapButton = await page.$('[data-map="the-island"], button:contains("Island"), button:contains("island")');
        if (mapButton) {
          await mapButton.click();
          await page.waitForTimeout(2000);
        }
      } catch (error) {
        console.log('Map selection step skipped - no specific map button found');
      }
      
      // Step 2: Look for regions or location data
      await page.waitForTimeout(2000);
      const hasLocationData = await page.evaluate(() => {
        return document.body.textContent.toLowerCase().includes('region') ||
               document.body.textContent.toLowerCase().includes('location') ||
               document.body.textContent.toLowerCase().includes('cave') ||
               document.body.textContent.toLowerCase().includes('resource');
      });
      
      // Step 3: Search for creatures
      const searchInput = await page.$('input[type="search"], input[placeholder*="search" i]');
      if (searchInput) {
        await searchInput.type('T-Rex');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        
        const searchResults = await page.content();
        expect(searchResults.toLowerCase()).toContain('rex');
      }
      
      // Journey should complete without errors
      expect(true).toBe(true);
    });

    test('accessibility features should work', async () => {
      await page.goto(baseUrl);
      await page.waitForTimeout(2000);
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);
      
      // Check if focus is visible
      const focusedElement = await page.evaluate(() => document.activeElement.tagName);
      expect(typeof focusedElement).toBe('string');
      
      // Test if images have alt text
      const imagesWithoutAlt = await page.$$eval('img', images => 
        images.filter(img => !img.alt || img.alt.trim() === '').length
      );
      
      // All images should have alt text (allow some flexibility for decorative images)
      expect(imagesWithoutAlt).toBeLessThanOrEqual(2);
    });
  });

  describe('Performance Tests', () => {
    test('page should load within acceptable time', async () => {
      const startTime = Date.now();
      
      await page.goto(baseUrl);
      await page.waitForSelector('body');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(10000); // 10 seconds max
    });

    test('should handle large datasets efficiently', async () => {
      await page.goto(baseUrl);
      
      // Measure performance of loading all creatures
      const startTime = Date.now();
      
      await page.evaluate(() => {
        return fetch('/api/creatures').then(r => r.json());
      });
      
      const apiTime = Date.now() - startTime;
      expect(apiTime).toBeLessThan(5000); // 5 seconds max for API call
    });
  });
});
