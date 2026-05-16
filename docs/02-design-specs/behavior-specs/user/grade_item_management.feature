Feature: Grade Item Management
  As a Teacher,
  I want to define assessment items (assignments, reports, attendance, performance),
  So that I can record and calculate scores for students.

  Background:
    Given a Class with ID "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" exists

  Scenario Outline: Create a new Grade Item
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/grade-items" with the following data:
      | item_name | <name> |
      | item_type | <type> |
      | max_score | <max>  |
      | weight    | <w>    |
    Then the response code should be <status>
    And if <status> is 201, the response should contain a valid UUID for "grade_item_id"

    Examples:
      | name         | type                  | max | w  | status |
      | 第1次作業    | ASSIGNMENT            | 100 | 10 | 201    |
      | 期中報告     | REPORT                | 100 | 20 | 201    |
      | 10/20出席    | ATTENDANCE            | 1   | 5  | 201    |
      | 課堂發言     | CLASSROOM_PERFORMANCE | 10  | 5  | 201    |
      | 負分測試     | ASSIGNMENT            | -10 | 0  | 400    |

  Scenario: Prevent duplicate Grade Item names in the same Class
    Given a Grade Item with name "第1次作業" already exists in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/grade-items" with the following data:
      | item_name | 第1次作業 |
      | item_type | ASSIGNMENT |
    Then the response code should be 400

  Scenario: Delete a Grade Item
    Given a Grade Item with ID "f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c" exists
    When a DELETE request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/grade-items/f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c"
    Then the response code should be 204
