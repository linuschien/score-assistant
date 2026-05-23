*** Settings ***
Documentation       Feature: Class Management
...                 Source Feature : docs/02-design-specs/behavior-specs/user/class_management.feature
...                 Upstream Req   : US-02-class-management.md
...                 UI Manifests   : class-list.ui-manifest.json, class-form.ui-manifest.json

Library             RequestsLibrary
Library             Collections

Suite Setup         Initialize Class Suite
Suite Teardown      Cleanup Class Suite

*** Variables ***
${BASE_URL}             http://localhost:8080
${GRAPHQL_ENDPOINT}     /graphql
# Populated dynamically in Suite Setup — never hardcoded
${SEMESTER_ID}          ${EMPTY}
${CLASS_ID}             ${EMPTY}

*** Test Cases ***
# ---------------------------------------------------------------------------
# US-02-01: Create a new Class — valid cases
# Each creates a new class under the suite semester; cascade-cleaned by Suite Teardown
# ---------------------------------------------------------------------------
Create a new Class — 三年甲班 should return 201
    [Documentation]    US-02-01 — Reused from: class_management.feature
    ...                UI: class-name-field, submit-class-trigger (class-form.ui-manifest.json)
    Given a Semester with ID "${SEMESTER_ID}" exists
    When a POST request is made to classes endpoint with class_name "三年甲班"
    Then the response code should be 201
    And the response should contain a valid UUID for "id"

Create a new Class — 二年乙班 should return 201
    [Documentation]    US-02-01 — Reused from: class_management.feature
    Given a Semester with ID "${SEMESTER_ID}" exists
    When a POST request is made to classes endpoint with class_name "二年乙班"
    Then the response code should be 201
    And the response should contain a valid UUID for "id"

Create a new Class — empty name should return 400
    [Documentation]    US-02-01 — Reused from: class_management.feature
    Given a Semester with ID "${SEMESTER_ID}" exists
    When a POST request is made to classes endpoint with class_name ""
    Then the response code should be 400

# ---------------------------------------------------------------------------
# US-02-01 AC: Prevent duplicate Class names in the same Semester
# Leverages ${CLASS_ID}'s name "AutoTest-SuiteClass" as the existing duplicate
# ---------------------------------------------------------------------------
Prevent duplicate Class names in the same Semester
    [Documentation]    US-02-01 AC — Reused from: class_management.feature
    ...                Suite Setup pre-creates "AutoTest-SuiteClass"; this test attempts to create it again
    Given a Semester with ID "${SEMESTER_ID}" exists
    When a POST request is made to classes endpoint with class_name "AutoTest-SuiteClass"
    Then the response code should be 400

# ---------------------------------------------------------------------------
# US-02-02: List all Classes in a Semester via GraphQL
# ---------------------------------------------------------------------------
List all Classes in a Semester via GraphQL
    [Documentation]    US-02-02 — Reused from: class_management.feature
    ...                UI: class-table (class-list.ui-manifest.json)
    Given a Semester with ID "${SEMESTER_ID}" exists
    When a GraphQL query is made for all Classes in Semester "${SEMESTER_ID}"
    Then the response should contain a list of Classes

# ---------------------------------------------------------------------------
# US-02-02: Get a Class by ID
# ---------------------------------------------------------------------------
Get a Class by ID
    [Documentation]    US-02-02 — Reused from: class_management.feature
    When a GET request is made to class detail endpoint
    Then the response code should be 200
    And the response body should contain "id" equal to "${CLASS_ID}"

# ---------------------------------------------------------------------------
# US-02-03: Update Class information
# ---------------------------------------------------------------------------
Update Class information
    [Documentation]    US-02-03 — Reused from: class_management.feature
    ...                UI: edit-class-trigger → class-name-field, submit-class-trigger
    When a PUT request is made to class detail endpoint with class_name "AutoTest-SuiteClass-改"
    Then the response code should be 200

Update a non-existent Class returns 404
    [Documentation]    US-02-03 — Reused from: class_management.feature
    When a PUT request is made to "/semesters/${SEMESTER_ID}/classes/00000000-0000-0000-0000-000000000000" with class_name "不存在班級"
    Then the response code should be 404

# ---------------------------------------------------------------------------
# US-02-04: Delete a Class
# Uses a disposable class — does NOT touch ${CLASS_ID}
# ---------------------------------------------------------------------------
Delete a Class
    [Documentation]    US-02-04 — Reused from: class_management.feature
    ...                UI: delete-class-trigger → delete-class-confirm-dialog → confirm-delete-class-trigger
    Given a disposable Class is created in Semester "${SEMESTER_ID}"
    When a DELETE request is made to "/semesters/${SEMESTER_ID}/classes/${DISPOSABLE_CLASS_ID}"
    Then the response code should be 204
    And the Class with ID "${DISPOSABLE_CLASS_ID}" should no longer exist in Semester "${SEMESTER_ID}"

