*** Settings ***
Documentation       Feature: Class Management
...                 Source Feature : docs/02-design-specs/behavior-specs/user/class_management.feature
...                 Upstream Req   : US-02-class-management.md
...                 UI Manifests   : class-list.ui-manifest.json, class-form.ui-manifest.json

Library             RequestsLibrary
Library             Collections

Suite Setup         Create Session    score_api    ${BASE_URL}    verify=True
Suite Teardown      Delete All Sessions

*** Variables ***
${BASE_URL}             http://localhost:8080
${SEMESTER_ID}          d3b07384-d113-404c-9f8a-020524032a9a
${CLASS_ID}             c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a
${NONEXIST_ID}          00000000-0000-0000-0000-000000000000
${GRAPHQL_ENDPOINT}     /graphql

*** Test Cases ***
Create a new Class — 三年甲班 should return 201
    [Documentation]    US-02-01 — Reused from: class_management.feature
    Given a Semester with ID "${SEMESTER_ID}" exists
    When a POST request is made to classes endpoint with class_name "三年甲班"
    Then the response code should be 201
    And the response should contain a valid UUID for "class_id"

Create a new Class — 二年乙班 should return 201
    [Documentation]    US-02-01 — Reused from: class_management.feature
    Given a Semester with ID "${SEMESTER_ID}" exists
    When a POST request is made to classes endpoint with class_name "二年乙班"
    Then the response code should be 201
    And the response should contain a valid UUID for "class_id"

Create a new Class — empty name should return 400
    [Documentation]    US-02-01 — Reused from: class_management.feature
    Given a Semester with ID "${SEMESTER_ID}" exists
    When a POST request is made to classes endpoint with class_name ""
    Then the response code should be 400

Prevent duplicate Class names in the same Semester
    [Documentation]    US-02-01 AC — Reused from: class_management.feature
    Given a Semester with ID "${SEMESTER_ID}" exists
    And a Class with name "三年甲班" already exists in Semester "${SEMESTER_ID}"
    When a POST request is made to classes endpoint with class_name "三年甲班"
    Then the response code should be 400

List all Classes in a Semester via GraphQL
    [Documentation]    US-02-02 — Reused from: class_management.feature
    Given a Semester with ID "${SEMESTER_ID}" exists
    When a GraphQL query is made for all Classes in Semester "${SEMESTER_ID}"
    Then the response should contain a list of Classes

Get a Class by ID
    [Documentation]    US-02-02 — Reused from: class_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a GET request is made to class detail endpoint
    Then the response code should be 200
    And the response body should contain "class_id" equal to "${CLASS_ID}"

Update Class information
    [Documentation]    US-02-03 — Reused from: class_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a PUT request is made to class detail endpoint with class_name "三年甲班-改"
    Then the response code should be 200

Update a non-existent Class returns 404
    [Documentation]    US-02-03 — Reused from: class_management.feature
    When a PUT request is made to nonexistent class endpoint with class_name "不存在班級"
    Then the response code should be 404

Delete a Class
    [Documentation]    US-02-04 — Reused from: class_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a DELETE request is made to class detail endpoint
    Then the response code should be 204
    And the Class with ID "${CLASS_ID}" should no longer exist

Delete a non-existent Class returns 404
    [Documentation]    US-02-04 — Reused from: class_management.feature
    When a DELETE request is made to nonexistent class endpoint
    Then the response code should be 404

*** Keywords ***
a Semester with ID "${semester_id}" exists
    ${resp}=    GET On Session    score_api    /semesters/${semester_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a Class with name "${class_name}" already exists in Semester "${semester_id}"
    ${payload}=    Create Dictionary    class_name=${class_name}
    POST On Session    score_api    /semesters/${semester_id}/classes    json=${payload}    expected_status=any

a Class with ID "${class_id}" exists in Semester "${semester_id}"
    ${resp}=    GET On Session    score_api    /semesters/${semester_id}/classes/${class_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a POST request is made to classes endpoint with class_name "${class_name}"
    [Documentation]    POST /semesters/{id}/classes
    ...    UI locator: class-name-field, submit-class-trigger (class-form.ui-manifest.json)
    ${payload}=    Create Dictionary    class_name=${class_name}
    ${resp}=    POST On Session    score_api    /semesters/${SEMESTER_ID}/classes    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GraphQL query is made for all Classes in Semester "${semester_id}"
    ${query}=    Set Variable    { classesBySemester(semesterId: "${semester_id}") { class_id class_name } }
    ${payload}=    Create Dictionary    query=${query}
    ${resp}=    POST On Session    score_api    ${GRAPHQL_ENDPOINT}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GET request is made to class detail endpoint
    [Documentation]    GET /semesters/{id}/classes/{classId}
    ...    UI locator: class-table (class-list.ui-manifest.json)
    ${resp}=    GET On Session    score_api    /semesters/${SEMESTER_ID}/classes/${CLASS_ID}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a PUT request is made to class detail endpoint with class_name "${class_name}"
    [Documentation]    PUT /semesters/{id}/classes/{classId}
    ...    UI locator: edit-class-trigger → class-name-field, submit-class-trigger (class-form)
    ${payload}=    Create Dictionary    class_name=${class_name}
    ${resp}=    PUT On Session    score_api    /semesters/${SEMESTER_ID}/classes/${CLASS_ID}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a PUT request is made to nonexistent class endpoint with class_name "${class_name}"
    ${payload}=    Create Dictionary    class_name=${class_name}
    ${resp}=    PUT On Session    score_api    /semesters/${SEMESTER_ID}/classes/${NONEXIST_ID}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a DELETE request is made to class detail endpoint
    [Documentation]    DELETE /semesters/{id}/classes/{classId}
    ...    UI locator: delete-class-trigger → delete-class-confirm-dialog → confirm-delete-class-trigger
    ${resp}=    DELETE On Session    score_api    /semesters/${SEMESTER_ID}/classes/${CLASS_ID}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a DELETE request is made to nonexistent class endpoint
    ${resp}=    DELETE On Session    score_api    /semesters/${SEMESTER_ID}/classes/${NONEXIST_ID}    expected_status=any
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

the response should contain a list of Classes
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    data
    Dictionary Should Contain Key    ${body}[data]    classesBySemester
    Should Not Be Empty    ${body}[data][classesBySemester]

the Class with ID "${class_id}" should no longer exist
    ${resp}=    GET On Session    score_api    /semesters/${SEMESTER_ID}/classes/${class_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    404
