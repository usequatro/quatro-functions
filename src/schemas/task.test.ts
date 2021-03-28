import { taskSchema } from './task';

describe('taskSchema', () => {
  describe('clamping effort and impact', () => {
    it('leaves effort and impact the same when within range', () => {
      const { value } = taskSchema.validate({
        impact: 0,
        effort: 3,
      });
      expect(value.impact).toBe(0);
      expect(value.effort).toBe(3);
    });

    it('clamps effort', () => {
      const { value } = taskSchema.validate({
        impact: 1,
        effort: 4,
      });
      expect(value.effort).toBe(3);
    });

    it('clamps impact', () => {
      const { value } = taskSchema.validate({
        effort: 1,
        impact: 4,
      });
      expect(value.impact).toBe(3);
    });

    it('clamps when updating', () => {
      const { value } = taskSchema.validate({
        effort: 4,
        impact: 4,
      });
      expect(value.impact).toBe(3);
    });
  });
});
