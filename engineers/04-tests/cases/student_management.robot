*** Settings ***
Documentation       Feature: Student Management
...                 Source Feature : docs/02-design-specs/behavior-specs/user/student_management.feature
...                 Upstream Req   : US-03-student-management.md
...                 UI Manifests   : student-list.ui-manifest.json, student-form.ui-manifest.json

Library             RequestsLibrary
Library             Collections

Suite Setup         Create Session    score_api    ${BASE_URL}    verify=True
Suite Teardown      Delete All Sessions

*** Variables ***
${BASE_URL}             http://localhost:8080
${SEMESTER_ID}          d3b07384-d113-404c-9f8a-020524032a9a
${CLASS_ID}             c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a
${STUDENT_ID}           a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d
${NONEXIST_ID}          00000000-0000-0000-0000-000000000000
${GRAPHQL_ENDPOINT}     /graphql
${STUDENTS_BASE}        /semesters/${SEMESTER_ID}/classes/${CLASS_ID}/students

*** Test Cases ***
Add a Student — 王小明 seat 1 should return 201
    [Documentation]    US-03-02 — Reused from: student_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to students endpoint with number "1" and name "王小明"
    Then the response code should be 201
    And the response should contain a valid UUID for "student_id"

Add a Student — 李小華 seat 2 should return 201
    [Documentation]    US-03-02 — Reused from: student_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to students endpoint with number "2" and name "李小華"
    Then the response code should be 201
    And the response should contain a valid UUID for "student_id"

Add a Student — seat 0 should return 400
    [Documentation]    US-03-02 — Reused from: student_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to students endpoint with number "0" and name "錯誤"
    Then the response code should be 400

Prevent duplicate student_number in the same Class
    [Documentation]    US-03-02 AC3 — Reused from: student_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    And a Student with student_number 1 already exists in Class "${CLASS_ID}"
    When a POST request is made to students endpoint with number "1" and name "重複"
    Then the response code should be 400

List all Students in a Class via GraphQL
    [Documentation]    US-03-03 — Reused from: student_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a GraphQL query is made for all Students in Class "${CLASS_ID}"
    Then the response should contain a list of Students ordered by student_number ascending

Get a Student by ID
    [Documentation]    US-03-03 — Reused from: student_management.feature
    Given a Student with ID "${STUDENT_ID}" exists in Class "${CLASS_ID}"
    When a GET request is made to student detail endpoint
    Then the response code should be 200
    And the response body should contain "student_id" equal to "${STUDENT_ID}"

Update Student information
    [Documentation]    US-03-04 — Reused from: student_management.feature
    Given a Student with ID "${STUDENT_ID}" exists in Class "${CLASS_ID}"
    When a PUT request is made to student detail endpoint with number "10" and name "王大明"
    Then the response code should be 200

Update a non-existent Student returns 404
    [Documentation]    US-03-04 — Reused from: student_management.feature
    When a PUT request is made to nonexistent student endpoint with number "99" and name "不存在"
    Then the response code should be 404

Delete a Student
    [Documentation]    US-03-05 — Reused from: student_management.feature
    Given a Student with ID "${STUDENT_ID}" exists in Class "${CLASS_ID}"
    When a DELETE request is made to student detail endpoint
    Then the response code should be 204
    And the Student with ID "${STUDENT_ID}" should no longer exist

Delete a non-existent Student returns 404
    [Documentation]    US-03-05 — Reused from: student_management.feature
    When a DELETE request is made to nonexistent student endpoint
    Then the response code should be 404

Import Students from CSV (happy path)
    [Documentation]    US-03-01 — Reused from: student_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to import students endpoint with CSV content and no conflict
    Then the response code should be 200
    And the response body should contain "success_count" equal to "3"
    And the response body should contain "failure_count" equal to "0"

Import Students from CSV with conflicts — SKIP strategy
    [Documentation]    US-03-01 AC4 — Reused from: student_management.feature
    Given a Student with student_number 1 already exists in Class "${CLASS_ID}"
    When a POST request is made to import students endpoint with conflict_resolution "SKIP"
    Then the response code should be 200
    And the response body should contain "failure_count" equal to "1"
    And the response body should contain "success_count" equal to "0"

Import Students from CSV with conflicts — OVERWRITE strategy
    [Documentation]    US-03-01 AC4 — Reused from: student_management.feature
    Given a Student with student_number 1 already exists in Class "${CLASS_ID}"
    When a POST request is made to import students endpoint with conflict_resolution "OVERWRITE"
    Then the response code should be 200
    And the response body should contain "failure_count" equal to "0"
    And the response body should contain "success_count" equal to "1"

