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
${OTHER_CLASS_ID}       ${EMPTY}
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
    When a POST request is made to students endpoint with student_id "S99543021", student_number "1", student_name "王小明", and email "xiaoming@gmail.com"
    Then the response code should be 201
    And the response should contain a valid UUID for "id"

Add a Student — 李小華 seat 2 should return 201
    [Documentation]    US-03-02 — Reused from: student_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to students endpoint with student_id "S99543022", student_number "2", student_name "李小華", and email "xiaohua@gmail.com"
    Then the response code should be 201
    And the response should contain a valid UUID for "id"

Add a Student — seat 0 should return 400
    [Documentation]    US-03-02 — Reused from: student_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to students endpoint with student_id "S99543023", student_number "0", student_name "錯誤", and email "error@gmail.com"
    Then the response code should be 400

# ---------------------------------------------------------------------------
# US-03-02 validations from student_management.feature
# ---------------------------------------------------------------------------
Add a Student — missing student_id should return 400
    [Documentation]    US-03-02 — Reused from: student_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to students endpoint with student_id "", student_number "3", student_name "張大強", and email "daqiang@gmail.com"
    Then the response code should be 400

Add a Student — invalid email should return 400
    [Documentation]    US-03-02 — Reused from: student_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to students endpoint with student_id "S99543024", student_number "4", student_name "趙六", and email "invalid-email"
    Then the response code should be 400

Add a Student — empty email should return 400
    [Documentation]    US-03-02 — Reused from: student_management.feature
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to students endpoint with student_id "S99543025", student_number "5", student_name "錢七", and email ""
    Then the response code should be 400

# ---------------------------------------------------------------------------
# US-03-02 AC3: Prevent duplicate student_number in the same Class
# Leverages ${STUDENT_ID} (seat 99) created in Suite Setup as the existing duplicate
# ---------------------------------------------------------------------------
Prevent duplicate student_number in the same Class
    [Documentation]    US-03-02 AC3 — Reused from: student_management.feature
    ...                Suite Setup pre-creates student with number 99; this test attempts to duplicate it
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to students endpoint with student_id "S99543026", student_number "99", student_name "重複", and email "dup@gmail.com"
    Then the response code should be 400

# ---------------------------------------------------------------------------
# US-03-02 AC3: 學號與電子信箱必須為全域唯一
# ---------------------------------------------------------------------------
Prevent duplicate student_id across different Classes or Semesters
    [Documentation]    US-03-02 AC3 — Reused from: student_management.feature
    ...                Suite Setup pre-creates student with studentId "S99543099" in CLASS_ID.
    ...                This test tries to create another student with the same studentId in OTHER_CLASS_ID.
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to students endpoint for other class with student_id "S99543099", student_number "1", student_name "新學生", and email "newstud@gmail.com"
    Then the response code should be 400

Prevent duplicate email across different Classes or Semesters
    [Documentation]    US-03-02 AC3 — Reused from: student_management.feature
    ...                Suite Setup pre-creates student with email "suite99@gmail.com" in CLASS_ID.
    ...                This test tries to create another student with the same email in OTHER_CLASS_ID.
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to students endpoint for other class with student_id "S99543022", student_number "1", student_name "新學生", and email "suite99@gmail.com"
    Then the response code should be 400

# ---------------------------------------------------------------------------
# US-03-03: List all Students via GraphQL
# ---------------------------------------------------------------------------
List all Students in a Class via GraphQL
    [Documentation]    US-03-03 — Reused from: student_management.feature
    ...                UI: student-table (student-list.ui-manifest.json)
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a GraphQL query is made for all Students in Class "${CLASS_ID}"
    Then the response should contain a list of Students ordered by studentNumber ascending

# ---------------------------------------------------------------------------
# US-03-03: Get a Student by ID
# ---------------------------------------------------------------------------
Get a Student by ID
    [Documentation]    US-03-03 — Reused from: student_management.feature
    When a GET request is made to student detail endpoint
    Then the response code should be 200
    And the response body should contain "id" equal to "${STUDENT_ID}"

# ---------------------------------------------------------------------------
# US-03-04: Update Student information
# ---------------------------------------------------------------------------
Update Student information
    [Documentation]    US-03-04 — Reused from: student_management.feature
    ...                UI: edit-student-trigger → student-number-field, student-name-field, submit-student-trigger
    [Teardown]    Restore Suite Student
    When a PUT request is made to student detail endpoint with student_id "S99543099", student_number "10", student_name "王大明", and email "bigwang@gmail.com"
    Then the response code should be 200

