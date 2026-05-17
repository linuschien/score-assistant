Feature: Grade Item Management
  As a Teacher,
  I want to define assessment items (assignments, reports, attendance, performance),
  So that I can record and calculate scores for students.

  Background:
    Given a Class with ID "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" exists in Semester "d3b07384-d113-404c-9f8a-020524032a9a"

  # US-04-01: 新增成績項目
  Scenario Outline: Create a new GradeItem
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/grade-items" with the following data:
      | item_name | <name> |
      | item_type | <type> |
      | max_score | <max>  |
      | weight    | <w>    |
    Then the response code should be <status>
    And if <status> is 201, the response should contain a valid UUID for "grade_item_id"

    Examples:
      | name     | type                  | max | w  | status |
      | 第1次作業 | ASSIGNMENT            | 100 | 10 | 201    |
      | 期中報告  | REPORT                | 100 | 20 | 201    |
      | 10/20出席 | ATTENDANCE            | 1   | 5  | 201    |
      | 課堂發言  | CLASSROOM_PERFORMANCE | 10  | 5  | 201    |
      | 其他加分  | OTHER                 | 50  | 0  | 201    |
      | 負分測試  | ASSIGNMENT            | -10 | 0  | 400    |
      |           | ASSIGNMENT            | 100 | 0  | 400    |

  # US-04-01 AC: 同班級成績項目名稱不重複
  Scenario: Prevent duplicate GradeItem names in the same Class
    Given a GradeItem with name "第1次作業" already exists in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/grade-items" with the following data:
      | item_name | 第1次作業  |
      | item_type | ASSIGNMENT |
      | max_score | 100        |
    Then the response code should be 400

  # US-04-02: 查看成績項目列表 (GraphQL Primary Port)
  Scenario: List all GradeItems in a Class via GraphQL
    When a GraphQL query is made for all GradeItems in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" with the following fields:
      | grade_item_id    |
      | item_name        |
      | item_type        |
      | item_date        |
      | item_description |
      | max_score        |
      | weight           |
    Then the response should contain a list of GradeItems

  # US-04-02: 查看單一成績項目
  Scenario: Get a GradeItem by ID
    Given a GradeItem with ID "f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c" exists in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    When a GET request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/grade-items/f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c"
    Then the response code should be 200
    And the response body should contain "grade_item_id" equal to "f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c"

  # US-04-03: 編輯成績項目
  Scenario: Update GradeItem information
    Given a GradeItem with ID "f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c" exists in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    When a PUT request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/grade-items/f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c" with the following data:
      | item_name        | 第1次作業-修正   |
      | item_type        | ASSIGNMENT       |
      | item_description | 修正後的作業說明 |
      | max_score        | 100              |
      | weight           | 15               |
    Then the response code should be 200

  Scenario: Update a non-existent GradeItem returns 404
    When a PUT request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/grade-items/00000000-0000-0000-0000-000000000000" with the following data:
      | item_name | 不存在項目 |
      | item_type | OTHER      |
      | max_score | 100        |
    Then the response code should be 404

  # US-04-04: 刪除成績項目
  Scenario: Delete a GradeItem
    Given a GradeItem with ID "f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c" exists in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    When a DELETE request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/grade-items/f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c"
    Then the response code should be 204

  Scenario: Delete a non-existent GradeItem returns 404
    When a DELETE request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/grade-items/00000000-0000-0000-0000-000000000000"
    Then the response code should be 404
