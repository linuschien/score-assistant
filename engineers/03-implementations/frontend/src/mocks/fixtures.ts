// Shared mock state fixtures for local preview and testing

export const mockSemesters: any[] = [
  { id: '1', semesterName: '112-1 第一學期', startDate: '2023-09-01', endDate: '2024-01-31', classCount: 3 }
];

export const mockClasses: any[] = [
  { id: '1', semesterId: '1', className: '資訊三甲', passingThreshold: 60.0 },
  { id: '2', semesterId: '1', className: '資訊三乙', passingThreshold: 60.0 },
  { id: '3', semesterId: '2', className: '電子三甲', passingThreshold: 60.0 }
];

export const mockGradeItems: any[] = [
  {
    id: '1',
    classId: '1',
    itemName: '期中考',
    itemType: 'ASSIGNMENT',
    itemDate: '2026-11-01',
    itemDescription: '期中學科測驗',
    maxScore: 100,
    weight: 0.3,
  }
];

export const mockGradeRecords: any[] = [
  { id: '1', gradeItemId: '1', studentId: '1', score: 85, lastModifiedAt: '2026-05-22T22:23:43', version: 1 }
];

export const mockAttachments: any[] = [
  { id: '1', gradeRecordId: '1', fileName: 'homework1.pdf', mimeType: 'application/pdf', fileSize: 10240, uploadedAt: '2023-09-15' }
];

export const mockStudents: any[] = [
  { id: '1', classId: '1', studentNumber: '01', studentName: '王小明', name: '王小明', attendanceStatus: 'normal' }
];

// Helper functions for state reset and initialization

export function resetMockSemesters() {
  mockSemesters.splice(0, mockSemesters.length,
    { id: '1', semesterName: '112-1 第一學期', startDate: '2023-09-01', endDate: '2024-01-31', classCount: 3 }
  );
  mockClasses.splice(0, mockClasses.length,
    { id: '1', semesterId: '1', className: '資訊三甲', passingThreshold: 60.0 },
    { id: '2', semesterId: '1', className: '資訊三乙', passingThreshold: 60.0 },
    { id: '3', semesterId: '2', className: '電子三甲', passingThreshold: 60.0 }
  );
}

export function resetMockClasses() {
  mockClasses.splice(0, mockClasses.length,
    { id: '1', semesterId: '1', className: '資訊三甲', passingThreshold: 60.0 },
    { id: '2', semesterId: '1', className: '資訊三乙', passingThreshold: 60.0 },
    { id: '3', semesterId: '2', className: '電子三甲', passingThreshold: 60.0 }
  );
}

export function resetMockGradeItems() {
  mockGradeItems.splice(0, mockGradeItems.length, {
    id: '1',
    classId: '1',
    itemName: '期中考',
    itemType: 'ASSIGNMENT',
    itemDate: '2026-11-01',
    itemDescription: '期中學科測驗',
    maxScore: 100,
    weight: 0.3,
  });
}

export function setMockGradeItems(items: any[]) {
  mockGradeItems.splice(0, mockGradeItems.length, ...items);
}

export function resetMockGradeRecords() {
  mockGradeRecords.splice(0, mockGradeRecords.length, {
    id: '1',
    gradeItemId: '1',
    studentId: '1',
    score: 85,
    lastModifiedAt: '2026-05-22T22:23:43',
    version: 1
  });
}

export function setMockGradeRecords(records: any[]) {
  mockGradeRecords.splice(0, mockGradeRecords.length, ...records);
}

export function resetMockAttachments() {
  mockAttachments.splice(0, mockAttachments.length, {
    id: '1',
    gradeRecordId: '1',
    fileName: 'homework1.pdf',
    mimeType: 'application/pdf',
    fileSize: 10240,
    uploadedAt: '2023-09-15'
  });
}

export function setMockAttachments(attachmentsList: any[]) {
  mockAttachments.splice(0, mockAttachments.length, ...attachmentsList);
}
