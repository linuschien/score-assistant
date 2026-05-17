*** Settings ***
Documentation       Feature: Grade Recording
...                 Source Feature : docs/02-design-specs/behavior-specs/user/grade_recording.feature
...                 Upstream Req   : US-05-grade-recording.md, US-06-grade-attachment-management.md
...                 UI Manifests   : grade-entry-board.ui-manifest.json

Library             RequestsLibrary
Library             Collections

Suite Setup         Create Session    score_api    ${BASE_URL}    verify=True
Suite Teardown      Delete All Sessions

*** Variables ***
${BASE_URL}             http://localhost:8080
${SEMESTER_ID}          d3b07384-d113-404c-9f8a-020524032a9a
${CLASS_ID}             c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a
${STUDENT_ID}           a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d
${GRADE_ITEM_ID}        f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c
${GRADE_RECORD_ID}      b5c6d7e8-f9a0-1b2c-3d4e-5f6a7b8c9d0e
${NONEXIST_ID}          00000000-0000-0000-0000-000000000000

*** Test Cases ***
Record a numeric score — ASSIGNMENT 85 should return 201
    [Documentation]    US-05-01 — Reused from: grade_recording.feature
    Given a GradeItem with ID "${GRADE_ITEM_ID}" of type "ASSIGNMENT" and max_score 100 exists
    And a Student with ID "${STUDENT_ID}" exists in Class "${CLASS_ID}"
    When a POST request is made to "/grade-records" with grade_item_id score 85
    Then the response code should be 201
    And the response should contain a valid UUID for "grade_record_id"

Record a numeric score — ASSIGNMENT negative score should return 400
    [Documentation]    US-05-01 — Reused from: grade_recording.feature
    Given a GradeItem with ID "${GRADE_ITEM_ID}" of type "ASSIGNMENT" and max_score 100 exists
    When a POST request is made to "/grade-records" with grade_item_id score -5
    Then the response code should be 400

Record a numeric score — CLASSROOM_PERFORMANCE negative bonus should return 201
    [Documentation]    US-05-01 — Reused from: grade_recording.feature
    Given a GradeItem with ID "${GRADE_ITEM_ID}" of type "CLASSROOM_PERFORMANCE" and max_score 10 exists
    When a POST request is made to "/grade-records" with grade_item_id score -2
    Then the response code should be 201

Record a numeric score — ATTENDANCE 1 should return 201
    [Documentation]    US-05-01 — Reused from: grade_recording.feature
    Given a GradeItem with ID "${GRADE_ITEM_ID}" of type "ATTENDANCE" and max_score 1 exists
    When a POST request is made to "/grade-records" with grade_item_id score 1
    Then the response code should be 201

Record a numeric score — ATTENDANCE 0 should return 201
    [Documentation]    US-05-01 — Reused from: grade_recording.feature
    Given a GradeItem with ID "${GRADE_ITEM_ID}" of type "ATTENDANCE" and max_score 1 exists
    When a POST request is made to "/grade-records" with grade_item_id score 0
    Then the response code should be 201

Record a numeric score — REPORT 75 should return 201
    [Documentation]    US-05-01 — Reused from: grade_recording.feature
    Given a GradeItem with ID "${GRADE_ITEM_ID}" of type "REPORT" and max_score 100 exists
    When a POST request is made to "/grade-records" with grade_item_id score 75
    Then the response code should be 201

Record a numeric score — OTHER 45 should return 201
    [Documentation]    US-05-01 — Reused from: grade_recording.feature
    Given a GradeItem with ID "${GRADE_ITEM_ID}" of type "OTHER" and max_score 50 exists
    When a POST request is made to "/grade-records" with grade_item_id score 45
    Then the response code should be 201

Record Attendance with status PRESENT maps to score 1.0
    [Documentation]    US-05-01 AC2 — Reused from: grade_recording.feature
    ...    UI locator: attendance-selector (grade-entry-board.ui-manifest.json)
    Given a GradeItem with ID "${GRADE_ITEM_ID}" of type "ATTENDANCE" and max_score 1 exists
    When a POST request is made to "/grade-records" with attendance_status "PRESENT"
    Then the response code should be 201
    And the recorded score should be 1.0

Record Attendance with status ABSENT maps to score 0.0
    [Documentation]    US-05-01 AC2 — Reused from: grade_recording.feature
    Given a GradeItem with ID "${GRADE_ITEM_ID}" of type "ATTENDANCE" and max_score 1 exists
    When a POST request is made to "/grade-records" with attendance_status "ABSENT"
    Then the response code should be 201
    And the recorded score should be 0.0

Record Attendance with status EXCUSED maps to score 0.5
    [Documentation]    US-05-01 AC2 — Reused from: grade_recording.feature
    Given a GradeItem with ID "${GRADE_ITEM_ID}" of type "ATTENDANCE" and max_score 1 exists
    When a POST request is made to "/grade-records" with attendance_status "EXCUSED"
    Then the response code should be 201
    And the recorded score should be 0.5

