Feature: Grade Weight Management
  As a Teacher,
  I want to manage the weight distribution of grade items,
  So that the final weighted score is calculated correctly.

  Background:
    Given a Class with ID "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" exists in Semester "d3b07384-d113-404c-9f8a-020524032a9a"
    And the following GradeItems exist in the Class:
      | grade_item_id                        | item_name    | item_type  | weight |
      | f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c | Assignment 1 | ASSIGNMENT | 20     |
      | e5f4d3c2-b1a0-9e8d-7c6b-5a4b3c2d1e0f | Midterm Exam | REPORT     | 30     |

  # US-07-01: 設定個別成績項目的權重 (PATCH per OAS: patchGradeItem)
  Scenario Outline: Update weight for a single GradeItem
    When a PATCH request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/grade-items/<item_id>" with the following data:
      | weight | <new_weight> |
    Then the response code should be <status>
    And if <status> is 200, the weight for GradeItem "<item_id>" should be <new_weight>

    Examples:
      | item_id                              | new_weight | status |
      | f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c | 25         | 200    |
      | f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c | -5         | 400    |
      | 00000000-0000-0000-0000-000000000000   | 10         | 404    |

  # US-07-01 AC2: 總權重不等於 100% 時仍允許儲存但顯示警告
  Scenario: Allow saving weight when total is not 100% with a warning
    When a PATCH request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a/grade-items/f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c" with the following data:
      | weight | 10 |
    Then the response code should be 200
    And the response body should contain "total_weight" not equal to 100
    And the response body should contain a "weight_warning" flag set to true

  # US-07-02: 查看權重分配總覽 (GraphQL Primary Port)
  Scenario: View weight distribution summary via GraphQL
    When a GraphQL query is made for GradeItems in Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" with the following fields:
      | grade_item_id |
      | item_name     |
      | item_type     |
      | weight        |
    Then the response should contain a list of GradeItems with their weight values
    And the response should include the aggregated "total_weight" for the Class

  # US-07-02 AC4: 依類型群組調整 (calculateWeightedScores custom action)
  Scenario: Calculate weighted scores for all Students in a Class
    Given all GradeItems in the Class have weights assigned and the total weight equals 100
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a:calculateWeightedScores" with the following data:
      | passing_threshold | 60 |
    Then the response code should be 200
    And the response body should contain "status" equal to "COMPLETED"

  # US-07-01 AC2: 警告機制 — 總權重不等於 100%
  Scenario: Warn when total weight is not 100% during calculation
    Given the GradeItems in the Class have a total weight of 90
    When a POST request is made to "/semesters/d3b07384-d113-404c-9f8a-020524032a9a/classes/c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a:calculateWeightedScores" with the following data:
      | passing_threshold | 60 |
    Then the response code should be 200
    And the response body should contain a "weight_warning" flag set to true
