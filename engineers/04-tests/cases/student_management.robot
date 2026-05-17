*** Settings ***
Documentation       Feature: Student Management
...                 Source Feature : docs/02-design-specs/behavior-specs/user/student_management.feature
...                 Upstream Req   : US-03-student-management.md
...                 UI Manifests   : student-list.ui-manifest.json, student-form.ui-manifest.json

Library             RequestsLibrary
Library             Collections

Suite Setup         Initialize Student Suite
Suite Teardown      Cleanup Student Suite

*** Variables ***
${BASE_URL}             http://localhost:8080
${GRAPHQL_ENDPOINT}     /graphql
# Populated dynamically in Suite Setup — never hardcoded
${SEMESTER_ID}          ${EMPTY}
${CLASS_ID}             ${EMPTY}
${STUDENT_ID}           ${EMPTY}
${STUDENTS_BASE}        ${EMPTY}

*** Test Cases ***
# ---------------------------------------------------------------------------
# US-03-02: Add a Student — valid cases
# Created students sit under the suite class; cascade-cleaned by Suite Teardown
# ---------------------------------------------------------------------------
Add a Student — 王小明 seat 1 should return 201
    [Documentation]    US-03-02 — Reused from: student_management.feature
    ...                UI: add-student-button → student-number-field, student-name-field, submit-student-trigger
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

# ---------------------------------------------------------------------------
# US-03-02 AC3: Prevent duplicate student_number in the same Class
# Leverages ${STUDENT_ID} (seat 99) created in Suite Setup as the existing duplicate
# ---------------------------------------------------------------------------
Prevent duplicate student_number in the same Class
    [Documentation]    US-03-02 AC3 — Reused from: student_management.feature
    ...                Suite Setup pre-creates student with number 99; this test attempts to duplicate it
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to students endpoint with number "99" and name "重複"
    Then the response code should be 400

# ---------------------------------------------------------------------------
# US-03-03: List all Students via GraphQL
# ---------------------------------------------------------------------------
List all Students in a Class via GraphQL
    [Documentation]    US-03-03 — Reused from: student_management.feature
    ...                UI: student-table (student-list.ui-manifest.json)
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a GraphQL query is made for all Students in Class "${CLASS_ID}"
    Then the response should contain a list of Students ordered by student_number ascending

# ---------------------------------------------------------------------------
# US-03-03: Get a Student by ID
# ---------------------------------------------------------------------------
Get a Student by ID
    [Documentation]    US-03-03 — Reused from: student_management.feature
    When a GET request is made to student detail endpoint
    Then the response code should be 200
    And the response body should contain "student_id" equal to "${STUDENT_ID}"

# ---------------------------------------------------------------------------
# US-03-04: Update Student information
# ---------------------------------------------------------------------------
Update Student information
    [Documentation]    US-03-04 — Reused from: student_management.feature
    ...                UI: edit-student-trigger → student-number-field, student-name-field, submit-student-trigger
    When a PUT request is made to student detail endpoint with number "99" and name "王大明"
    Then the response code should be 200

Update a non-existent Student returns 404
    [Documentation]    US-03-04 — Reused from: student_management.feature
    When a PUT request is made to "${STUDENTS_BASE}/00000000-0000-0000-0000-000000000000" with number "88" and name "不存在"
    Then the response code should be 404

# ---------------------------------------------------------------------------
# US-03-05: Delete a Student
# Uses a disposable student — does NOT touch ${STUDENT_ID}
# ---------------------------------------------------------------------------
Delete a Student
    [Documentation]    US-03-05 — Reused from: student_management.feature
    ...                UI: delete-student-trigger → delete-student-confirm-dialog → confirm-delete-student-trigger
    Given a disposable Student is created in Class "${CLASS_ID}"
    When a DELETE request is made to "${STUDENTS_BASE}/${DISPOSABLE_STUDENT_ID}"
    Then the response code should be 204
    And the Student with ID "${DISPOSABLE_STUDENT_ID}" should no longer exist

Delete a non-existent Student returns 404
    [Documentation]    US-03-05 — Reused from: student_management.feature
    When a DELETE request is made to "${STUDENTS_BASE}/00000000-0000-0000-0000-000000000000"
    Then the response code should be 404

# ---------------------------------------------------------------------------
# US-03-01: Import Students from CSV (happy path)
# ---------------------------------------------------------------------------
Import Students from CSV (happy path)
    [Documentation]    US-03-01 — Reused from: student_management.feature
    ...                UI: import-students-button (student-list.ui-manifest.json)
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to import students endpoint with CSV content and no conflicts
    Then the response code should be 200
    And the response body should contain "success_count" equal to "3"
    And the response body should contain "failure_count" equal to "0"

# ---------------------------------------------------------------------------
# US-03-01 AC4: Import with conflicts
# Leverages ${STUDENT_ID} (seat 99) as the conflicting pre-existing seat number
# ---------------------------------------------------------------------------
Import Students from CSV with conflicts — SKIP strategy
    [Documentation]    US-03-01 AC4 — Reused from: student_management.feature
    ...                Seat 99 already exists via ${STUDENT_ID} from Suite Setup
    When a POST request is made to import students endpoint with conflict_resolution "SKIP"
    Then the response code should be 200
    And the response body should contain "failure_count" equal to "1"
    And the response body should contain "success_count" equal to "0"

Import Students from CSV with conflicts — OVERWRITE strategy
    [Documentation]    US-03-01 AC4 — Reused from: student_management.feature
    When a POST request is made to import students endpoint with conflict_resolution "OVERWRITE"
    Then the response code should be 200
    And the response body should contain "failure_count" equal to "0"
    And the response body should contain "success_count" equal to "1"

