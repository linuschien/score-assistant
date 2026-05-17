*** Settings ***
Documentation       Feature: Grade Recording
...                 Source Feature : docs/02-design-specs/behavior-specs/user/grade_recording.feature
...                 Upstream Req   : US-05-grade-recording.md, US-06-grade-attachment-management.md
...                 UI Manifests   : grade-entry-board.ui-manifest.json

Library             RequestsLibrary
Library             Collections

Suite Setup         Initialize Grade Recording Suite
Suite Teardown      Cleanup Grade Recording Suite

*** Variables ***
${BASE_URL}             http://localhost:8080
# Populated dynamically in Suite Setup — never hardcoded
${SEMESTER_ID}          ${EMPTY}
${CLASS_ID}             ${EMPTY}
${STUDENT_ID}           ${EMPTY}
${GRADE_ITEM_ID}        ${EMPTY}
${GRADE_RECORD_ID}      ${EMPTY}
${ITEMS_BASE}           ${EMPTY}
${STUDENTS_BASE}        ${EMPTY}

*** Test Cases ***
# ---------------------------------------------------------------------------
# US-05-01: Record a numeric score — valid cases
# ---------------------------------------------------------------------------
Record a numeric score — ASSIGNMENT 85 should return 201
    [Documentation]    US-05-01 — Reused from: grade_recording.feature
    ...                UI: score-input (grade-entry-board.ui-manifest.json)
    Given a GradeItem with ID "${GRADE_ITEM_ID}" of type "ASSIGNMENT" exists
    And a Student with ID "${STUDENT_ID}" exists
    When a POST request is made to "/grade-records" with score 85
    Then the response code should be 201
    And the response should contain a valid UUID for "grade_record_id"

Record a numeric score — ASSIGNMENT negative score should return 400
    [Documentation]    US-05-01 — Reused from: grade_recording.feature
    Given a GradeItem with ID "${GRADE_ITEM_ID}" of type "ASSIGNMENT" exists
    When a POST request is made to "/grade-records" with score -5
    Then the response code should be 400

Record a numeric score — CLASSROOM_PERFORMANCE negative bonus should return 201
    [Documentation]    US-05-01 — Reused from: grade_recording.feature
    ...                CLASSROOM_PERFORMANCE allows negative values (bonus/penalty)
    Given a GradeItem with type "CLASSROOM_PERFORMANCE" is prepared for this test
    When a POST request is made to "/grade-records" for CLASSROOM_PERFORMANCE item with score -2
    Then the response code should be 201

Record a numeric score — ATTENDANCE 1 should return 201
    [Documentation]    US-05-01 — Reused from: grade_recording.feature
    Given a GradeItem with type "ATTENDANCE" is prepared for this test
    When a POST request is made to "/grade-records" for ATTENDANCE item with score 1
    Then the response code should be 201

Record a numeric score — ATTENDANCE 0 should return 201
    [Documentation]    US-05-01 — Reused from: grade_recording.feature
    Given a GradeItem with type "ATTENDANCE" is prepared for this test
    When a POST request is made to "/grade-records" for ATTENDANCE item with score 0
    Then the response code should be 201

Record a numeric score — REPORT 75 should return 201
    [Documentation]    US-05-01 — Reused from: grade_recording.feature
    Given a GradeItem with type "REPORT" is prepared for this test
    When a POST request is made to "/grade-records" for REPORT item with score 75
    Then the response code should be 201

Record a numeric score — OTHER 45 should return 201
    [Documentation]    US-05-01 — Reused from: grade_recording.feature
    Given a GradeItem with type "OTHER" is prepared for this test
    When a POST request is made to "/grade-records" for OTHER item with score 45
    Then the response code should be 201

