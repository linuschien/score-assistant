*** Settings ***
Documentation       Feature: Grade Item Management
...                 Source Feature : docs/02-design-specs/behavior-specs/user/grade_item_management.feature
...                 Upstream Req   : US-04-grade-item-management.md
...                 UI Manifests   : grade-item-list.ui-manifest.json, grade-item-form.ui-manifest.json

Library             RequestsLibrary
Library             Collections

Suite Setup         Initialize Grade Item Suite
Suite Teardown      Cleanup Grade Item Suite

*** Variables ***
${BASE_URL}             http://localhost:8080
${GRAPHQL_ENDPOINT}     /graphql
# Populated dynamically in Suite Setup — never hardcoded
${SEMESTER_ID}          ${EMPTY}
${CLASS_ID}             ${EMPTY}
${GRADE_ITEM_ID}        ${EMPTY}
${ITEMS_BASE}           ${EMPTY}

*** Test Cases ***
# ---------------------------------------------------------------------------
# US-04-01: Create a new GradeItem — valid cases
# Created items sit under the suite class; cascade-cleaned by Suite Teardown
# ---------------------------------------------------------------------------
Create a new GradeItem — ASSIGNMENT 100pts weight 10 should return 201
    [Documentation]    US-04-01 — Reused from: grade_item_management.feature
    ...                UI: create-grade-item-button → item-name-field, item-type-selection,
    ...                    max-score-field, weight-field, submit-grade-item-trigger
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

# ---------------------------------------------------------------------------
# US-04-01 AC: Prevent duplicate GradeItem names in the same Class
# Leverages ${GRADE_ITEM_ID}'s name "AutoTest-SuiteItem" created in Suite Setup
# ---------------------------------------------------------------------------
Prevent duplicate GradeItem names in the same Class
    [Documentation]    US-04-01 AC — Reused from: grade_item_management.feature
    ...                Suite Setup pre-creates "AutoTest-SuiteItem"; this test attempts to create it again
    When a POST request is made to grade-items endpoint with name "AutoTest-SuiteItem" type "ASSIGNMENT" max "100" weight "0"
    Then the response code should be 400

# ---------------------------------------------------------------------------
# US-04-02: List all GradeItems via GraphQL
# ---------------------------------------------------------------------------
List all GradeItems in a Class via GraphQL
    [Documentation]    US-04-02 — Reused from: grade_item_management.feature
    ...                UI: grade-item-table (grade-item-list.ui-manifest.json)
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a GraphQL query is made for all GradeItems in Class "${CLASS_ID}"
    Then the response should contain a list of GradeItems

# ---------------------------------------------------------------------------
# US-04-02: Get a GradeItem by ID
# ---------------------------------------------------------------------------
Get a GradeItem by ID
    [Documentation]    US-04-02 — Reused from: grade_item_management.feature
    When a GET request is made to grade-item detail endpoint
    Then the response code should be 200
    And the response body should contain "grade_item_id" equal to "${GRADE_ITEM_ID}"

# ---------------------------------------------------------------------------
# US-04-03: Update GradeItem information
# ---------------------------------------------------------------------------
Update GradeItem information
    [Documentation]    US-04-03 — Reused from: grade_item_management.feature
    ...                UI: edit-grade-item-trigger → item-name-field, item-type-selection,
    ...                    item-description-field, max-score-field, weight-field, submit-grade-item-trigger
    When a PUT request is made to grade-item detail endpoint with full payload
    Then the response code should be 200

Update a non-existent GradeItem returns 404
    [Documentation]    US-04-03 — Reused from: grade_item_management.feature
    When a PUT request is made to "${ITEMS_BASE}/00000000-0000-0000-0000-000000000000" with name "不存在項目" type "OTHER" max "100"
    Then the response code should be 404

# ---------------------------------------------------------------------------
# US-04-04: Delete a GradeItem
# Uses a disposable item — does NOT touch ${GRADE_ITEM_ID}
# ---------------------------------------------------------------------------
Delete a GradeItem
    [Documentation]    US-04-04 — Reused from: grade_item_management.feature
    ...                UI: delete-grade-item-trigger → delete-grade-item-confirm-dialog → confirm-delete-grade-item-trigger
    Given a disposable GradeItem is created in Class "${CLASS_ID}"
    When a DELETE request is made to "${ITEMS_BASE}/${DISPOSABLE_ITEM_ID}"
    Then the response code should be 204

Delete a non-existent GradeItem returns 404
    [Documentation]    US-04-04 — Reused from: grade_item_management.feature
    When a DELETE request is made to "${ITEMS_BASE}/00000000-0000-0000-0000-000000000000"
    Then the response code should be 404