*** Keywords ***
# ---------------------------------------------------------------------------
# Suite Lifecycle
# ---------------------------------------------------------------------------
Initialize Student Suite
    Create Session    score_api    ${BASE_URL}    verify=True
    # Step 1: Create Semester
    ${s_payload}=    Create Dictionary
    ...    semester_name=AutoTest-StudentSuite-Semester
    ...    start_date=2024-09-01
    ...    end_date=2025-01-31
    ${s_resp}=    POST On Session    score_api    /semesters    json=${s_payload}
    Should Be Equal As Strings    ${s_resp.status_code}    201
    Set Suite Variable    ${SEMESTER_ID}    ${s_resp.json()}[semester_id]
    # Step 2: Create Class
    ${c_payload}=    Create Dictionary    class_name=AutoTest-StudentSuite-Class
    ${c_resp}=    POST On Session    score_api    /semesters/${SEMESTER_ID}/classes    json=${c_payload}
    Should Be Equal As Strings    ${c_resp.status_code}    201
    Set Suite Variable    ${CLASS_ID}    ${c_resp.json()}[class_id]
    Set Suite Variable    ${STUDENTS_BASE}    /semesters/${SEMESTER_ID}/classes/${CLASS_ID}/students
    # Step 3: Create Student (seat 99) — used by GET/PUT and duplicate/import conflict tests
    ${st_payload}=    Create Dictionary    student_number=99    student_name=AutoTest-SuiteStudent
    ${st_resp}=    POST On Session    score_api    ${STUDENTS_BASE}    json=${st_payload}
    Should Be Equal As Strings    ${st_resp.status_code}    201
    Set Suite Variable    ${STUDENT_ID}    ${st_resp.json()}[student_id]

Cleanup Student Suite
    # Deleting Semester cascades to Class → Students
    DELETE On Session    score_api    /semesters/${SEMESTER_ID}    expected_status=any
    Delete All Sessions

# ---------------------------------------------------------------------------
# Given Steps
# ---------------------------------------------------------------------------
a Class with ID "${class_id}" exists in Semester "${semester_id}"
    ${resp}=    GET On Session    score_api    /semesters/${semester_id}/classes/${class_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a disposable Student is created in Class "${class_id}"
    [Documentation]    Creates a temporary student for DELETE test — uses seat 50 (not conflicting with suite seat 99).
    ${payload}=    Create Dictionary    student_number=50    student_name=AutoTest-Disposable-Student
    ${resp}=    POST On Session    score_api    ${STUDENTS_BASE}    json=${payload}
    Should Be Equal As Strings    ${resp.status_code}    201
    Set Test Variable    ${DISPOSABLE_STUDENT_ID}    ${resp.json()}[student_id]

# ---------------------------------------------------------------------------
# When Steps
# ---------------------------------------------------------------------------
a POST request is made to students endpoint with number "${number}" and name "${name}"
    [Documentation]    POST /semesters/{id}/classes/{id}/students
    ...    UI: add-student-button → student-number-field, student-name-field, submit-student-trigger
    ${payload}=    Create Dictionary    student_number=${number}    student_name=${name}
    ${resp}=    POST On Session    score_api    ${STUDENTS_BASE}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GraphQL query is made for all Students in Class "${class_id}"
    [Documentation]    POST /graphql — students ordered by student_number ASC
    ...    UI: student-table (student-list.ui-manifest.json)
    ${query}=    Set Variable
    ...    { studentsByClass(classId: "${class_id}", orderBy: STUDENT_NUMBER_ASC) { student_id student_number student_name } }
    ${payload}=    Create Dictionary    query=${query}
    ${resp}=    POST On Session    score_api    ${GRAPHQL_ENDPOINT}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GET request is made to student detail endpoint
    ${resp}=    GET On Session    score_api    ${STUDENTS_BASE}/${STUDENT_ID}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a PUT request is made to student detail endpoint with number "${number}" and name "${name}"
    [Documentation]    PUT /semesters/{id}/classes/{id}/students/{id}
    ...    UI: edit-student-trigger → student-number-field, student-name-field, submit-student-trigger
    ${payload}=    Create Dictionary    student_number=${number}    student_name=${name}
    ${resp}=    PUT On Session    score_api    ${STUDENTS_BASE}/${STUDENT_ID}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a PUT request is made to "${url}" with number "${number}" and name "${name}"
    ${payload}=    Create Dictionary    student_number=${number}    student_name=${name}
    ${resp}=    PUT On Session    score_api    ${url}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a DELETE request is made to "${url}"
    [Documentation]    DELETE the given URL
    ...    UI: delete-student-trigger → delete-student-confirm-dialog → confirm-delete-student-trigger
    ${resp}=    DELETE On Session    score_api    ${url}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to import students endpoint with CSV content and no conflicts
    [Documentation]    POST /semesters/{id}/classes/{id}/students:importStudents
    ...    UI: import-students-button (student-list.ui-manifest.json)
    ${csv_content}=    Set Variable    number,name\n10,匯入甲\n11,匯入乙\n12,匯入丙
    ${files}=    Create Dictionary    file=${csv_content.encode()}
    ${resp}=    POST On Session    score_api    ${STUDENTS_BASE}:importStudents    files=${files}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to import students endpoint with conflict_resolution "${strategy}"
    [Documentation]    POST /semesters/{id}/classes/{id}/students:importStudents?conflict_resolution={strategy}
    ...                CSV contains seat 99, which already exists (${STUDENT_ID} from Suite Setup)
    ${csv_content}=    Set Variable    number,name\n99,衝突學生
    ${files}=    Create Dictionary    file=${csv_content.encode()}
    ${params}=    Create Dictionary    conflict_resolution=${strategy}
    ${resp}=    POST On Session    score_api    ${STUDENTS_BASE}:importStudents    files=${files}    params=${params}    expected_status=any
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
