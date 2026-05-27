Feature: Grade Export and Reporting
  As a Teacher,
  I want to preview and export student grades,
  So that I can archive them or submit them for administrative purposes.

  Background:
    Given a Class with ID "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" exists in Semester "d3b07384-d113-404c-9f8a-020524032a9a"
    And several Students and GradeRecords exist in the Class

  # US-08-00: 預覽全班成績總表 (GraphQL Primary Port)
  Scenario: Preview class Grade Summary matrix via GraphQL
    When a GraphQL query is made for the Grade Summary of Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" with the following fields:
      | id                     |
      | student_id             |
      | student_number         |
      | student_name           |
      | email                  |
      | grade_records          |
      | weighted_total_score   |
    Then the response should contain a matrix of all Students and their scores for each GradeItem
    And each Student's weighted_total_score should be calculated using the formula: Σ(score / max_score × weight)
    And Students should be ordered by student_number ascending

  # US-08-00 AC3: 未登記儲存格標示 (GraphQL)
  Scenario: Unregistered scores appear as null in Grade Summary
    Given a Student with ID "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" has no GradeRecord for GradeItem "f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c"
    When a GraphQL query is made for the Grade Summary of Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    Then the score for Student "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" on GradeItem "f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c" should be null
    And the null score should be treated as 0 in the weighted_total_score calculation

  # US-08-00 AC5: 總權重不等於 100% 時顯示警告
  Scenario: Grade Summary preview shows weight warning when total weight is not 100%
    Given the GradeItems in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" have a total weight of 80
    When a GraphQL query is made for the Grade Summary of Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    Then the response should contain a "weight_warning" flag set to true

  # US-08-03: 匯出成績報表 (operationId: exportGrades)
  Scenario Outline: Export grades to a file
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a:exportGrades" with the following data:
      | format | <format> |
    Then the response code should be 200
    And the response body should contain "status" equal to "COMPLETED"
    And the response body should contain "file_name" matching the pattern "<semester_name>_<class_name>_成績報表_<date>.<extension>"

    Examples:
      | format | extension |
      | EXCEL  | xlsx      |
      | CSV    | csv       |

  # US-08-03: 匯出時 Class 不存在
  Scenario: Export grades for a non-existent Class returns 404
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/00000000-0000-0000-0000-000000000000:exportGrades" with the following data:
      | format | EXCEL |
    Then the response code should be 404

  # US-08-04: 匯出出缺席摘要報表 (operationId: exportAttendance)
  Scenario: Export Attendance summary report
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a:exportAttendance" with the following data:
      | format | EXCEL |
    Then the response code should be 200
    And the response body should contain "status" equal to "COMPLETED"
    And the exported report should only include GradeItems of type ATTENDANCE

  # US-08-04 AC2: 出缺席報表欄位驗證
  Scenario: Attendance export includes required columns
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a:exportAttendance" with the following data:
      | format | EXCEL |
    Then the response code should be 200
    And the response body should indicate the export includes columns: student_id, student_number, student_name, email, attendance dates, present_count, absent_count, excused_count
