const { makeStudentId } = require('../../src/school-management/utils/student-id');

describe('makeStudentId', () => {
  test('builds deterministic id format', () => {
    const id = makeStudentId({
      schoolId: 12,
      academicYearLabel: '2025-2026',
      firstName: 'Jean',
      lastName: 'Pierre',
      index: 42
    });

    expect(id).toBe('S12-2025-2-JP0042');
  });
});
