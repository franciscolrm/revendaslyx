import { ImportsService } from './imports.service';
import { BadRequestException } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';

describe('ImportsService — Input Validation', () => {
  let service: ImportsService;

  beforeEach(() => {
    const mockSupabase = { admin: { from: jest.fn(), storage: { from: jest.fn() } } };
    service = new ImportsService(mockSupabase as any);
  });

  describe('parseFile (via private method reflection)', () => {
    it('should reject invalid JSON', () => {
      const file = {
        buffer: Buffer.from('{ invalid json'),
        mimetype: 'application/json',
        originalname: 'test.json',
      } as Express.Multer.File;

      expect(() => (service as any).parseFile(file)).toThrow(
        BadRequestException,
      );
    });

    it('should parse valid JSON array', () => {
      const file = {
        buffer: Buffer.from('[{"name":"test"},{"name":"test2"}]'),
        mimetype: 'application/json',
        originalname: 'test.json',
      } as Express.Multer.File;

      const result = (service as any).parseFile(file);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('test');
    });

    it('should parse valid JSON object as single-item array', () => {
      const file = {
        buffer: Buffer.from('{"name":"single"}'),
        mimetype: 'application/json',
        originalname: 'test.json',
      } as Express.Multer.File;

      const result = (service as any).parseFile(file);
      expect(result).toHaveLength(1);
    });

    it('should reject unsupported file types', () => {
      const file = {
        buffer: Buffer.from('<xml>test</xml>'),
        mimetype: 'text/xml',
        originalname: 'test.xml',
      } as Express.Multer.File;

      expect(() => (service as any).parseFile(file)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('parseCsv', () => {
    it('should reject empty CSV', () => {
      expect(() => (service as any).parseCsv('')).toThrow(
        BadRequestException,
      );
    });

    it('should reject CSV with only headers', () => {
      expect(() => (service as any).parseCsv('name,email')).toThrow(
        BadRequestException,
      );
    });

    it('should parse valid CSV', () => {
      const csv = 'name,email\nJohn,john@test.com\nJane,jane@test.com';
      const result = (service as any).parseCsv(csv);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John');
      expect(result[0].email).toBe('john@test.com');
    });

    it('should sanitize special characters from headers', () => {
      const csv = 'na<me>,em(ail)\nJohn,john@test.com';
      const result = (service as any).parseCsv(csv);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('email');
      // Special chars removed
      expect(Object.keys(result[0])).not.toContain('na<me>');
    });
  });
});
