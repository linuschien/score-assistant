Feature: Class Management
  As a Teacher,
  I want to manage classes within a semester,
  So that I can group students and grade items together.

  Background:
    Given a Semester with ID "d3b07384-d113-404c-9f8a-020524032a9a" exists

  # US-02-01: 建立新班級
  Scenario Outline: Create a new Class in a Semester
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes" with the following data:
      | class_name  | <name>  |
      | class_group | <group> |
    Then the response code should be <status>
    And if <status> is 201, the response should contain a valid UUID for "class_id"

    Examples:
      | name     | group        | status |
      | 三年甲班 | 理工班群     | 201    |
      | 二年乙班 |              | 201    |
      |          | 社會科學班群 | 400    |

  # US-02-01 AC: 同學期不重複班級名稱
  Scenario: Prevent duplicate Class names in the same Semester
    Given a Class with name "三年甲班" already exists in Semester "d3b07384-d113-404c-9f8a-020524032a9a"
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes" with the following data:
      | class_name | 三年甲班 |
    Then the response code should be 400

  # US-02-02: 查看班級列表 (GraphQL Primary Port)
  Scenario: List all Classes in a Semester via GraphQL
    When a GraphQL query is made for all Classes in Semester "d3b07384-d113-404c-9f8a-020524032a9a" with the following fields:
      | class_id    |
      | class_name  |
      | class_group |
    Then the response should contain a list of Classes

  # US-02-02 AC3: 依班群篩選班級
  Scenario: List and filter Classes in a Semester by class_group via GraphQL
    When a GraphQL query is made for all Classes in Semester "d3b07384-d113-404c-9f8a-020524032a9a" with class_group filter "理工班群" and fields:
      | class_id    |
      | class_name  |
      | class_group |
    Then the response should contain only Classes belonging to "理工班群"

  # US-02-02: 查看單一班級
  Scenario: Get a Class by ID
    Given a Class with ID "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" exists in Semester "d3b07384-d113-404c-9f8a-020524032a9a"
    When a GET request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    Then the response code should be 200
    And the response body should contain "class_id" equal to "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"

  # US-02-03: 編輯班級資訊
  Scenario: Update Class information
    Given a Class with ID "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" exists in Semester "d3b07384-d113-404c-9f8a-020524032a9a"
    When a PUT request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" with the following data:
      | class_name  | 三年甲班-改   |
      | class_group | 社會科學班群 |
    Then the response code should be 200

  Scenario: Update a non-existent Class returns 404
    When a PUT request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/00000000-0000-0000-0000-000000000000" with the following data:
      | class_name | 不存在班級 |
    Then the response code should be 404

  # US-02-04: 刪除班級
  Scenario: Delete a Class
    Given a Class with ID "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" exists in Semester "d3b07384-d113-404c-9f8a-020524032a9a"
    When a DELETE request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    Then the response code should be 204
    And the Class with ID "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" should no longer exist

  Scenario: Delete a non-existent Class returns 404
    When a DELETE request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/00000000-0000-0000-0000-000000000000"
    Then the response code should be 404
