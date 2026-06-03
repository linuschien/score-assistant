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
    When a POST request is made to classes endpoint with class_name "三年甲班" and class_group "理工班群"
    Then the response code should be 201
    And the response should contain a valid UUID for "id"

Create a new Class — 二年乙班 should return 201
    [Documentation]    US-02-01 — Reused from: class_management.feature
    Given a Semester with ID "${SEMESTER_ID}" exists
    When a POST request is made to classes endpoint with class_name "二年乙班" and class_group ""
    Then the response code should be 201
    And the response should contain a valid UUID for "id"

Create a new Class — empty name should return 400
    [Documentation]    US-02-01 — Reused from: class_management.feature
    Given a Semester with ID "${SEMESTER_ID}" exists
    When a POST request is made to classes endpoint with class_name "" and class_group "社會科學班群"
    Then the response code should be 400

# ---------------------------------------------------------------------------
# US-02-01 AC: Prevent duplicate Class names in the same Semester
# Leverages ${CLASS_ID}'s name "AutoTest-SuiteClass" as the existing duplicate
# ---------------------------------------------------------------------------
Prevent duplicate Class names in the same Semester
    [Documentation]    US-02-01 AC — Reused from: class_management.feature
    ...                Suite Setup pre-creates "AutoTest-SuiteClass"; this test attempts to create it again
    Given a Semester with ID "${SEMESTER_ID}" exists
    When a POST request is made to classes endpoint with class_name "AutoTest-SuiteClass" and class_group ""
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
# US-02-02 AC3: 依班群篩選班級 (filter by class_group via GraphQL)
# ---------------------------------------------------------------------------
List and filter Classes in a Semester by class_group via GraphQL
    [Documentation]    US-02-02 AC3 — Reused from: class_management.feature
    ...                UI: class-table (class-list.ui-manifest.json)
    Given a Semester with ID "${SEMESTER_ID}" exists
    When a GraphQL query is made for all Classes in Semester "${SEMESTER_ID}" with class_group filter "理工班群"
    Then the response should contain only Classes belonging to "理工班群"

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
    When a PUT request is made to class detail endpoint with class_name "AutoTest-SuiteClass-改" and class_group "社會科學班群"
    Then the response code should be 200

Update a non-existent Class returns 404
    [Documentation]    US-02-03 — Reused from: class_management.feature
    When a PUT request is made to "/api/v1/semesters/${SEMESTER_ID}/classes/00000000-0000-0000-0000-000000000000" with class_name "不存在班級" and class_group ""
    Then the response code should be 404

# ---------------------------------------------------------------------------
# US-02-04: Delete a Class
# Uses a disposable class — does NOT touch ${CLASS_ID}
# ---------------------------------------------------------------------------
Delete a Class
    [Documentation]    US-02-04 — Reused from: class_management.feature
    ...                UI: delete-class-trigger → delete-class-confirm-dialog → confirm-delete-class-trigger
    Given a disposable Class is created in Semester "${SEMESTER_ID}"
    When a DELETE request is made to "/api/v1/semesters/${SEMESTER_ID}/classes/${DISPOSABLE_CLASS_ID}"
    Then the response code should be 204
    And the Class with ID "${DISPOSABLE_CLASS_ID}" should no longer exist in Semester "${SEMESTER_ID}"

Delete a non-existent Class returns 404
    [Documentation]    US-02-04 — Reused from: class_management.feature
    When a DELETE request is made to "/api/v1/semesters/${SEMESTER_ID}/classes/00000000-0000-0000-0000-000000000000"
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
    ${s_resp}=    POST On Session    score_api    /api/v1/semesters    json=${s_payload}
    Should Be Equal As Strings    ${s_resp.status_code}    201
    Set Suite Variable    ${SEMESTER_ID}    ${s_resp.json()}[id]
    # Step 2: Create Class → get runtime UUID (used by GET/PUT tests)
    ${c_payload}=    Create Dictionary    className=AutoTest-SuiteClass    classGroup=AutoTest-SuiteClass-Group
    ${c_resp}=    POST On Session    score_api    /api/v1/semesters/${SEMESTER_ID}/classes    json=${c_payload}
    Should Be Equal As Strings    ${c_resp.status_code}    201
    Set Suite Variable    ${CLASS_ID}    ${c_resp.json()}[id]

Cleanup Class Suite
    # Deleting Semester cascades to all Classes underneath
    DELETE On Session    score_api    /api/v1/semesters/${SEMESTER_ID}    expected_status=any
    Delete All Sessions

