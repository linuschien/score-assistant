Feature: Persistence Side Effects
  As a System Architect,
  I want to ensure that domain actions correctly trigger persistence side effects,
  So that data integrity is maintained across the hexagonal layers.

  Scenario Outline: Semester persistence side effects
    Given the domain logic triggers a <action> for a Semester
    When the "SemesterRepository" is internally called
    Then the "SemesterRepositoryAdapter" should <db_action> the record in the database
    And the record should have a valid UUID format for its primary key

    Examples:
      | action   | db_action |
      | Creation | persist   |
      | Update   | update    |
      | Deletion | remove    |

  Scenario: Class cascade deletion
    Given a Semester with ID "d3b07384-d113-404c-9f8a-020524032a9a" exists
    And it contains several Classes and Students
    When the "SemesterRepository" deletes the Semester with ID "d3b07384-d113-404c-9f8a-020524032a9a"
    Then the "ClassRepositoryAdapter" should remove all Classes associated with that Semester ID
    And the "StudentRepositoryAdapter" should remove all Students associated with those Classes

  Scenario: Grade Record score validation side effects
    Given a Grade Item of type "ASSIGNMENT"
    When the domain logic receives a score of -5
    Then the "GradeRecordRepository" should NOT be called
    And a validation exception should be thrown before reaching the persistence layer
