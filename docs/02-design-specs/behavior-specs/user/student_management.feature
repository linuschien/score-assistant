Feature: Student Management
  As a Teacher,
  I want to manage students within a class,
  So that I can record their grades and attendance.

  Background:
    Given a Class with ID "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" exists in Semester "d3b07384-d113-404c-9f8a-020524032a9a"

  # US-03-02: 手動新增單一學生
  Scenario Outline: Add a Student to a Class
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/students" with the following data:
      | student_number | <number> |
      | student_name   | <name>   |
    Then the response code should be <status>
    And if <status> is 201, the response should contain a valid UUID for "student_id"

    Examples:
      | number | name   | status |
      | 1      | 王小明 | 201    |
      | 2      | 李小華 | 201    |
      | 0      | 錯誤   | 400    |

  # US-03-02 AC3: 同班級座號不可重複
  Scenario: Prevent duplicate student_number in the same Class
    Given a Student with student_number 1 already exists in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/students" with the following data:
      | student_number | 1    |
      | student_name   | 重複 |
    Then the response code should be 400

  # US-03-03: 查看班級學生列表 (GraphQL Primary Port)
  Scenario: List all Students in a Class via GraphQL
    When a GraphQL query is made for all Students in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" with the following fields:
      | student_id     |
      | student_number |
      | student_name   |
    Then the response should contain a list of Students ordered by student_number ascending

  # US-03-03: 查看單一學生
  Scenario: Get a Student by ID
    Given a Student with ID "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" exists in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    When a GET request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/students/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
    Then the response code should be 200
    And the response body should contain "student_id" equal to "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"

  # US-03-04: 編輯學生資料
  Scenario: Update Student information
    Given a Student with ID "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" exists in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    When a PUT request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/students/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" with the following data:
      | student_number | 10     |
      | student_name   | 王大明 |
    Then the response code should be 200

  Scenario: Update a non-existent Student returns 404
    When a PUT request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/students/00000000-0000-0000-0000-000000000000" with the following data:
      | student_number | 99     |
      | student_name   | 不存在 |
    Then the response code should be 404

  # US-03-05: 移除學生
  Scenario: Delete a Student
    Given a Student with ID "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" exists in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    When a DELETE request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/students/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
    Then the response code should be 204
    And the Student with ID "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" should no longer exist

  Scenario: Delete a non-existent Student returns 404
    When a DELETE request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/students/00000000-0000-0000-0000-000000000000"
    Then the response code should be 404

  # US-03-01: 批次匯入學生 (operationId: importStudents)
  Scenario: Import Students from CSV (happy path)
    Given a CSV file with the following content:
      | number | name   |
      | 1      | 王小明 |
      | 2      | 李小華 |
      | 3      | 張大強 |
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/students:importStudents" with the CSV file as multipart/form-data
    Then the response code should be 200
    And the response body should contain "success_count" equal to 3
    And the response body should contain "failure_count" equal to 0

  # US-03-01 AC4: 匯入時發生座號衝突
  Scenario Outline: Import Students from CSV with conflicts
    Given a Student with student_number 1 already exists in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    And a CSV file with the following content:
      | number | name |
      | 1      | 趙六 |
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/students:importStudents" with conflict_resolution set to "<strategy>"
    Then the response code should be 200
    And the response body should contain "failure_count" equal to <failure_count>
    And the response body should contain "success_count" equal to <success_count>

    Examples:
      | strategy  | failure_count | success_count |
      | SKIP      | 1             | 0             |
      | OVERWRITE | 0             | 1             |
