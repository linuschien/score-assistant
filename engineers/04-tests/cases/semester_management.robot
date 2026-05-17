*** Settings ***
Documentation       Feature: Semester Management
...                 Source Feature : docs/02-design-specs/behavior-specs/user/semester_management.feature
...                 Upstream Req   : US-01-semester-management.md
...                 UI Manifests   : semester-list.ui-manifest.json, semester-form.ui-manifest.json

Library             RequestsLibrary
Library             Collections

Suite Setup         Initialize Semester Suite
Suite Teardown      Cleanup Semester Suite

*** Variables ***
${BASE_URL}             http://localhost:8080
${GRAPHQL_ENDPOINT}     /graphql
# Populated dynamically in Suite Setup — never hardcoded
${SEMESTER_ID}          ${EMPTY}

*** Test Cases ***
# ---------------------------------------------------------------------------
# US-01-01: Create a new Semester — valid cases
# Each creates a new semester and self-cleans via [Teardown]
# ---------------------------------------------------------------------------
Create a new Semester — 113學年度第一學期 should return 201
    [Documentation]    US-01-01 — Reused from: semester_management.feature
    ...                UI: semester-name-field, start-date-field, end-date-field, submit-semester-trigger
    [Teardown]    Delete Last Created Semester
    Given the "score-assistant" service is initialized
    When a POST request is made to "/semesters" with name "113學年度第一學期-TC1" start "2024-09-01" end "2025-01-31"
    Then the response code should be 201
    And the response should contain a valid UUID for "semester_id"

Create a new Semester — 113學年度第二學期 should return 201
    [Documentation]    US-01-01 — Reused from: semester_management.feature
    [Teardown]    Delete Last Created Semester
    Given the "score-assistant" service is initialized
    When a POST request is made to "/semesters" with name "113學年度第二學期-TC2" start "2025-02-01" end "2025-06-30"
    Then the response code should be 201
    And the response should contain a valid UUID for "semester_id"

Create a new Semester — empty name should return 400
    [Documentation]    US-01-01 — Reused from: semester_management.feature
    Given the "score-assistant" service is initialized
    When a POST request is made to "/semesters" with name "" start "2024-09-01" end "2025-01-31"
    Then the response code should be 400

# ---------------------------------------------------------------------------
# US-01-01 AC4: Prevent duplicate Semester names
# ---------------------------------------------------------------------------
Prevent duplicate Semester names
    [Documentation]    US-01-01 AC4 — Reused from: semester_management.feature
    ...                Uses ${SEMESTER_ID} created in Suite Setup as the existing duplicate target
    When a POST request is made to "/semesters" with name "AutoTest-SuiteSemester" start "2024-09-01" end "2025-01-31"
    Then the response code should be 400
    And the error message should indicate that the name is already taken

# ---------------------------------------------------------------------------
# US-01-02: List all Semesters via GraphQL
# ---------------------------------------------------------------------------
List all Semesters via GraphQL
    [Documentation]    US-01-02 — Reused from: semester_management.feature
    ...                UI: semester-table (semester-list.ui-manifest.json)
    Given the "score-assistant" service is initialized
    When a GraphQL query is made for all Semesters
    Then the response should contain a list of Semesters
    And the list should be ordered by start_date descending

# ---------------------------------------------------------------------------
# US-01-02: Get a Semester by ID
# ---------------------------------------------------------------------------
Get a Semester by ID
    [Documentation]    US-01-02 — Reused from: semester_management.feature
    When a GET request is made to "/semesters/${SEMESTER_ID}"
    Then the response code should be 200
    And the response body should contain "semester_id" equal to "${SEMESTER_ID}"

# ---------------------------------------------------------------------------
# US-01-03: Update Semester information
# ---------------------------------------------------------------------------
Update Semester information — valid name should return 200
    [Documentation]    US-01-03 — Reused from: semester_management.feature
    ...                UI: edit-semester-trigger → semester-name-field, submit-semester-trigger
    When a PUT request is made to "/semesters/${SEMESTER_ID}" with name "AutoTest-SuiteSemester-修正" start "2024-09-01" end "2025-01-20"
    Then the response code should be 200

Update Semester information — empty name should return 400
    [Documentation]    US-01-03 — Reused from: semester_management.feature
    When a PUT request is made to "/semesters/${SEMESTER_ID}" with name "" start "2024-09-01" end "2025-01-20"
    Then the response code should be 400

Update a non-existent Semester returns 404
    [Documentation]    US-01-03 — Reused from: semester_management.feature
    When a PUT request is made to "/semesters/00000000-0000-0000-0000-000000000000" with name "不存在學期" start "2024-09-01" end "2025-01-31"
    Then the response code should be 404

# ---------------------------------------------------------------------------
# US-01-04: Delete a Semester
# Uses a dedicated disposable semester — does NOT touch ${SEMESTER_ID}
# ---------------------------------------------------------------------------
Delete a Semester
    [Documentation]    US-01-04 — Reused from: semester_management.feature
    ...                UI: delete-semester-trigger → delete-semester-confirm-dialog → confirm-delete-semester-trigger
    Given a disposable Semester is created and its ID stored as "${DISPOSABLE_SEMESTER_ID}"
    When a DELETE request is made to "/semesters/${DISPOSABLE_SEMESTER_ID}"
    Then the response code should be 204
    And the Semester with ID "${DISPOSABLE_SEMESTER_ID}" should no longer exist

