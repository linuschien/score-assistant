Feature: Semester Management
  As a Teacher,
  I want to manage semesters (create, update, delete, view),
  So that I can organize classes and grades by academic periods.

  Background:
    Given the "score-assistant" service is initialized

  Scenario Outline: Create a new Semester
    When a POST request is made to "/semesters" with the following data:
      | semester_name   | <name>   |
      | start_date      | <start>  |
      | end_date        | <end>    |
    Then the response code should be <status>
    And if <status> is 201, the response should contain a valid UUID for "semester_id"

    Examples:
      | name                  | start      | end        | status |
      | 113學年度第一學期     | 2024-09-01 | 2025-01-31 | 201    |
      | 113學年度第二學期     | 2025-02-01 | 2025-06-30 | 201    |
      |                       | 2024-09-01 | 2025-01-31 | 400    |

  Scenario Outline: Prevent duplicate Semester names
    Given a Semester with name "113學年度第一學期" already exists
    When a POST request is made to "/semesters" with the following data:
      | semester_name   | 113學年度第一學期 |
      | start_date      | 2024-09-01        |
      | end_date        | 2025-01-31        |
    Then the response code should be 400
    And the error message should indicate that the name is already taken

  Scenario Outline: Update Semester information
    Given a Semester with ID "d3b07384-d113-404c-9f8a-020524032a9a" exists
    When a PUT request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a" with the following data:
      | semester_name   | <new_name> |
      | start_date      | <new_start>|
      | end_date        | <new_end>  |
    Then the response code should be <status>

    Examples:
      | new_name              | new_start  | new_end    | status |
      | 113學年度第一學期-修正 | 2024-09-01 | 2025-01-20 | 200    |
      |                       | 2024-09-01 | 2025-01-20 | 400    |

  Scenario: Delete a Semester
    Given a Semester with ID "d3b07384-d113-404c-9f8a-020524032a9a" exists
    When a DELETE request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a"
    Then the response code should be 204
    And the Semester with ID "d3b07384-d113-404c-9f8a-020524032a9a" should no longer exist