*** Keywords ***
# ---------------------------------------------------------------------------
# Suite Lifecycle
# ---------------------------------------------------------------------------
Initialize Grade Item Suite
    Create Session    score_api    ${BASE_URL}    verify=True
    # Step 1: Create Semester
    ${s_payload}=    Create Dictionary
    ...    semester_name=AutoTest-GradeItemSuite-Semester
    ...    start_date=2024-09-01
    ...    end_date=2025-01-31
    ${s_resp}=    POST On Session    score_api    /semesters    json=${s_payload}
    Should Be Equal As Strings    ${s_resp.status_code}    201
    Set Suite Variable    ${SEMESTER_ID}    ${s_resp.json()}[semester_id]
    # Step 2: Create Class
    ${c_payload}=    Create Dictionary    class_name=AutoTest-GradeItemSuite-Class
    ${c_resp}=    POST On Session    score_api    /semesters/${SEMESTER_ID}/classes    json=${c_payload}
    Should Be Equal As Strings    ${c_resp.status_code}    201
    Set Suite Variable    ${CLASS_ID}    ${c_resp.json()}[class_id]
    Set Suite Variable    ${ITEMS_BASE}    /semesters/${SEMESTER_ID}/classes/${CLASS_ID}/grade-items
    # Step 3: Create GradeItem — used by GET/PUT and duplicate tests
    ${i_payload}=    Create Dictionary
    ...    item_name=AutoTest-SuiteItem
    ...    item_type=ASSIGNMENT
    ...    max_score=100
    ...    weight=20
    ${i_resp}=    POST On Session    score_api    ${ITEMS_BASE}    json=${i_payload}
    Should Be Equal As Strings    ${i_resp.status_code}    201
    Set Suite Variable    ${GRADE_ITEM_ID}    ${i_resp.json()}[grade_item_id]

Cleanup Grade Item Suite
    # Deleting Semester cascades to Class → GradeItems → GradeRecords
    DELETE On Session    score_api    /semesters/${SEMESTER_ID}    expected_status=any
    Delete All Sessions

# ---------------------------------------------------------------------------
# Given Steps
# ---------------------------------------------------------------------------
a Class with ID "${class_id}" exists in Semester "${semester_id}"
    ${resp}=    GET On Session    score_api    /semesters/${semester_id}/classes/${class_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a disposable GradeItem is created in Class "${class_id}"
    ${payload}=    Create Dictionary
    ...    item_name=AutoTest-Disposable-Item
    ...    item_type=OTHER
    ...    max_score=10
    ...    weight=0
    ${resp}=    POST On Session    score_api    ${ITEMS_BASE}    json=${payload}
    Should Be Equal As Strings    ${resp.status_code}    201
    Set Test Variable    ${DISPOSABLE_ITEM_ID}    ${resp.json()}[grade_item_id]

# ---------------------------------------------------------------------------
# When Steps
# ---------------------------------------------------------------------------
a POST request is made to grade-items endpoint with name "${name}" type "${type}" max "${max}" weight "${weight}"
    [Documentation]    POST /semesters/{id}/classes/{id}/grade-items
    ...    UI: create-grade-item-button → item-name-field, item-type-selection,
    ...        max-score-field, weight-field, submit-grade-item-trigger
    ${payload}=    Create Dictionary    item_name=${name}    item_type=${type}    max_score=${max}    weight=${weight}
    ${resp}=    POST On Session    score_api    ${ITEMS_BASE}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GraphQL query is made for all GradeItems in Class "${class_id}"
    [Documentation]    POST /graphql
    ...    UI: grade-item-table (grade-item-list.ui-manifest.json)
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
    ...    UI: edit-grade-item-trigger → item-name-field, item-description-field,
    ...        max-score-field, weight-field, submit-grade-item-trigger
    ${payload}=    Create Dictionary
    ...    item_name=AutoTest-SuiteItem-修正
    ...    item_type=ASSIGNMENT
    ...    item_description=修正後的作業說明
    ...    max_score=100
    ...    weight=15
    ${resp}=    PUT On Session    score_api    ${ITEMS_BASE}/${GRADE_ITEM_ID}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a PUT request is made to "${url}" with name "${name}" type "${type}" max "${max}"
    ${payload}=    Create Dictionary    item_name=${name}    item_type=${type}    max_score=${max}
    ${resp}=    PUT On Session    score_api    ${url}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a DELETE request is made to "${url}"
    [Documentation]    DELETE the given URL
    ...    UI: delete-grade-item-trigger → delete-grade-item-confirm-dialog → confirm-delete-grade-item-trigger
    ${resp}=    DELETE On Session    score_api    ${url}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

# ---------------------------------------------------------------------------
# Then Steps
# ---------------------------------------------------------------------------
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