Delete a non-existent Class returns 404
    [Documentation]    US-02-04 — Reused from: class_management.feature
    When a DELETE request is made to "/semesters/${SEMESTER_ID}/classes/00000000-0000-0000-0000-000000000000"
    Then the response code should be 404

*** Keywords ***
# ---------------------------------------------------------------------------
# Suite Lifecycle
# ---------------------------------------------------------------------------
Initialize Class Suite
    Create Session    score_api    ${BASE_URL}    verify=True
    # Step 1: Create Semester → get runtime UUID
    ${s_payload}=    Create Dictionary
    ...    semesterName=AutoTest-ClassSuite-Semester
    ...    startDate=2024-09-01
    ...    endDate=2025-01-31
    ${s_resp}=    POST On Session    score_api    /semesters    json=${s_payload}
    Should Be Equal As Strings    ${s_resp.status_code}    201
    Set Suite Variable    ${SEMESTER_ID}    ${s_resp.json()}[id]
    # Step 2: Create Class → get runtime UUID (used by GET/PUT tests)
    ${c_payload}=    Create Dictionary    className=AutoTest-SuiteClass
    ${c_resp}=    POST On Session    score_api    /semesters/${SEMESTER_ID}/classes    json=${c_payload}
    Should Be Equal As Strings    ${c_resp.status_code}    201
    Set Suite Variable    ${CLASS_ID}    ${c_resp.json()}[id]

Cleanup Class Suite
    # Deleting Semester cascades to all Classes underneath
    DELETE On Session    score_api    /semesters/${SEMESTER_ID}    expected_status=any
    Delete All Sessions

# ---------------------------------------------------------------------------
# Given Steps
# ---------------------------------------------------------------------------
a Semester with ID "${semester_id}" exists
    ${resp}=    GET On Session    score_api    /semesters/${semester_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a disposable Class is created in Semester "${semester_id}"
    ${payload}=    Create Dictionary    className=AutoTest-Disposable-Class
    ${resp}=    POST On Session    score_api    /semesters/${semester_id}/classes    json=${payload}
    Should Be Equal As Strings    ${resp.status_code}    201
    Set Test Variable    ${DISPOSABLE_CLASS_ID}    ${resp.json()}[id]

# ---------------------------------------------------------------------------
# When Steps
# ---------------------------------------------------------------------------
a POST request is made to classes endpoint with class_name "${class_name}"
    [Documentation]    POST /semesters/{id}/classes
    ...    UI: class-name-field, submit-class-trigger (class-form.ui-manifest.json)
    ${payload}=    Create Dictionary    className=${class_name}
    ${resp}=    POST On Session    score_api    /semesters/${SEMESTER_ID}/classes    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GraphQL query is made for all Classes in Semester "${semester_id}"
    [Documentation]    POST /graphql
    ...    UI: class-table (class-list.ui-manifest.json)
    ${query}=    Set Variable
    ...    { listClasses(filter: { semesterId: "${semester_id}" }) { id className semesterId } }
    ${payload}=    Create Dictionary    query=${query}
    ${resp}=    POST On Session    score_api    ${GRAPHQL_ENDPOINT}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GET request is made to class detail endpoint
    [Documentation]    GET /semesters/{id}/classes/{classId}
    ${resp}=    GET On Session    score_api    /semesters/${SEMESTER_ID}/classes/${CLASS_ID}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a PUT request is made to class detail endpoint with class_name "${class_name}"
    [Documentation]    PUT /semesters/{id}/classes/{classId}
    ...    UI: edit-class-trigger → class-name-field, submit-class-trigger
    ${payload}=    Create Dictionary    className=${class_name}
    ${resp}=    PUT On Session    score_api    /semesters/${SEMESTER_ID}/classes/${CLASS_ID}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a PUT request is made to "/semesters/${semester_id}/classes/${class_id}" with class_name "${class_name}"
    ${payload}=    Create Dictionary    className=${class_name}
    ${resp}=    PUT On Session    score_api    /semesters/${semester_id}/classes/${class_id}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a DELETE request is made to "/semesters/${semester_id}/classes/${class_id}"
    [Documentation]    DELETE /semesters/{id}/classes/{classId}
    ...    UI: delete-class-trigger → delete-class-confirm-dialog → confirm-delete-class-trigger
    ${resp}=    DELETE On Session    score_api    /semesters/${semester_id}/classes/${class_id}    expected_status=any
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

the response should contain a list of Classes
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    data
    Dictionary Should Contain Key    ${body}[data]    listClasses
    Should Not Be Empty    ${body}[data][listClasses]

the Class with ID "${class_id}" should no longer exist in Semester "${semester_id}"
    ${resp}=    GET On Session    score_api    /semesters/${semester_id}/classes/${class_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    404
