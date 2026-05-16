Feature: Class Management
  As a Teacher,
  I want to manage classes within a semester,
  So that I can group students and grade items together.

  Background:
    Given a Semester with ID "d3b07384-d113-404c-9f8a-020524032a9a" exists

  Scenario Outline: Create a new Class in a Semester
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes" with the following data:
      | class_name | <name> |
    Then the response code should be <status>
    And if <status> is 201, the response should contain a valid UUID for "class_id"

    Examples:
      | name      | status |
      | 三年甲班  | 201    |
      | 二年乙班  | 201    |
      |           | 400    |

  Scenario: Prevent duplicate Class names in the same Semester
    Given a Class with name "三年甲班" already exists in Semester "d3b07384-d113-404c-9f8a-020524032a9a"
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes" with the following data:
      | class_name | 三年甲班 |
    Then the response code should be 400

  Scenario: Update Class information
    Given a Class with ID "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" exists in Semester "d3b07384-d113-404c-9f8a-020524032a9a"
    When a PUT request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" with the following data:
      | class_name | 三年甲班-改 |
    Then the response code should be 200

  Scenario: Delete a Class
    Given a Class with ID "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" exists in Semester "d3b07384-d113-404c-9f8a-020524032a9a"
    When a DELETE request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    Then the response code should be 204
    And the Class with ID "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" should no longer exist