# ---------------------------------------------------------------------------
# Given Steps
# ---------------------------------------------------------------------------
a Semester with ID "${semester_id}" exists
    ${resp}=    GET On Session    score_api    /api/v1/semesters/${semester_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a disposable Class is created in Semester "${semester_id}"
    ${payload}=    Create Dictionary    className=AutoTest-Disposable-Class    classGroup=AutoTest-Disposable-Group
    ${resp}=    POST On Session    score_api    /api/v1/semesters/${semester_id}/classes    json=${payload}
    Should Be Equal As Strings    ${resp.status_code}    201
    Set Test Variable    ${DISPOSABLE_CLASS_ID}    ${resp.json()}[id]

# ---------------------------------------------------------------------------
# When Steps
# ---------------------------------------------------------------------------
a POST request is made to classes endpoint with class_name "${class_name}" and class_group "${class_group}"
    [Documentation]    POST /api/v1/semesters/{id}/classes
    ...    UI: class-name-field, submit-class-trigger (class-form.ui-manifest.json)
    ${payload}=    Create Dictionary
    Set To Dictionary    ${payload}    className=${class_name}
    Run Keyword If    '${class_group}' != '${EMPTY}'    Set To Dictionary    ${payload}    classGroup=${class_group}
    ${resp}=    POST On Session    score_api    /api/v1/semesters/${SEMESTER_ID}/classes    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GraphQL query is made for all Classes in Semester "${semester_id}"
    [Documentation]    POST /graphql
    ...    UI: class-table (class-list.ui-manifest.json)
    ${query}=    Set Variable
    ...    { listClasses(filter: { semesterId: "${semester_id}" }) { id className classGroup semesterId } }
    ${payload}=    Create Dictionary    query=${query}
    ${resp}=    POST On Session    score_api    ${GRAPHQL_ENDPOINT}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GraphQL query is made for all Classes in Semester "${semester_id}" with class_group filter "${class_group}"
    [Documentation]    POST /graphql with classGroup filter
    ...    UI: class-table (class-list.ui-manifest.json)
    ${query}=    Set Variable
    ...    { listClasses(filter: { semesterId: "${semester_id}", classGroup: "${class_group}" }) { id className classGroup semesterId } }
    ${payload}=    Create Dictionary    query=${query}
    ${resp}=    POST On Session    score_api    ${GRAPHQL_ENDPOINT}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GET request is made to class detail endpoint
    ${resp}=    GET On Session    score_api    /api/v1/semesters/${SEMESTER_ID}/classes/${CLASS_ID}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a PUT request is made to class detail endpoint with class_name "${class_name}" and class_group "${class_group}"
    [Documentation]    PUT /api/v1/semesters/{id}/classes/{classId}
    ...    UI: edit-class-trigger → class-name-field, submit-class-trigger
    ${payload}=    Create Dictionary
    Set To Dictionary    ${payload}    className=${class_name}
    Run Keyword If    '${class_group}' != '${EMPTY}'    Set To Dictionary    ${payload}    classGroup=${class_group}
    ${resp}=    PUT On Session    score_api    /api/v1/semesters/${SEMESTER_ID}/classes/${CLASS_ID}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a PUT request is made to "/api/v1/semesters/${semester_id}/classes/${class_id}" with class_name "${class_name}" and class_group "${class_group}"
    ${payload}=    Create Dictionary
    Set To Dictionary    ${payload}    className=${class_name}
    Run Keyword If    '${class_group}' != '${EMPTY}'    Set To Dictionary    ${payload}    classGroup=${class_group}
    ${resp}=    PUT On Session    score_api    /api/v1/semesters/${semester_id}/classes/${class_id}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a DELETE request is made to "/api/v1/semesters/${semester_id}/classes/${class_id}"
    [Documentation]    DELETE /api/v1/semesters/{id}/classes/{classId}
    ...    UI: delete-class-trigger → delete-class-confirm-dialog → confirm-delete-class-trigger
    ${resp}=    DELETE On Session    score_api    /api/v1/semesters/${semester_id}/classes/${class_id}    expected_status=any
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

the response should contain only Classes belonging to "${class_group}"
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    data
    Dictionary Should Contain Key    ${body}[data]    listClasses
    ${classes}=    Set Variable    ${body}[data][listClasses]
    FOR    ${c}    IN    @{classes}
        Should Be Equal As Strings    ${c}[classGroup]    ${class_group}
    END

the Class with ID "${class_id}" should no longer exist in Semester "${semester_id}"
    ${resp}=    GET On Session    score_api    /api/v1/semesters/${semester_id}/classes/${class_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    404
