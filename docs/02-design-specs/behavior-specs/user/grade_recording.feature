Feature: Grade Recording
  As a Teacher,
  I want to record scores for students and upload attachments,
  So that I can keep track of their performance.

  Background:
    Given a Class with ID "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" exists in Semester "d3b07384-d113-404c-9f8a-020524032a9a"
    And a Student with ID "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" exists in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"

  # US-05-01: 分數登記 (numeric score)
  Scenario Outline: Record a numeric score for a Student
    Given a GradeItem with ID "f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c" of type "<item_type>" and max_score <max_score> exists
    When a POST request is made to "/grade-records" with the following data:
      | grade_item_id | f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c    |
      | student_id    | a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d    |
      | score         | <score_val>                               |
    Then the response code should be <status>
    And if <status> is 201, the response should contain a valid UUID for "grade_record_id"

    Examples:
      | item_type             | max_score | score_val | status |
      | ASSIGNMENT            | 100       | 85        | 201    |
      | ASSIGNMENT            | 100       | -5        | 400    |
      | CLASSROOM_PERFORMANCE | 10        | -2        | 201    |
      | ATTENDANCE            | 1         | 1         | 201    |
      | ATTENDANCE            | 1         | 0         | 201    |
      | ATTENDANCE            | 1         | 0.5       | 201    |
      | REPORT                | 100       | 75        | 201    |
      | OTHER                 | 50        | 45        | 201    |

  # US-05-01 AC2: ATTENDANCE 出缺席快捷狀態自動換算
  Scenario Outline: Record Attendance with automatic status-to-score mapping
    Given a GradeItem with ID "f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c" of type "ATTENDANCE" and max_score 1 exists
    When a POST request is made to "/grade-records" with the following data:
      | grade_item_id      | f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c |
      | student_id         | a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d |
      | attendance_status  | <attendance_status>                    |
    Then the response code should be 201
    And the recorded score should be <mapped_score>

    Examples:
      | attendance_status | mapped_score |
      | PRESENT           | 1.0          |
      | ABSENT            | 0.0          |
      | EXCUSED           | 0.5          |

  # US-05-02: 修改已登記分數
  Scenario: Update an existing GradeRecord
    Given a GradeRecord with ID "b5c6d7e8-f9a0-1b2c-3d4e-5f6a7b8c9d0e" exists
    When a PUT request is made to "/grade-records/b5c6d7e8-f9a0-1b2c-3d4e-5f6a7b8c9d0e" with the following data:
      | grade_item_id | f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c |
      | student_id    | a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d |
      | score         | 90                                     |
    Then the response code should be 200
    And the response body should contain an updated "last_modified_at" timestamp

  Scenario: Update a non-existent GradeRecord returns 404
    When a PUT request is made to "/grade-records/00000000-0000-0000-0000-000000000000" with the following data:
      | grade_item_id | f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c |
      | student_id    | a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d |
      | score         | 80                                     |
    Then the response code should be 404

  # US-06: 上傳附件 (operationId: createAttachment)
  # Note: Attachment endpoint is /grade-records/{gradeRecordId}/attachments per OpenAPI contract
  Scenario: Upload an Attachment for a GradeRecord
    Given a GradeRecord with ID "b5c6d7e8-f9a0-1b2c-3d4e-5f6a7b8c9d0e" exists
    When a POST request is made to "/grade-records/b5c6d7e8-f9a0-1b2c-3d4e-5f6a7b8c9d0e/attachments" with a 5MB PDF file
    Then the response code should be 201
    And the response body should contain a valid UUID for "attachment_id"
    And the Attachment should be associated with GradeRecord "b5c6d7e8-f9a0-1b2c-3d4e-5f6a7b8c9d0e"

  # US-06 AC: 附件大小上限 10MB
  Scenario: Reject Attachments exceeding 10MB size limit
    Given a GradeRecord with ID "b5c6d7e8-f9a0-1b2c-3d4e-5f6a7b8c9d0e" exists
    When a POST request is made to "/grade-records/b5c6d7e8-f9a0-1b2c-3d4e-5f6a7b8c9d0e/attachments" with a 15MB file
    Then the response code should be 400
    And the error message should indicate that the file exceeds the 10MB size limit

  # US-06 AC: 每位學生每個成績項目最多 5 個附件
  Scenario: Reject Attachment when limit of 5 per GradeRecord is reached
    Given a GradeRecord with ID "b5c6d7e8-f9a0-1b2c-3d4e-5f6a7b8c9d0e" already has 5 Attachments
    When a POST request is made to "/grade-records/b5c6d7e8-f9a0-1b2c-3d4e-5f6a7b8c9d0e/attachments" with a 1MB PDF file
    Then the response code should be 400
    And the error message should indicate that the attachment limit has been reached

  # US-05-03: 查看單一學生的所有成績 (GraphQL Primary Port)
  Scenario: View a single Student's full grades and weighted total score via GraphQL
    Given a Student with ID "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" exists in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    When a GraphQL query is made for all GradeRecords of Student "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" with the following fields:
      | id             |
      | gradeItemId    |
      | score          |
      | lastModifiedAt |
    Then the response should contain the list of GradeRecords for the Student
    And the Student's weighted_total_score should be calculated and displayed
