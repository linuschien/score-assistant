Feature: Semester Management
  As a Teacher,
  I want to manage semesters (create, update, delete, view),
  So that I can organize classes and grades by academic periods.

  Background:
    Given the "score-assistant" service is initialized

  # US-01-01: 建立新學期
  Scenario Outline: Create a new Semester
    When a POST request is made to "/semesters" with the following data:
      | semester_name | <name>  |
      | start_date    | <start> |
      | end_date      | <end>   |
    Then the response code should be <status>
    And if <status> is 201, the response should contain a valid UUID for "semester_id"

    Examples:
      | name              | start      | end        | status |
      | 113學年度第一學期 | 2024-09-01 | 2025-01-31 | 201    |
      | 113學年度第二學期 | 2025-02-01 | 2025-06-30 | 201    |
      |                   | 2024-09-01 | 2025-01-31 | 400    |

  # US-01-01 AC4: 重複學期名稱
  Scenario: Prevent duplicate Semester names
    Given a Semester with name "113學年度第一學期" already exists
    When a POST request is made to "/semesters" with the following data:
      | semester_name | 113學年度第一學期 |
      | start_date    | 2024-09-01        |
      | end_date      | 2025-01-31        |
    Then the response code should be 400
    And the error message should indicate that the name is already taken

  # US-01-02: 查看學期列表 (GraphQL Primary Port)
  Scenario: List all Semesters via GraphQL
    When a GraphQL query is made for all Semesters with the following fields:
      | semester_id   |
      | semester_name |
      | start_date    |
      | end_date      |
    Then the response should contain a list of Semesters
    And the list should be ordered by start_date descending

  # US-01-02: 查看單一學期
  Scenario: Get a Semester by ID
    Given a Semester with ID "d3b07384-d113-404c-9f8a-020524032a9a" exists
    When a GET request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a"
    Then the response code should be 200
    And the response body should contain "semester_id" equal to "d3b07384-d113-404c-9f8a-020524032a9a"

  # US-01-03: 編輯學期資訊
  Scenario Outline: Update Semester information
    Given a Semester with ID "d3b07384-d113-404c-9f8a-020524032a9a" exists
    When a PUT request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a" with the following data:
      | semester_name | <new_name>  |
      | start_date    | <new_start> |
      | end_date      | <new_end>   |
    Then the response code should be <status>

    Examples:
      | new_name               | new_start  | new_end    | status |
      | 113學年度第一學期-修正 | 2024-09-01 | 2025-01-20 | 200    |
      |                        | 2024-09-01 | 2025-01-20 | 400    |

  Scenario: Update a non-existent Semester returns 404
    When a PUT request is made to "/semesters/00000000-0000-0000-0000-000000000000" with the following data:
      | semester_name | 不存在學期 |
      | start_date    | 2024-09-01  |
      | end_date      | 2025-01-31  |
    Then the response code should be 404

  # US-01-04: 刪除學期
  Scenario: Delete a Semester
    Given a Semester with ID "d3b07384-d113-404c-9f8a-020524032a9a" exists
    When a DELETE request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a"
    Then the response code should be 204
    And the Semester with ID "d3b07384-d113-404c-9f8a-020524032a9a" should no longer exist

  Scenario: Delete a non-existent Semester returns 404
    When a DELETE request is made to "/semesters/00000000-0000-0000-0000-000000000000"
    Then the response code should be 404