# ---------------------------------------------------------------------------
# US-05-01 AC2: Attendance status auto-mapping
# ---------------------------------------------------------------------------
Record Attendance with status PRESENT maps to score 1.0
    [Documentation]    US-05-01 AC2 — Reused from: grade_recording.feature
    ...                UI: attendance-selector → score-input (grade-entry-board.ui-manifest.json)
    Given a GradeItem with type "ATTENDANCE" is prepared for this test
    When a POST request is made to "/grade-records" with attendance_status "PRESENT"
    Then the response code should be 201
    And the recorded score should be 1.0

Record Attendance with status ABSENT maps to score 0.0
    [Documentation]    US-05-01 AC2 — Reused from: grade_recording.feature
    Given a GradeItem with type "ATTENDANCE" is prepared for this test
    When a POST request is made to "/grade-records" with attendance_status "ABSENT"
    Then the response code should be 201
    And the recorded score should be 0.0

Record Attendance with status EXCUSED maps to score 0.5
    [Documentation]    US-05-01 AC2 — Reused from: grade_recording.feature
    Given a GradeItem with type "ATTENDANCE" is prepared for this test
    When a POST request is made to "/grade-records" with attendance_status "EXCUSED"
    Then the response code should be 201
    And the recorded score should be 0.5

# ---------------------------------------------------------------------------
# US-05-02: Update an existing GradeRecord
# ---------------------------------------------------------------------------
Update an existing GradeRecord
    [Documentation]    US-05-02 — Reused from: grade_recording.feature
    ...                UI: score-input (grade-entry-board.ui-manifest.json)
    ...                Uses ${GRADE_RECORD_ID} created in Suite Setup
    Given a GradeRecord with ID "${GRADE_RECORD_ID}" exists
    When a PUT request is made to "/grade-records/${GRADE_RECORD_ID}" with score 90
    Then the response code should be 200
    And the response body should contain an updated "last_modified_at" timestamp

Update a non-existent GradeRecord returns 404
    [Documentation]    US-05-02 — Reused from: grade_recording.feature
    When a PUT request is made to "/grade-records/00000000-0000-0000-0000-000000000000" with score 80
    Then the response code should be 404

# ---------------------------------------------------------------------------
# US-06: Attachment management
# ---------------------------------------------------------------------------
Upload an Attachment for a GradeRecord
    [Documentation]    US-06 — Reused from: grade_recording.feature
    ...                UI: attachment-trigger → attachment-overlay → upload-attachment-trigger (grade-entry-board)
    Given a GradeRecord with ID "${GRADE_RECORD_ID}" exists
    When a POST request is made to "/grade-records/${GRADE_RECORD_ID}/attachments" with a 5MB file
    Then the response code should be 201
    And the response should contain a valid UUID for "attachment_id"
    And the Attachment should be associated with GradeRecord "${GRADE_RECORD_ID}"

Reject Attachments exceeding 10MB size limit
    [Documentation]    US-06 AC — Reused from: grade_recording.feature
    Given a GradeRecord with ID "${GRADE_RECORD_ID}" exists
    When a POST request is made to "/grade-records/${GRADE_RECORD_ID}/attachments" with a 15MB file
    Then the response code should be 400
    And the error message should indicate that the file exceeds the 10MB size limit

Reject Attachment when limit of 5 per GradeRecord is reached
    [Documentation]    US-06 AC — Reused from: grade_recording.feature
    Given a GradeRecord with 5 existing attachments is prepared
    When a POST request is made to "/grade-records/${FULL_RECORD_ID}/attachments" with a 1MB file
    Then the response code should be 400
    And the error message should indicate that the attachment limit has been reached

