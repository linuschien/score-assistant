*** Settings ***
Documentation       Feature: Grade Item Management
...                 Source Feature : docs/02-design-specs/behavior-specs/user/grade_item_management.feature
...                 Upstream Req   : US-04-grade-item-management.md
...                 UI Manifests   : grade-item-list.ui-manifest.json, grade-item-form.ui-manifest.json

Library             RequestsLibrary
Library             Collections

Suite Setup         Create Session    score_api    ${BASE_URL}    verify=True
Suite Teardown      Delete All Sessions

*** Variables ***
${BASE_URL}             http://localhost:8080
${SEMESTER_ID}          d3b07384-d113-404c-9f8a-020524032a9a
${CLASS_ID}             c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a
${GRADE_ITEM_ID}        f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c
${NONEXIST_ID}          00000000-0000-0000-0000-000000000000
${GRAPHQL_ENDPOINT}     /graphql
${ITEMS_BASE}           /semesters/${SEMESTER_ID}/classes/${CLASS_ID}/grade-items

*** Test Cases ***
Create a new GradeItem — ASSIGNMENT 100pts weight 10 should return 201
    [Documentation]    US-04-01 — Reused from: grade_item_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to grade-items endpoint with name "第1次作業" type "ASSIGNMENT" max "100" weight "10"
    Then the response code should be 201
    And the response should contain a valid UUID for "grade_item_id"

Create a new GradeItem — REPORT 100pts weight 20 should return 201
    [Documentation]    US-04-01 — Reused from: grade_item_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to grade-items endpoint with name "期中報告" type "REPORT" max "100" weight "20"
    Then the response code should be 201
    And the response should contain a valid UUID for "grade_item_id"

Create a new GradeItem — ATTENDANCE 1pt weight 5 should return 201
    [Documentation]    US-04-01 — Reused from: grade_item_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to grade-items endpoint with name "10/20出席" type "ATTENDANCE" max "1" weight "5"
    Then the response code should be 201
    And the response should contain a valid UUID for "grade_item_id"

Create a new GradeItem — CLASSROOM_PERFORMANCE 10pts weight 5 should return 201
    [Documentation]    US-04-01 — Reused from: grade_item_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to grade-items endpoint with name "課堂發言" type "CLASSROOM_PERFORMANCE" max "10" weight "5"
    Then the response code should be 201
    And the response should contain a valid UUID for "grade_item_id"

Create a new GradeItem — OTHER 50pts weight 0 should return 201
    [Documentation]    US-04-01 — Reused from: grade_item_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to grade-items endpoint with name "其他加分" type "OTHER" max "50" weight "0"
    Then the response code should be 201
    And the response should contain a valid UUID for "grade_item_id"

Create a new GradeItem — negative max_score should return 400
    [Documentation]    US-04-01 — Reused from: grade_item_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to grade-items endpoint with name "負分測試" type "ASSIGNMENT" max "-10" weight "0"
    Then the response code should be 400

Create a new GradeItem — empty name should return 400
    [Documentation]    US-04-01 — Reused from: grade_item_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to grade-items endpoint with name "" type "ASSIGNMENT" max "100" weight "0"
    Then the response code should be 400

Prevent duplicate GradeItem names in the same Class
    [Documentation]    US-04-01 AC — Reused from: grade_item_management.feature
    Given a GradeItem with name "第1次作業" already exists in Class "${CLASS_ID}"
    When a POST request is made to grade-items endpoint with name "第1次作業" type "ASSIGNMENT" max "100" weight "0"
    Then the response code should be 400

List all GradeItems in a Class via GraphQL
    [Documentation]    US-04-02 — Reused from: grade_item_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a GraphQL query is made for all GradeItems in Class "${CLASS_ID}"
    Then the response should contain a list of GradeItems

Get a GradeItem by ID
    [Documentation]    US-04-02 — Reused from: grade_item_management.feature
    Given a GradeItem with ID "${GRADE_ITEM_ID}" exists in Class "${CLASS_ID}"
    When a GET request is made to grade-item detail endpoint
    Then the response code should be 200
    And the response body should contain "grade_item_id" equal to "${GRADE_ITEM_ID}"

Update GradeItem information
    [Documentation]    US-04-03 — Reused from: grade_item_management.feature
    Given a GradeItem with ID "${GRADE_ITEM_ID}" exists in Class "${CLASS_ID}"
    When a PUT request is made to grade-item detail endpoint with full payload
    Then the response code should be 200

Update a non-existent GradeItem returns 404
    [Documentation]    US-04-03 — Reused from: grade_item_management.feature
    When a PUT request is made to nonexistent grade-item endpoint
    Then the response code should be 404

