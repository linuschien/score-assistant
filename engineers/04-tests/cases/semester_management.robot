*** Settings ***
Documentation       Feature: Semester Management
...                 As a Teacher, I want to manage semesters (create, update, delete, view),
...                 So that I can organize classes and grades by academic periods.
...
...                 Source Feature : docs/02-design-specs/behavior-specs/user/semester_management.feature
...                 Upstream Req   : US-01-semester-management.md
...                 UI Manifests   : semester-list.ui-manifest.json, semester-form.ui-manifest.json

Library             RequestsLibrary
Library             Collections

Suite Setup         Create Session    score_api    ${BASE_URL}    verify=True
Suite Teardown      Delete All Sessions

*** Variables ***
${BASE_URL}             http://localhost:8080
${SEMESTER_ID}          d3b07384-d113-404c-9f8a-020524032a9a
${NONEXIST_ID}          00000000-0000-0000-0000-000000000000
${GRAPHQL_ENDPOINT}     /graphql

*** Test Cases ***
# ---------------------------------------------------------------------------
# US-01-01: Create a new Semester — Scenario Outline (valid cases)
# ---------------------------------------------------------------------------
Create a new Semester — 113學年度第一學期 should return 201
    [Documentation]    US-01-01 — Reused from: semester_management.feature
    Given the "score-assistant" service is initialized
    When a POST request is made to "/semesters" with semester name "113學年度第一學期" start "2024-09-01" end "2025-01-31"
    Then the response code should be 201
    And the response should contain a valid UUID for "semester_id"

Create a new Semester — 113學年度第二學期 should return 201
    [Documentation]    US-01-01 — Reused from: semester_management.feature
    Given the "score-assistant" service is initialized
    When a POST request is made to "/semesters" with semester name "113學年度第二學期" start "2025-02-01" end "2025-06-30"
    Then the response code should be 201
    And the response should contain a valid UUID for "semester_id"

Create a new Semester — empty name should return 400
    [Documentation]    US-01-01 — Reused from: semester_management.feature
    Given the "score-assistant" service is initialized
    When a POST request is made to "/semesters" with semester name "" start "2024-09-01" end "2025-01-31"
    Then the response code should be 400

# ---------------------------------------------------------------------------
# US-01-01 AC4: Prevent duplicate Semester names
# ---------------------------------------------------------------------------
Prevent duplicate Semester names
    [Documentation]    US-01-01 AC4 — Reused from: semester_management.feature
    Given a Semester with name "113學年度第一學期" already exists via API
    When a POST request is made to "/semesters" with semester name "113學年度第一學期" start "2024-09-01" end "2025-01-31"
    Then the response code should be 400
    And the error message should indicate that the name is already taken

# ---------------------------------------------------------------------------
# US-01-02: List all Semesters via GraphQL
# ---------------------------------------------------------------------------
List all Semesters via GraphQL
    [Documentation]    US-01-02 — Reused from: semester_management.feature
    Given the "score-assistant" service is initialized
    When a GraphQL query is made for all Semesters with fields semester_id semester_name start_date end_date
    Then the response should contain a list of Semesters
    And the list should be ordered by start_date descending

# ---------------------------------------------------------------------------
# US-01-02: Get a Semester by ID
# ---------------------------------------------------------------------------
Get a Semester by ID
    [Documentation]    US-01-02 — Reused from: semester_management.feature
    Given a Semester with ID "${SEMESTER_ID}" exists via API
    When a GET request is made to "/semesters/${SEMESTER_ID}"
    Then the response code should be 200
    And the response body should contain "semester_id" equal to "${SEMESTER_ID}"

# ---------------------------------------------------------------------------
# US-01-03: Update Semester information — valid
# ---------------------------------------------------------------------------
Update Semester information — valid name should return 200
    [Documentation]    US-01-03 — Reused from: semester_management.feature
    Given a Semester with ID "${SEMESTER_ID}" exists via API
    When a PUT request is made to "/semesters/${SEMESTER_ID}" with name "113學年度第一學期-修正" start "2024-09-01" end "2025-01-20"
    Then the response code should be 200

Update Semester information — empty name should return 400
    [Documentation]    US-01-03 — Reused from: semester_management.feature
    Given a Semester with ID "${SEMESTER_ID}" exists via API
    When a PUT request is made to "/semesters/${SEMESTER_ID}" with name "" start "2024-09-01" end "2025-01-20"
    Then the response code should be 400

Update a non-existent Semester returns 404
    [Documentation]    US-01-03 — Reused from: semester_management.feature
    When a PUT request is made to "/semesters/${NONEXIST_ID}" with name "不存在學期" start "2024-09-01" end "2025-01-31"
    Then the response code should be 404