*** Keywords ***
# ---------------------------------------------------------------------------
# Suite Lifecycle
# ---------------------------------------------------------------------------
Initialize Grade Recording Suite
    Create Session    score_api    ${BASE_URL}    verify=True
    # Step 1: Semester
    ${s_resp}=    POST On Session    score_api    /semesters
    ...    json={"semester_name":"AutoTest-GradeRecSuite-Semester","start_date":"2024-09-01","end_date":"2025-01-31"}
    Should Be Equal As Strings    ${s_resp.status_code}    201
    Set Suite Variable    ${SEMESTER_ID}    ${s_resp.json()}[semester_id]
    # Step 2: Class
    ${c_resp}=    POST On Session    score_api    /semesters/${SEMESTER_ID}/classes
    ...    json={"class_name":"AutoTest-GradeRecSuite-Class"}
    Should Be Equal As Strings    ${c_resp.status_code}    201
    Set Suite Variable    ${CLASS_ID}    ${c_resp.json()}[class_id]
    Set Suite Variable    ${ITEMS_BASE}    /semesters/${SEMESTER_ID}/classes/${CLASS_ID}/grade-items
    Set Suite Variable    ${STUDENTS_BASE}    /semesters/${SEMESTER_ID}/classes/${CLASS_ID}/students
    # Step 3: Student
    ${st_resp}=    POST On Session    score_api    ${STUDENTS_BASE}
    ...    json={"student_number":1,"student_name":"AutoTest-SuiteStudent"}
    Should Be Equal As Strings    ${st_resp.status_code}    201
    Set Suite Variable    ${STUDENT_ID}    ${st_resp.json()}[student_id]
    # Step 4: GradeItem (ASSIGNMENT, max 100) — used by main score tests and UPDATE test
    ${i_resp}=    POST On Session    score_api    ${ITEMS_BASE}
    ...    json={"item_name":"AutoTest-SuiteAssignment","item_type":"ASSIGNMENT","max_score":100,"weight":20}
    Should Be Equal As Strings    ${i_resp.status_code}    201
    Set Suite Variable    ${GRADE_ITEM_ID}    ${i_resp.json()}[grade_item_id]
    # Step 5: GradeRecord (score 80) — used by UPDATE and ATTACHMENT tests
    ${r_resp}=    POST On Session    score_api    /grade-records
    ...    json={"grade_item_id":"${GRADE_ITEM_ID}","student_id":"${STUDENT_ID}","score":80}
    Should Be Equal As Strings    ${r_resp.status_code}    201
    Set Suite Variable    ${GRADE_RECORD_ID}    ${r_resp.json()}[grade_record_id]

Cleanup Grade Recording Suite
    DELETE On Session    score_api    /semesters/${SEMESTER_ID}    expected_status=any
    Delete All Sessions