Update a non-existent Student returns 404
    [Documentation]    US-03-04 — Reused from: student_management.feature
    When a PUT request is made to "${STUDENTS_BASE}/00000000-0000-0000-0000-000000000000" with student_id "S99543099", student_number "88", student_name "不存在", and email "noexist@gmail.com"
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
    And the response body should contain "success" equal to "True"
    And the response body should contain "affectedCount" equal to "3"

# ---------------------------------------------------------------------------
# US-03-01 AC4: Import with conflicts
# Leverages ${STUDENT_ID} (seat 99) as the conflicting pre-existing seat number
# ---------------------------------------------------------------------------
Import Students from CSV with conflicts — SKIP strategy
    [Documentation]    US-03-01 AC4 — Reused from: student_management.feature
    ...                Seat 99 already exists via ${STUDENT_ID} from Suite Setup
    When a POST request is made to import students endpoint with conflictResolution "SKIP"
    Then the response code should be 200
    And the response body should contain "success" equal to "True"
    And the response body should contain "affectedCount" equal to "0"

Import Students from CSV with conflicts — OVERWRITE strategy
    [Documentation]    US-03-01 AC4 — Reused from: student_management.feature
    When a POST request is made to import students endpoint with conflictResolution "OVERWRITE"
    Then the response code should be 200
    And the response body should contain "success" equal to "True"
    And the response body should contain "affectedCount" equal to "1"

# ---------------------------------------------------------------------------
# US-03-01 AC4: 匯入時發生全域學號或電子信箱重複衝突
# ---------------------------------------------------------------------------
Import Students from CSV with global student_id or email conflict
    [Documentation]    US-03-01 AC4 — Reused from: student_management.feature
    ...                Suite Setup pre-creates student with studentId "S99543099" and email "suite99@gmail.com".
    ...                This test tries to import a CSV into OTHER_CLASS_ID containing global studentId or email conflict.
    Given a Class with ID "${CLASS_ID}" exists in Semester "${SEMESTER_ID}"
    When a POST request is made to import students endpoint for other class with conflicting CSV content
    Then the response code should be 200
    And the response body should contain "success" equal to "True"
    And the response body should contain "affectedCount" equal to "0"

*** Keywords ***
# ---------------------------------------------------------------------------
# Suite Lifecycle
# ---------------------------------------------------------------------------
Initialize Student Suite
    Create Session    score_api    ${BASE_URL}    verify=True
    # Step 1: Create Semester
    ${s_payload}=    Create Dictionary
    ...    semesterName=AutoTest-StudentSuite-Semester
    ...    startDate=2024-09-01
    ...    endDate=2025-01-31
    ${s_resp}=    POST On Session    score_api    /api/v1/semesters    json=${s_payload}
    Should Be Equal As Strings    ${s_resp.status_code}    201
    Set Suite Variable    ${SEMESTER_ID}    ${s_resp.json()}[id]
    # Step 2: Create Class
    ${c_payload}=    Create Dictionary    className=AutoTest-StudentSuite-Class
    ${c_resp}=    POST On Session    score_api    /api/v1/semesters/${SEMESTER_ID}/classes    json=${c_payload}
    Should Be Equal As Strings    ${c_resp.status_code}    201
    Set Suite Variable    ${CLASS_ID}    ${c_resp.json()}[id]
    Set Suite Variable    ${STUDENTS_BASE}    /api/v1/semesters/${SEMESTER_ID}/classes/${CLASS_ID}/students
    # Step 3: Create Other Class (used for global uniqueness tests)
    ${other_c_payload}=    Create Dictionary    className=AutoTest-StudentSuite-OtherClass
    ${other_c_resp}=    POST On Session    score_api    /api/v1/semesters/${SEMESTER_ID}/classes    json=${other_c_payload}
    Should Be Equal As Strings    ${other_c_resp.status_code}    201
    Set Suite Variable    ${OTHER_CLASS_ID}    ${other_c_resp.json()}[id]
    # Step 4: Create Student (seat 99) — used by GET/PUT and duplicate/import conflict tests
    ${st_payload}=    Create Dictionary    studentId=S99543099    studentNumber=99    studentName=AutoTest-SuiteStudent    email=suite99@gmail.com
    ${st_resp}=    POST On Session    score_api    ${STUDENTS_BASE}    json=${st_payload}
    Should Be Equal As Strings    ${st_resp.status_code}    201
    Set Suite Variable    ${STUDENT_ID}    ${st_resp.json()}[id]

