Feature: Grade Recording
  As a Teacher,
  I want to record scores and upload attachments for students,
  So that I can keep track of their performance.

  Background:
    Given a Class with ID "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" exists
    And a Grade Item with ID "f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c" (Type: <item_type>) exists
    And a Student with ID "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" exists

  Scenario Outline: Record a score for a student
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/grade-items/f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c/grade-records" with the following data:
      | student_id | a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d |
      | score      | <score_val>                          |
    Then the response code should be <status>

    Examples:
      | item_type             | score_val | status |
      | ASSIGNMENT            | 85        | 201    |
      | ASSIGNMENT            | -5        | 400    |
      | CLASSROOM_PERFORMANCE | -2        | 201    |
      | ATTENDANCE            | 1         | 201    |
      | ATTENDANCE            | 0         | 201    |
      | ATTENDANCE            | 0.5       | 201    |

  Scenario: Upload an attachment for a grade record
    Given a Grade Record with ID "b5c6d7e8-f9a0-1b2c-3d4e-5f6a7b8c9d0e" exists
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/grade-items/f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c/grade-records/b5c6d7e8-f9a0-1b2c-3d4e-5f6a7b8c9d0e/attachments" with a 5MB PDF file
    Then the response code should be 201
    And the attachment should be associated with the Grade Record

  Scenario: Reject large attachments
    Given a Grade Record with ID "b5c6d7e8-f9a0-1b2c-3d4e-5f6a7b8c9d0e" exists
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/grade-items/f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c/grade-records/b5c6d7e8-f9a0-1b2c-3d4e-5f6a7b8c9d0e/attachments" with a 15MB file
    Then the response code should be 400
    And the error message should indicate that the file is too large
