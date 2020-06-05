import { fromFQDN, toFQDN } from './fqdn.transformer';

describe('FQDN Transformer', () => {
  describe('fromFQDN', () => {
    it('should return the paramater unchanged', () => {
      const value = 'test.com';

      const result = fromFQDN(value);

      expect(result).toBe(value);
    });
  });

  describe('toFQDN', () => {
    it('should return the paramater in lowercase', () => {
      const value = 'Test.com';

      const result = toFQDN(value);

      expect(result).toBe(value.toLowerCase());
    });
  });
});