Cleanup Student Suite
    # Deleting Semester cascades to Class → Students
    DELETE On Session    score_api    /api/v1/semesters/${SEMESTER_ID}    expected_status=any
    Delete All Sessions

# ---------------------------------------------------------------------------
# Given Steps
# ---------------------------------------------------------------------------
a Class with ID "${class_id}" exists in Semester "${semester_id}"
    ${resp}=    GET On Session    score_api    /api/v1/semesters/${semester_id}/classes/${class_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a disposable Student is created in Class "${class_id}"
    [Documentation]    Creates a temporary student for DELETE test — uses seat 50 (not conflicting with suite seat 99).
    ${payload}=    Create Dictionary    studentId=S99543050    studentNumber=50    studentName=AutoTest-Disposable-Student    email=disposable50@gmail.com
    ${resp}=    POST On Session    score_api    ${STUDENTS_BASE}    json=${payload}
    Should Be Equal As Strings    ${resp.status_code}    201
    Set Test Variable    ${DISPOSABLE_STUDENT_ID}    ${resp.json()}[id]

# ---------------------------------------------------------------------------
# When Steps
# ---------------------------------------------------------------------------
a POST request is made to students endpoint with student_id "${st_id}", student_number "${number}", student_name "${name}", and email "${email}"
    [Documentation]    POST /api/v1/semesters/{id}/classes/{id}/students
    ...    UI: add-student-button → student-number-field, student-name-field, submit-student-trigger
    ${payload}=    Create Dictionary
    Run Keyword If    '${st_id}' != '${EMPTY}'    Set To Dictionary    ${payload}    studentId=${st_id}
    IF    '${number}' != '${EMPTY}'
        ${is_digit}=    Evaluate    str('${number}').isdigit()
        ${number_val}=    Run Keyword If    ${is_digit}    Convert To Integer    ${number}    ELSE    Set Variable    ${number}
        Set To Dictionary    ${payload}    studentNumber=${number_val}
    END
    Run Keyword If    '${name}' != '${EMPTY}'    Set To Dictionary    ${payload}    studentName=${name}
    Run Keyword If    '${email}' != '${EMPTY}'    Set To Dictionary    ${payload}    email=${email}
    ${resp}=    POST On Session    score_api    ${STUDENTS_BASE}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to students endpoint for other class with student_id "${st_id}", student_number "${number}", student_name "${name}", and email "${email}"
    [Documentation]    POST /api/v1/semesters/{id}/classes/{other_id}/students
    ${payload}=    Create Dictionary
    Run Keyword If    '${st_id}' != '${EMPTY}'    Set To Dictionary    ${payload}    studentId=${st_id}
    IF    '${number}' != '${EMPTY}'
        ${is_digit}=    Evaluate    str('${number}').isdigit()
        ${number_val}=    Run Keyword If    ${is_digit}    Convert To Integer    ${number}    ELSE    Set Variable    ${number}
        Set To Dictionary    ${payload}    studentNumber=${number_val}
    END
    Run Keyword If    '${name}' != '${EMPTY}'    Set To Dictionary    ${payload}    studentName=${name}
    Run Keyword If    '${email}' != '${EMPTY}'    Set To Dictionary    ${payload}    email=${email}
    ${resp}=    POST On Session    score_api    /api/v1/semesters/${SEMESTER_ID}/classes/${OTHER_CLASS_ID}/students    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GraphQL query is made for all Students in Class "${class_id}"
    [Documentation]    POST /graphql — students ordered by studentNumber ASC
    ...    UI: student-table (student-list.ui-manifest.json)
    ${query}=    Set Variable
    ...    { listStudents(filter: { classId: "${class_id}" }) { id studentId studentNumber studentName email } }
    ${payload}=    Create Dictionary    query=${query}
    ${resp}=    POST On Session    score_api    ${GRAPHQL_ENDPOINT}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GET request is made to student detail endpoint
    ${resp}=    GET On Session    score_api    ${STUDENTS_BASE}/${STUDENT_ID}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a PUT request is made to student detail endpoint with student_id "${st_id}", student_number "${number}", student_name "${name}", and email "${email}"
    [Documentation]    PUT /api/v1/semesters/{id}/classes/{id}/students/{id}
    ...    UI: edit-student-trigger → student-number-field, student-name-field, submit-student-trigger
    ${payload}=    Create Dictionary
    Run Keyword If    '${st_id}' != '${EMPTY}'    Set To Dictionary    ${payload}    studentId=${st_id}
    IF    '${number}' != '${EMPTY}'
        ${is_digit}=    Evaluate    str('${number}').isdigit()
        ${number_val}=    Run Keyword If    ${is_digit}    Convert To Integer    ${number}    ELSE    Set Variable    ${number}
        Set To Dictionary    ${payload}    studentNumber=${number_val}
    END
    Run Keyword If    '${name}' != '${EMPTY}'    Set To Dictionary    ${payload}    studentName=${name}
    Run Keyword If    '${email}' != '${EMPTY}'    Set To Dictionary    ${payload}    email=${email}
    ${resp}=    PUT On Session    score_api    ${STUDENTS_BASE}/${STUDENT_ID}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a PUT request is made to "${url}" with student_id "${st_id}", student_number "${number}", student_name "${name}", and email "${email}"
    ${payload}=    Create Dictionary
    Run Keyword If    '${st_id}' != '${EMPTY}'    Set To Dictionary    ${payload}    studentId=${st_id}
    IF    '${number}' != '${EMPTY}'
        ${is_digit}=    Evaluate    str('${number}').isdigit()
        ${number_val}=    Run Keyword If    ${is_digit}    Convert To Integer    ${number}    ELSE    Set Variable    ${number}
        Set To Dictionary    ${payload}    studentNumber=${number_val}
    END
    Run Keyword If    '${name}' != '${EMPTY}'    Set To Dictionary    ${payload}    studentName=${name}
    Run Keyword If    '${email}' != '${EMPTY}'    Set To Dictionary    ${payload}    email=${email}
    ${resp}=    PUT On Session    score_api    ${url}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a DELETE request is made to "${url}"
    [Documentation]    DELETE the given URL
    ...    UI: delete-student-trigger → delete-student-confirm-dialog → confirm-delete-student-trigger
    ${resp}=    DELETE On Session    score_api    ${url}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to import students endpoint with CSV content and no conflicts
    [Documentation]    POST /api/v1/semesters/{id}/classes/{id}/students:importStudents
    ...    UI: import-students-button (student-list.ui-manifest.json)
    ${csv_content}=    Set Variable    學號,座號,姓名,信箱\nS010,10,匯入甲,import_xiaoming@gmail.com\nS011,11,匯入乙,import_xiaohua@gmail.com\nS012,12,匯入丙,import_daqiang@gmail.com
    ${files}=    Create Dictionary    file=${csv_content.encode()}
    ${resp}=    POST On Session    score_api    ${STUDENTS_BASE}:importStudents    files=${files}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to import students endpoint with conflictResolution "${strategy}"
    [Documentation]    POST /api/v1/semesters/{id}/classes/{id}/students:importStudents?conflictResolution={strategy}
    ...                CSV contains seat 99, which already exists (${STUDENT_ID} from Suite Setup)
    ${csv_content}=    Set Variable    學號,座號,姓名,信箱\nS99543099,99,衝突學生,suite99@gmail.com
    ${files}=    Create Dictionary    file=${csv_content.encode()}
    ${params}=    Create Dictionary    conflictResolution=${strategy}
    ${resp}=    POST On Session    score_api    ${STUDENTS_BASE}:importStudents    files=${files}    params=${params}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to import students endpoint for other class with conflicting CSV content
    [Documentation]    POST /api/v1/semesters/{id}/classes/{other_id}/students:importStudents
    ...                CSV contains studentId and email that conflicts globally with CLASS_ID pre-creates.
    ${csv_content}=    Set Variable    學號,座號,姓名,信箱\nS99543099,1,衝突學生一,new1@gmail.com\nS004,2,衝突學生二,suite99@gmail.com
    ${files}=    Create Dictionary    file=${csv_content.encode()}
    ${resp}=    POST On Session    score_api    /api/v1/semesters/${SEMESTER_ID}/classes/${OTHER_CLASS_ID}/students:importStudents    files=${files}    expected_status=any
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
    Dictionary Should Contain Key    ${body}[data]    listStudents
    ${items}=    Set Variable    ${body}[data][listStudents]
    Should Not Be Empty    ${items}
    ${length}=    Get Length    ${items}
    FOR    ${i}    IN RANGE    0    ${length} - 1
        Should Be True    ${items}[${i}][studentNumber] <= ${items}[${i+1}][studentNumber]
    END

the Student with ID "${student_id}" should no longer exist
    ${resp}=    GET On Session    score_api    ${STUDENTS_BASE}/${student_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    404

Restore Suite Student
    ${payload}=    Create Dictionary    studentId=S99543099    studentNumber=${99}    studentName=AutoTest-SuiteStudent    email=suite99@gmail.com
    PUT On Session    score_api    ${STUDENTS_BASE}/${STUDENT_ID}    json=${payload}
