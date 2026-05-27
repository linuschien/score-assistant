Feature: Student Management
  As a Teacher,
  I want to manage students within a class,
  So that I can record their grades and attendance.

  Background:
    Given a Class with ID "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" exists in Semester "d3b07384-d113-404c-9f8a-020524032a9a"

  # US-03-02: 手動新增單一學生
  Scenario Outline: Add a Student to a Class
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/students" with the following data:
      | student_id     | <id>     |
      | student_number | <number> |
      | student_name   | <name>   |
      | email          | <email>  |
    Then the response code should be <status>
    And if <status> is 201, the response should contain a valid UUID for "id"

    Examples:
      | id        | number | name   | email               | status |
      | S99543021 | 1      | 王小明 | xiaoming@gmail.com  | 201    |
      | S99543022 | 2      | 李小華 | xiaohua@gmail.com   | 201    |
      |           | 3      | 張大強 | daqiang@gmail.com   | 400    |
      | S99543023 | 0      | 錯誤   | error@gmail.com     | 400    |
      | S99543024 | 4      | 趙六   | invalid-email       | 400    |
      | S99543025 | 5      | 錢七   |                     | 400    |

  # US-03-02 AC3: 同班級座號不可重複
  Scenario: Prevent duplicate student_number in the same Class
    Given a Student with student_number 1 already exists in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/students" with the following data:
      | student_id     | S99543026     |
      | student_number | 1             |
      | student_name   | 重複          |
      | email          | dup@gmail.com |
    Then the response code should be 400

  # US-03-02 AC3: 學號與電子信箱必須為全域唯一
  Scenario: Prevent duplicate student_id across different Classes or Semesters
    Given a Student with student_id "S99543021" already exists in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/00000000-0000-0000-0000-000000000000/students" with the following data:
      | student_id     | S99543021         |
      | student_number | 1                 |
      | student_name   | 新學生            |
      | email          | newstud@gmail.com |
    Then the response code should be 400

  Scenario: Prevent duplicate email across different Classes or Semesters
    Given a Student with email "linus@torvalds.org" already exists in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/00000000-0000-0000-0000-000000000000/students" with the following data:
      | student_id     | S99543022          |
      | student_number | 1                  |
      | student_name   | 新學生             |
      | email          | linus@torvalds.org |
    Then the response code should be 400

  # US-03-03: 查看班級學生列表 (GraphQL Primary Port)
  Scenario: List all Students in a Class via GraphQL
    When a GraphQL query is made for all Students in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" with the following fields:
      | id             |
      | student_id     |
      | student_number |
      | student_name   |
      | email          |
    Then the response should contain a list of Students ordered by student_number ascending

  # US-03-03: 查看單一學生
  Scenario: Get a Student by ID
    Given a Student with ID "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" exists in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    When a GET request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/students/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
    Then the response code should be 200
    And the response body should contain "id" equal to "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"

  # US-03-04: 編輯學生資料
  Scenario: Update Student information
    Given a Student with ID "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" exists in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    When a PUT request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/students/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" with the following data:
      | student_id     | S99543021         |
      | student_number | 10                |
      | student_name   | 王大明            |
      | email          | bigwang@gmail.com |
    Then the response code should be 200

  Scenario: Update a non-existent Student returns 404
    When a PUT request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/students/00000000-0000-0000-0000-000000000000" with the following data:
      | student_id     | S99543099          |
      | student_number | 99                 |
      | student_name   | 不存在             |
      | email          | noexist@gmail.com  |
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
      | student_id | student_number | student_name | email               |
      | S001       | 1              | 王小明       | xiaoming@gmail.com  |
      | S002       | 2              | 李小華       | xiaohua@gmail.com   |
      | S003       | 3              | 張大強       | daqiang@gmail.com   |
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/students:importStudents" with the CSV file as multipart/form-data
    Then the response code should be 200
    And the response body should contain "success_count" equal to 3
    And the response body should contain "failure_count" equal to 0

  # US-03-01 AC4: 匯入時發生座號衝突
  Scenario Outline: Import Students from CSV with conflicts
    Given a Student with student_id "S001" and student_number 1 and email "xiaoming@gmail.com" already exists in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    And a CSV file with the following content:
      | student_id | student_number | student_name | email               |
      | S001       | 1              | 趙六         | xiaoming@gmail.com  |
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/students:importStudents" with conflict_resolution set to "<strategy>"
    Then the response code should be 200
    And the response body should contain "failure_count" equal to <failure_count>
    And the response body should contain "success_count" equal to <success_count>

    Examples:
      | strategy  | failure_count | success_count |
      | SKIP      | 1             | 0             |
      | OVERWRITE | 0             | 1             |

  # US-03-01 AC4: 匯入時發生全域學號或電子信箱重複衝突
  Scenario: Import Students from CSV with global student_id or email conflict
    Given a Student with student_id "S99543021" and email "linus@torvalds.org" already exists in a different Class
    And a CSV file with the following content:
      | student_id | student_number | student_name | email              |
      | S99543021  | 1              | 新學生一     | new1@gmail.com     |
      | S99543022  | 2              | 新學生二     | linus@torvalds.org |
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/students:importStudents"
    Then the response code should be 200
    And the response body should contain "failure_count" equal to 2
    And the response body should contain "success_count" equal to 0
