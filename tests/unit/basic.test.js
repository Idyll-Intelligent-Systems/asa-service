// Basic unit test to ensure Jest is working
describe('Application Setup', () => {
  test('should be able to run tests', () => {
    expect(true).toBe(true);
  });

  test('should have basic math operations working', () => {
    expect(2 + 2).toBe(4);
    expect(5 * 3).toBe(15);
  });

  test('should handle strings correctly', () => {
    const testString = 'ASA Service';
    expect(testString).toContain('ASA');
    expect(testString.length).toBe(11);
  });
});
