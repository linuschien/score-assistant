Feature: Student Management
  As a Teacher,
  I want to manage students within a class,
  So that I can record their grades and attendance.

  Background:
    Given a Class with ID "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" exists in Semester "d3b07384-d113-404c-9f8a-020524032a9a"

  Scenario Outline: Add a student to a Class
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
      | 1      | 重複   | 400    |

  Scenario: Update Student information
    Given a Student with ID "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" exists in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    When a PUT request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/students/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" with the following data:
      | student_number | 10     |
      | student_name   | 王大明 |
    Then the response code should be 200

  Scenario: Delete a Student
    Given a Student with ID "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" exists
    When a DELETE request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/students/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
    Then the response code should be 204
    And the Student should no longer exist