Update an existing GradeRecord
    [Documentation]    US-05-02 — Reused from: grade_recording.feature
    ...    UI locator: score-input (grade-entry-board.ui-manifest.json)
    Given a GradeRecord with ID "${GRADE_RECORD_ID}" exists
    When a PUT request is made to "/grade-records/${GRADE_RECORD_ID}" with score 90
    Then the response code should be 200
    And the response body should contain an updated "last_modified_at" timestamp

Update a non-existent GradeRecord returns 404
    [Documentation]    US-05-02 — Reused from: grade_recording.feature
    When a PUT request is made to "/grade-records/${NONEXIST_ID}" with score 80
    Then the response code should be 404

Upload an Attachment for a GradeRecord
    [Documentation]    US-06 — Reused from: grade_recording.feature
    ...    UI locator: attachment-trigger → attachment-overlay → upload-attachment-trigger (grade-entry-board)
    Given a GradeRecord with ID "${GRADE_RECORD_ID}" exists
    When a POST request is made to "/grade-records/${GRADE_RECORD_ID}/attachments" with a 5MB PDF file
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
    Given a GradeRecord with ID "${GRADE_RECORD_ID}" already has 5 Attachments
    When a POST request is made to "/grade-records/${GRADE_RECORD_ID}/attachments" with a 1MB PDF file
    Then the response code should be 400
    And the error message should indicate that the attachment limit has been reached

*** Keywords ***
a GradeItem with ID "${item_id}" of type "${item_type}" and max_score ${max_score} exists
    ${resp}=    GET On Session    score_api
    ...    /semesters/${SEMESTER_ID}/classes/${CLASS_ID}/grade-items/${item_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a Student with ID "${student_id}" exists in Class "${class_id}"
    ${resp}=    GET On Session    score_api
    ...    /semesters/${SEMESTER_ID}/classes/${class_id}/students/${student_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a GradeRecord with ID "${record_id}" exists
    ${resp}=    GET On Session    score_api    /grade-records/${record_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a GradeRecord with ID "${record_id}" already has 5 Attachments
    [Documentation]    Pre-condition: seed 5 attachments on the given record.
    FOR    ${i}    IN RANGE    1    6
        ${dummy}=    Set Variable    dummy content ${i}
        ${files}=    Create Dictionary    file=${dummy.encode()}
        POST On Session    score_api    /grade-records/${record_id}/attachments    files=${files}    expected_status=any
    END

a POST request is made to "/grade-records" with grade_item_id score ${score}
    [Documentation]    POST /grade-records
    ...    UI locator: score-input (grade-entry-board.ui-manifest.json)
    ${payload}=    Create Dictionary
    ...    grade_item_id=${GRADE_ITEM_ID}
    ...    student_id=${STUDENT_ID}
    ...    score=${score}
    ${resp}=    POST On Session    score_api    /grade-records    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to "/grade-records" with attendance_status "${status}"
    [Documentation]    POST /grade-records with attendance_status field
    ...    UI locator: attendance-selector → score-input (grade-entry-board.ui-manifest.json)
    ${payload}=    Create Dictionary
    ...    grade_item_id=${GRADE_ITEM_ID}
    ...    student_id=${STUDENT_ID}
    ...    attendance_status=${status}
    ${resp}=    POST On Session    score_api    /grade-records    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a PUT request is made to "/grade-records/${record_id}" with score ${score}
    [Documentation]    PUT /grade-records/{id}
    ...    UI locator: score-input (grade-entry-board.ui-manifest.json)
    ${payload}=    Create Dictionary
    ...    grade_item_id=${GRADE_ITEM_ID}
    ...    student_id=${STUDENT_ID}
    ...    score=${score}
    ${resp}=    PUT On Session    score_api    /grade-records/${record_id}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to "/grade-records/${record_id}/attachments" with a 5MB PDF file
    [Documentation]    POST /grade-records/{id}/attachments — 5MB file
    ...    UI locator: upload-attachment-trigger (grade-entry-board.ui-manifest.json)
    ${dummy}=    Evaluate    b'x' * 5242880
    ${files}=    Create Dictionary    file=${dummy}
    ${resp}=    POST On Session    score_api    /grade-records/${record_id}/attachments    files=${files}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to "/grade-records/${record_id}/attachments" with a 15MB file
    ${dummy}=    Evaluate    b'x' * 15728640
    ${files}=    Create Dictionary    file=${dummy}
    ${resp}=    POST On Session    score_api    /grade-records/${record_id}/attachments    files=${files}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to "/grade-records/${record_id}/attachments" with a 1MB PDF file
    ${dummy}=    Evaluate    b'x' * 1048576
    ${files}=    Create Dictionary    file=${dummy}
    ${resp}=    POST On Session    score_api    /grade-records/${record_id}/attachments    files=${files}    expected_status=any
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
    ${body}=    Convert To String    ${RESPONSE.json()}
    Should Contain Any    ${body}    size limit    too large    exceeds    10MB    10 MB

the error message should indicate that the attachment limit has been reached
    ${body}=    Convert To String    ${RESPONSE.json()}
    Should Contain Any    ${body}    limit    maximum    5 attachments    reached
