Feature: Persistence Side Effects
  As a System Architect,
  I want to ensure that domain actions correctly trigger persistence side effects,
  So that data integrity is maintained across the hexagonal layers.

  # Semester persistence (SemesterRepositoryAdapter)
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

  # Class persistence (ClassRepositoryAdapter)
  Scenario Outline: Class persistence side effects
    Given the domain logic triggers a <action> for a Class
    When the "ClassRepository" is internally called
    Then the "ClassRepositoryAdapter" should <db_action> the record in the database
    And the record should have a valid UUID format for its primary key

    Examples:
      | action   | db_action |
      | Creation | persist   |
      | Update   | update    |
      | Deletion | remove    |

  # Student persistence (StudentRepositoryAdapter)
  Scenario Outline: Student persistence side effects
    Given the domain logic triggers a <action> for a Student
    When the "StudentRepository" is internally called
    Then the "StudentRepositoryAdapter" should <db_action> the record in the database
    And the record should have a valid UUID format for its primary key

    Examples:
      | action   | db_action |
      | Creation | persist   |
      | Update   | update    |
      | Deletion | remove    |

  # GradeItem persistence (GradeItemRepositoryAdapter)
  Scenario Outline: GradeItem persistence side effects
    Given the domain logic triggers a <action> for a GradeItem
    When the "GradeItemRepository" is internally called
    Then the "GradeItemRepositoryAdapter" should <db_action> the record in the database
    And the record should have a valid UUID format for its primary key

    Examples:
      | action   | db_action |
      | Creation | persist   |
      | Update   | update    |
      | Deletion | remove    |

  # GradeRecord persistence (GradeRecordRepositoryAdapter)
  Scenario Outline: GradeRecord persistence side effects
    Given the domain logic triggers a <action> for a GradeRecord
    When the "GradeRecordRepository" is internally called
    Then the "GradeRecordRepositoryAdapter" should <db_action> the record in the database
    And the record should have a valid UUID format for its primary key

    Examples:
      | action   | db_action |
      | Creation | persist   |
      | Update   | update    |
      | Deletion | remove    |

  # GradeRecord audit trail
  Scenario: GradeRecord update persists last_modified_at timestamp
    Given a GradeRecord exists in the database
    When the domain logic triggers an Update for the GradeRecord
    Then the "GradeRecordRepositoryAdapter" should update the record in the database
    And the persisted "last_modified_at" field should be set to the current UTC timestamp

  # Attachment persistence (AttachmentRepositoryAdapter)
  Scenario Outline: Attachment persistence side effects
    Given the domain logic triggers a <action> for an Attachment
    When the "AttachmentRepository" is internally called
    Then the "AttachmentRepositoryAdapter" should <db_action> the record in the database
    And the record should have a valid UUID format for its primary key

    Examples:
      | action   | db_action |
      | Creation | persist   |
      | Deletion | remove    |

  # Cascade deletion: Semester → Class → Student → GradeRecord → Attachment
  Scenario: Cascade deletion from Semester removes all dependent entities
    Given a Semester with ID "d3b07384-d113-404c-9f8a-020524032a9a" exists
    And it contains several Classes, Students, GradeItems, GradeRecords, and Attachments
    When the "SemesterRepository" deletes the Semester with ID "d3b07384-d113-404c-9f8a-020524032a9a"
    Then the "ClassRepositoryAdapter" should remove all Classes associated with Semester "d3b07384-d113-404c-9f8a-020524032a9a"
    And the "StudentRepositoryAdapter" should remove all Students associated with those Classes
    And the "GradeItemRepositoryAdapter" should remove all GradeItems associated with those Classes
    And the "GradeRecordRepositoryAdapter" should remove all GradeRecords associated with those Students and GradeItems
    And the "AttachmentRepositoryAdapter" should remove all Attachments associated with those GradeRecords

  # Cascade deletion: Class → Student → GradeRecord
  Scenario: Cascade deletion from Class removes all dependent entities
    Given a Class with ID "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a" exists
    And it contains several Students, GradeItems, and GradeRecords
    When the "ClassRepository" deletes the Class with ID "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    Then the "StudentRepositoryAdapter" should remove all Students associated with Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    And the "GradeItemRepositoryAdapter" should remove all GradeItems associated with Class "c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a"
    And the "GradeRecordRepositoryAdapter" should remove all GradeRecords associated with those Students and GradeItems

  # GradeRecord score validation — domain layer blocks persistence
  Scenario: GradeRecord score validation prevents invalid persistence for non-CLASSROOM_PERFORMANCE types
    Given a GradeItem of type "ASSIGNMENT" with max_score 100
    When the domain logic receives a score of -5 for this GradeItem
    Then the "GradeRecordRepository" should NOT be called
    And a domain validation exception should be thrown before reaching the persistence layer

  # GradeRecord attachment count guard
  Scenario: Attachment count limit is enforced before persistence
    Given a GradeRecord already has 5 Attachments
    When the domain logic attempts to add a 6th Attachment
    Then the "AttachmentRepository" should NOT be called
    And a domain validation exception should be thrown before reaching the persistence layer