# ---------------------------------------------------------------------------
# Given Steps
# ---------------------------------------------------------------------------
a GradeItem with ID "${item_id}" of type "${item_type}" exists
    ${resp}=    GET On Session    score_api    ${ITEMS_BASE}/${item_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a Student with ID "${student_id}" exists
    ${resp}=    GET On Session    score_api    ${STUDENTS_BASE}/${student_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a GradeRecord with ID "${record_id}" exists
    ${resp}=    GET On Session    score_api    /grade-records/${record_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a GradeItem with type "${item_type}" is prepared for this test
    [Documentation]    Creates a per-test GradeItem of the given type.
    ...    Stored as ${TEMP_ITEM_ID} for use within this test only.
    ${payload}=    Create Dictionary
    ...    item_name=AutoTest-Temp-${item_type}
    ...    item_type=${item_type}
    ...    max_score=100
    ...    weight=0
    ${resp}=    POST On Session    score_api    ${ITEMS_BASE}    json=${payload}
    Should Be Equal As Strings    ${resp.status_code}    201
    Set Test Variable    ${TEMP_ITEM_ID}    ${resp.json()}[grade_item_id]

a GradeRecord with 5 existing attachments is prepared
    [Documentation]    Creates a fresh GradeRecord and seeds it with 5 attachments.
    ${r_resp}=    POST On Session    score_api    /grade-records
    ...    json={"grade_item_id":"${GRADE_ITEM_ID}","student_id":"${STUDENT_ID}","score":50}
    Should Be Equal As Strings    ${r_resp.status_code}    201
    Set Test Variable    ${FULL_RECORD_ID}    ${r_resp.json()}[grade_record_id]
    FOR    ${i}    IN RANGE    1    6
        ${dummy}=    Evaluate    b'x' * 1024
        ${files}=    Create Dictionary    file=${dummy}
        POST On Session    score_api    /grade-records/${FULL_RECORD_ID}/attachments    files=${files}    expected_status=any
    END

# ---------------------------------------------------------------------------
# When Steps
# ---------------------------------------------------------------------------
a POST request is made to "/grade-records" with score ${score}
    [Documentation]    POST /grade-records with numeric score
    ...    UI: score-input (grade-entry-board.ui-manifest.json)
    ${payload}=    Create Dictionary
    ...    grade_item_id=${GRADE_ITEM_ID}
    ...    student_id=${STUDENT_ID}
    ...    score=${score}
    ${resp}=    POST On Session    score_api    /grade-records    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to "/grade-records" for ${item_type} item with score ${score}
    [Documentation]    POST /grade-records using ${TEMP_ITEM_ID} created in Given step
    ${payload}=    Create Dictionary
    ...    grade_item_id=${TEMP_ITEM_ID}
    ...    student_id=${STUDENT_ID}
    ...    score=${score}
    ${resp}=    POST On Session    score_api    /grade-records    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to "/grade-records" with attendance_status "${status}"
    [Documentation]    POST /grade-records with attendance_status
    ...    UI: attendance-selector → score-input (grade-entry-board.ui-manifest.json)
    ${payload}=    Create Dictionary
    ...    grade_item_id=${TEMP_ITEM_ID}
    ...    student_id=${STUDENT_ID}
    ...    attendance_status=${status}
    ${resp}=    POST On Session    score_api    /grade-records    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a PUT request is made to "/grade-records/${record_id}" with score ${score}
    [Documentation]    PUT /grade-records/{id}
    ...    UI: score-input (grade-entry-board.ui-manifest.json)
    ${payload}=    Create Dictionary
    ...    grade_item_id=${GRADE_ITEM_ID}
    ...    student_id=${STUDENT_ID}
    ...    score=${score}
    ${resp}=    PUT On Session    score_api    /grade-records/${record_id}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to "/grade-records/${record_id}/attachments" with a 5MB file
    [Documentation]    POST /grade-records/{id}/attachments
    ...    UI: attachment-trigger → upload-attachment-trigger (grade-entry-board.ui-manifest.json)
    ${dummy}=    Evaluate    b'x' * 5242880
    ${files}=    Create Dictionary    file=${dummy}
    ${resp}=    POST On Session    score_api    /grade-records/${record_id}/attachments    files=${files}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to "/grade-records/${record_id}/attachments" with a 15MB file
    ${dummy}=    Evaluate    b'x' * 15728640
    ${files}=    Create Dictionary    file=${dummy}
    ${resp}=    POST On Session    score_api    /grade-records/${record_id}/attachments    files=${files}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to "/grade-records/${record_id}/attachments" with a 1MB file
    ${dummy}=    Evaluate    b'x' * 1048576
    ${files}=    Create Dictionary    file=${dummy}
    ${resp}=    POST On Session    score_api    /grade-records/${record_id}/attachments    files=${files}    expected_status=any
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

the recorded score should be ${expected_score}
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    score
    Should Be Equal As Numbers    ${body}[score]    ${expected_score}

the response body should contain an updated "${field}" timestamp
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    ${field}
    Should Not Be Empty    ${body}[${field}]

the Attachment should be associated with GradeRecord "${record_id}"
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    grade_record_id
    Should Be Equal As Strings    ${body}[grade_record_id]    ${record_id}

the error message should indicate that the file exceeds the 10MB size limit
    ${body_str}=    Convert To String    ${RESPONSE.json()}
    Should Contain Any    ${body_str}    size limit    too large    exceeds    10MB    10 MB

the error message should indicate that the attachment limit has been reached
    ${body_str}=    Convert To String    ${RESPONSE.json()}
    Should Contain Any    ${body_str}    limit    maximum    5 attachments    reached
