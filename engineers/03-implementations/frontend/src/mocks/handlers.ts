import { semesterHandlers } from './handlers/semester-handlers';
import { classHandlers } from './handlers/class-handlers';
import { studentHandlers } from './handlers/student-handlers';
import { gradeHandlers } from './handlers/grade-handlers';

// Re-export seed fixtures and helpers for full backward compatibility
export {
  mockSemesters,
  mockClasses,
  mockGradeItems,
  mockGradeRecords,
  mockAttachments,
  mockStudents,
  resetMockSemesters,
  resetMockClasses,
  resetMockGradeItems,
  setMockGradeItems,
  resetMockGradeRecords,
  setMockGradeRecords,
  resetMockAttachments,
  setMockAttachments
} from './fixtures';

// Aggregate all domain-specific handlers
export const handlers = [
  ...semesterHandlers,
  ...classHandlers,
  ...studentHandlers,
  ...gradeHandlers
];