# ---------------------------------------------------------------------------
# US-01-04: Delete a Semester
# ---------------------------------------------------------------------------
Delete a Semester
    [Documentation]    US-01-04 — Reused from: semester_management.feature
    Given a Semester with ID "${SEMESTER_ID}" exists via API
    When a DELETE request is made to "/semesters/${SEMESTER_ID}"
    Then the response code should be 204
    And the Semester with ID "${SEMESTER_ID}" should no longer exist

Delete a non-existent Semester returns 404
    [Documentation]    US-01-04 — Reused from: semester_management.feature
    When a DELETE request is made to "/semesters/${NONEXIST_ID}"
    Then the response code should be 404

*** Keywords ***
# ---------------------------------------------------------------------------
# Background
# ---------------------------------------------------------------------------
the "score-assistant" service is initialized
    [Documentation]    Verify the API service is reachable (health check).
    ${resp}=    GET On Session    score_api    /actuator/health
    Should Be Equal As Strings    ${resp.status_code}    200

# ---------------------------------------------------------------------------
# Given Steps
# ---------------------------------------------------------------------------
a Semester with name "${name}" already exists via API
    [Documentation]    Pre-condition: create semester if it doesn't already exist.
    ${payload}=    Create Dictionary
    ...    semester_name=${name}
    ...    start_date=2024-09-01
    ...    end_date=2025-01-31
    POST On Session    score_api    /semesters    json=${payload}    expected_status=any

a Semester with ID "${semester_id}" exists via API
    [Documentation]    Pre-condition: assert the semester exists via GET.
    ${resp}=    GET On Session    score_api    /semesters/${semester_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

# ---------------------------------------------------------------------------
# When Steps — POST /semesters
# ---------------------------------------------------------------------------
a POST request is made to "/semesters" with semester name "${name}" start "${start}" end "${end}"
    [Documentation]    POST /semesters with the provided body fields.
    ${payload}=    Create Dictionary
    ...    semester_name=${name}
    ...    start_date=${start}
    ...    end_date=${end}
    ${resp}=    POST On Session    score_api    /semesters    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

# ---------------------------------------------------------------------------
# When Steps — GraphQL query
# ---------------------------------------------------------------------------
a GraphQL query is made for all Semesters with fields semester_id semester_name start_date end_date
    [Documentation]    POST /graphql — query all semesters sorted by start_date DESC.
    ${query}=    Set Variable
    ...    { semesters(orderBy: START_DATE_DESC) { semester_id semester_name start_date end_date } }
    ${payload}=    Create Dictionary    query=${query}
    ${resp}=    POST On Session    score_api    ${GRAPHQL_ENDPOINT}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

# ---------------------------------------------------------------------------
# When Steps — GET /semesters/{id}
# ---------------------------------------------------------------------------
a GET request is made to "/semesters/${semester_id}"
    [Documentation]    GET /semesters/{semester_id}
    ${resp}=    GET On Session    score_api    /semesters/${semester_id}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

# ---------------------------------------------------------------------------
# When Steps — PUT /semesters/{id}
# ---------------------------------------------------------------------------
a PUT request is made to "/semesters/${semester_id}" with name "${name}" start "${start}" end "${end}"
    [Documentation]    PUT /semesters/{semester_id} with full replacement payload.
    ${payload}=    Create Dictionary
    ...    semester_name=${name}
    ...    start_date=${start}
    ...    end_date=${end}
    ${resp}=    PUT On Session    score_api    /semesters/${semester_id}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

# ---------------------------------------------------------------------------
# When Steps — DELETE /semesters/{id}
# ---------------------------------------------------------------------------
a DELETE request is made to "/semesters/${semester_id}"
    [Documentation]    DELETE /semesters/{semester_id}
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
    [Documentation]    Verify the list is in descending order by start_date.
    ${items}=    Set Variable    ${RESPONSE.json()}[data][semesters]
    ${length}=    Get Length    ${items}
    FOR    ${i}    IN RANGE    0    ${length} - 1
        Should Be True    '${items}[${i}][start_date]' >= '${items}[${i+1}][start_date]'
    END

the error message should indicate that the name is already taken
    ${body}=    Set Variable    ${RESPONSE.json()}
    ${body_str}=    Convert To String    ${body}
    Should Contain Any    ${body_str}    duplicate    already exists    taken    conflict

the Semester with ID "${semester_id}" should no longer exist
    ${resp}=    GET On Session    score_api    /semesters/${semester_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    404
