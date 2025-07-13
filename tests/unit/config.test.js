const path = require('path');

// Test configuration utilities
describe('Configuration Tests', () => {
  test('should load environment variables', () => {
    // Test that we can access environment variables
    expect(process.env.NODE_ENV).toBeDefined();
  });

  test('should have proper project structure', () => {
    const srcPath = path.join(__dirname, '../../src');
    const testsPath = path.join(__dirname, '..');
    
    expect(srcPath).toContain('src');
    expect(testsPath).toContain('tests');
  });

  test('should handle JSON operations', () => {
    const testObject = {
      name: 'ASA Service',
      version: '2.0.0',
      features: ['maps', 'creatures', 'search']
    };

    const jsonString = JSON.stringify(testObject);
    const parsedObject = JSON.parse(jsonString);

    expect(parsedObject.name).toBe('ASA Service');
    expect(parsedObject.features).toHaveLength(3);
    expect(parsedObject.features).toContain('maps');
  });
});