*** Keywords ***
a Class with ID "${class_id}" exists in Semester "${semester_id}"
    ${resp}=    GET On Session    score_api    /semesters/${semester_id}/classes/${class_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a Student with ID "${student_id}" exists in Class "${class_id}"
    ${resp}=    GET On Session    score_api    ${STUDENTS_BASE}/${student_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a Student with student_number ${number} already exists in Class "${class_id}"
    [Documentation]    Pre-condition: seed a student with the given seat number.
    ...    UI locator: add-student-button → student-number-field, student-name-field (student-form)
    ${payload}=    Create Dictionary    student_number=${number}    student_name=測試學生
    POST On Session    score_api    ${STUDENTS_BASE}    json=${payload}    expected_status=any

a POST request is made to students endpoint with number "${number}" and name "${name}"
    [Documentation]    POST /semesters/{id}/classes/{id}/students
    ...    UI locator: add-student-button → student-number-field, student-name-field, submit-student-trigger
    ${payload}=    Create Dictionary    student_number=${number}    student_name=${name}
    ${resp}=    POST On Session    score_api    ${STUDENTS_BASE}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GraphQL query is made for all Students in Class "${class_id}"
    [Documentation]    POST /graphql — query students ordered by student_number ASC
    ...    UI locator: student-table (student-list.ui-manifest.json)
    ${query}=    Set Variable
    ...    { studentsByClass(classId: "${class_id}", orderBy: STUDENT_NUMBER_ASC) { student_id student_number student_name } }
    ${payload}=    Create Dictionary    query=${query}
    ${resp}=    POST On Session    score_api    /graphql    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GET request is made to student detail endpoint
    ${resp}=    GET On Session    score_api    ${STUDENTS_BASE}/${STUDENT_ID}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a PUT request is made to student detail endpoint with number "${number}" and name "${name}"
    [Documentation]    PUT /semesters/{id}/classes/{id}/students/{id}
    ...    UI locator: edit-student-trigger → student-number-field, student-name-field, submit-student-trigger
    ${payload}=    Create Dictionary    student_number=${number}    student_name=${name}
    ${resp}=    PUT On Session    score_api    ${STUDENTS_BASE}/${STUDENT_ID}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a PUT request is made to nonexistent student endpoint with number "${number}" and name "${name}"
    ${payload}=    Create Dictionary    student_number=${number}    student_name=${name}
    ${resp}=    PUT On Session    score_api    ${STUDENTS_BASE}/${NONEXIST_ID}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a DELETE request is made to student detail endpoint
    [Documentation]    DELETE /semesters/{id}/classes/{id}/students/{id}
    ...    UI locator: delete-student-trigger → delete-student-confirm-dialog → confirm-delete-student-trigger
    ${resp}=    DELETE On Session    score_api    ${STUDENTS_BASE}/${STUDENT_ID}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a DELETE request is made to nonexistent student endpoint
    ${resp}=    DELETE On Session    score_api    ${STUDENTS_BASE}/${NONEXIST_ID}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to import students endpoint with CSV content and no conflict
    [Documentation]    POST /semesters/{id}/classes/{id}/students:importStudents
    ...    UI locator: import-students-button (student-list.ui-manifest.json)
    ${csv_content}=    Set Variable    number,name\n1,王小明\n2,李小華\n3,張大強
    ${files}=    Create Dictionary    file=${csv_content.encode()}
    ${resp}=    POST On Session    score_api    ${STUDENTS_BASE}:importStudents    files=${files}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to import students endpoint with conflict_resolution "${strategy}"
    [Documentation]    POST /semesters/{id}/classes/{id}/students:importStudents?conflict_resolution={strategy}
    ${csv_content}=    Set Variable    number,name\n1,趙六
    ${files}=    Create Dictionary    file=${csv_content.encode()}
    ${params}=    Create Dictionary    conflict_resolution=${strategy}
    ${resp}=    POST On Session    score_api    ${STUDENTS_BASE}:importStudents    files=${files}    params=${params}    expected_status=any
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

the response should contain a list of Students ordered by student_number ascending
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    data
    Dictionary Should Contain Key    ${body}[data]    studentsByClass
    ${items}=    Set Variable    ${body}[data][studentsByClass]
    Should Not Be Empty    ${items}
    ${length}=    Get Length    ${items}
    FOR    ${i}    IN RANGE    0    ${length} - 1
        Should Be True    ${items}[${i}][student_number] <= ${items}[${i+1}][student_number]
    END

the Student with ID "${student_id}" should no longer exist
    ${resp}=    GET On Session    score_api    ${STUDENTS_BASE}/${student_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    404