Delete a GradeItem
    [Documentation]    US-04-04 — Reused from: grade_item_management.feature
    Given a GradeItem with ID "${GRADE_ITEM_ID}" exists in Class "${CLASS_ID}"
    When a DELETE request is made to grade-item detail endpoint
    Then the response code should be 204

Delete a non-existent GradeItem returns 404
    [Documentation]    US-04-04 — Reused from: grade_item_management.feature
    When a DELETE request is made to nonexistent grade-item endpoint
    Then the response code should be 404

*** Keywords ***
a Class with ID "${class_id}" exists in Semester "${semester_id}"
    ${resp}=    GET On Session    score_api    /semesters/${semester_id}/classes/${class_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a GradeItem with name "${item_name}" already exists in Class "${class_id}"
    [Documentation]    Pre-condition: seed a grade item.
    ...    UI locator: create-grade-item-button → item-name-field, submit-grade-item-trigger (grade-item-form)
    ${payload}=    Create Dictionary    item_name=${item_name}    item_type=ASSIGNMENT    max_score=100    weight=10
    POST On Session    score_api    ${ITEMS_BASE}    json=${payload}    expected_status=any

a GradeItem with ID "${item_id}" exists in Class "${class_id}"
    ${resp}=    GET On Session    score_api    ${ITEMS_BASE}/${item_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a POST request is made to grade-items endpoint with name "${name}" type "${type}" max "${max}" weight "${weight}"
    [Documentation]    POST /semesters/{id}/classes/{id}/grade-items
    ...    UI locator: create-grade-item-button → item-name-field, item-type-selection,
    ...                max-score-field, weight-field, submit-grade-item-trigger (grade-item-form)
    ${payload}=    Create Dictionary    item_name=${name}    item_type=${type}    max_score=${max}    weight=${weight}
    ${resp}=    POST On Session    score_api    ${ITEMS_BASE}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GraphQL query is made for all GradeItems in Class "${class_id}"
    [Documentation]    POST /graphql — list grade items
    ...    UI locator: grade-item-table (grade-item-list.ui-manifest.json)
    ${query}=    Set Variable
    ...    { gradeItemsByClass(classId: "${class_id}") { grade_item_id item_name item_type item_date item_description max_score weight } }
    ${payload}=    Create Dictionary    query=${query}
    ${resp}=    POST On Session    score_api    ${GRAPHQL_ENDPOINT}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GET request is made to grade-item detail endpoint
    ${resp}=    GET On Session    score_api    ${ITEMS_BASE}/${GRADE_ITEM_ID}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a PUT request is made to grade-item detail endpoint with full payload
    [Documentation]    PUT /semesters/{id}/classes/{id}/grade-items/{id}
    ...    UI locator: edit-grade-item-trigger → item-name-field, item-type-selection,
    ...                item-description-field, max-score-field, weight-field, submit-grade-item-trigger
    ${payload}=    Create Dictionary
    ...    item_name=第1次作業-修正
    ...    item_type=ASSIGNMENT
    ...    item_description=修正後的作業說明
    ...    max_score=100
    ...    weight=15
    ${resp}=    PUT On Session    score_api    ${ITEMS_BASE}/${GRADE_ITEM_ID}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a PUT request is made to nonexistent grade-item endpoint
    ${payload}=    Create Dictionary    item_name=不存在項目    item_type=OTHER    max_score=100
    ${resp}=    PUT On Session    score_api    ${ITEMS_BASE}/${NONEXIST_ID}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a DELETE request is made to grade-item detail endpoint
    [Documentation]    DELETE /semesters/{id}/classes/{id}/grade-items/{id}
    ...    UI locator: delete-grade-item-trigger → delete-grade-item-confirm-dialog → confirm-delete-grade-item-trigger
    ${resp}=    DELETE On Session    score_api    ${ITEMS_BASE}/${GRADE_ITEM_ID}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a DELETE request is made to nonexistent grade-item endpoint
    ${resp}=    DELETE On Session    score_api    ${ITEMS_BASE}/${NONEXIST_ID}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

the response code should be ${expected_code}
    Should Be Equal As Strings    ${RESPONSE.status_code}    ${expected_code}

the response should contain a valid UUID for "${field}"
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    ${field}
    Should Match Regexp    ${body}[${field}]    [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}

the response body should contain "${field}" equal to "${value}"
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    ${field}
    Should Be Equal As Strings    ${body}[${field}]    ${value}

the response should contain a list of GradeItems
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    data
    Dictionary Should Contain Key    ${body}[data]    gradeItemsByClass
    Should Not Be Empty    ${body}[data][gradeItemsByClass]