Delete a non-existent Semester returns 404
    [Documentation]    US-01-04 — Reused from: semester_management.feature
    When a DELETE request is made to "/semesters/00000000-0000-0000-0000-000000000000"
    Then the response code should be 404

*** Keywords ***
# ---------------------------------------------------------------------------
# Suite Lifecycle
# ---------------------------------------------------------------------------
Initialize Semester Suite
    Create Session    score_api    ${BASE_URL}    verify=True
    ${payload}=    Create Dictionary
    ...    semester_name=AutoTest-SuiteSemester
    ...    start_date=2024-09-01
    ...    end_date=2025-01-31
    ${resp}=    POST On Session    score_api    /semesters    json=${payload}
    Should Be Equal As Strings    ${resp.status_code}    201
    Set Suite Variable    ${SEMESTER_ID}    ${resp.json()}[semester_id]

Cleanup Semester Suite
    DELETE On Session    score_api    /semesters/${SEMESTER_ID}    expected_status=any
    Delete All Sessions

# ---------------------------------------------------------------------------
# Background / Given Steps
# ---------------------------------------------------------------------------
the "score-assistant" service is initialized
    ${resp}=    GET On Session    score_api    /actuator/health    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a disposable Semester is created and its ID stored as "${var_name}"
    ${payload}=    Create Dictionary
    ...    semester_name=AutoTest-Disposable-${var_name}
    ...    start_date=2099-01-01
    ...    end_date=2099-06-30
    ${resp}=    POST On Session    score_api    /semesters    json=${payload}
    Should Be Equal As Strings    ${resp.status_code}    201
    Set Test Variable    ${DISPOSABLE_SEMESTER_ID}    ${resp.json()}[semester_id]

# ---------------------------------------------------------------------------
# When Steps
# ---------------------------------------------------------------------------
a POST request is made to "/semesters" with name "${name}" start "${start}" end "${end}"
    [Documentation]    POST /semesters
    ...    UI: semester-name-field, start-date-field, end-date-field, submit-semester-trigger
    ${payload}=    Create Dictionary    semester_name=${name}    start_date=${start}    end_date=${end}
    ${resp}=    POST On Session    score_api    /semesters    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GraphQL query is made for all Semesters
    [Documentation]    POST /graphql — list semesters ordered by start_date DESC
    ...    UI: semester-table (semester-list.ui-manifest.json)
    ${query}=    Set Variable
    ...    { semesters(orderBy: START_DATE_DESC) { semester_id semester_name start_date end_date } }
    ${payload}=    Create Dictionary    query=${query}
    ${resp}=    POST On Session    score_api    ${GRAPHQL_ENDPOINT}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GET request is made to "/semesters/${semester_id}"
    ${resp}=    GET On Session    score_api    /semesters/${semester_id}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a PUT request is made to "/semesters/${semester_id}" with name "${name}" start "${start}" end "${end}"
    [Documentation]    PUT /semesters/{id}
    ...    UI: edit-semester-trigger → semester-name-field, submit-semester-trigger
    ${payload}=    Create Dictionary    semester_name=${name}    start_date=${start}    end_date=${end}
    ${resp}=    PUT On Session    score_api    /semesters/${semester_id}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a DELETE request is made to "/semesters/${semester_id}"
    [Documentation]    DELETE /semesters/{id}
    ...    UI: delete-semester-trigger → delete-semester-confirm-dialog → confirm-delete-semester-trigger
    ${resp}=    DELETE On Session    score_api    /semesters/${semester_id}    expected_status=any
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

the response should contain a list of Semesters
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    data
    Dictionary Should Contain Key    ${body}[data]    semesters
    Should Not Be Empty    ${body}[data][semesters]

the list should be ordered by start_date descending
    ${items}=    Set Variable    ${RESPONSE.json()}[data][semesters]
    ${length}=    Get Length    ${items}
    FOR    ${i}    IN RANGE    0    ${length} - 1
        Should Be True    '${items}[${i}][start_date]' >= '${items}[${i+1}][start_date]'
    END

the error message should indicate that the name is already taken
    ${body_str}=    Convert To String    ${RESPONSE.json()}
    Should Contain Any    ${body_str}    duplicate    already exists    taken    conflict

the Semester with ID "${semester_id}" should no longer exist
    ${resp}=    GET On Session    score_api    /semesters/${semester_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    404

# ---------------------------------------------------------------------------
# Teardown Helpers
# ---------------------------------------------------------------------------
Delete Last Created Semester
    [Documentation]    Cleans up a semester created within a test case (for CREATE 201 tests).
    ${created_id}=    Run Keyword If    '${RESPONSE.status_code}' == '201'
    ...    Set Variable    ${RESPONSE.json()}[semester_id]
    Run Keyword If    '${created_id}' != '${None}'
    ...    DELETE On Session    score_api    /semesters/${created_id}    expected_status=any
