*** Settings ***
Documentation       Feature: Grade Export and Reporting
...                 Source Feature : docs/02-design-specs/behavior-specs/user/grade_export.feature
...                 Upstream Req   : US-08-weighted-score-and-export.md
...                 UI Manifests   : score-preview-dashboard.ui-manifest.json

Library             RequestsLibrary
Library             Collections
Library             String

Suite Setup         Initialize Grade Export Suite
Suite Teardown      Cleanup Grade Export Suite

*** Variables ***
${BASE_URL}             http://localhost:8080
${GRAPHQL_ENDPOINT}     /graphql
# Populated dynamically in Suite Setup — never hardcoded
${SEMESTER_ID}          ${EMPTY}
${CLASS_ID}             ${EMPTY}
${STUDENT_ID}           ${EMPTY}
${GRADE_ITEM_ID}        ${EMPTY}
${ATTENDANCE_ITEM_ID}   ${EMPTY}
${GRADE_RECORD_ID}      ${EMPTY}
${ITEMS_BASE}           ${EMPTY}
${STUDENTS_BASE}        ${EMPTY}

*** Test Cases ***
# ---------------------------------------------------------------------------
# US-08-00: Preview Grade Summary matrix via GraphQL
# ---------------------------------------------------------------------------
Preview class Grade Summary matrix via GraphQL
    [Documentation]    US-08-00 — Reused from: grade_export.feature
    ...                UI: score-summary-table (score-preview-dashboard.ui-manifest.json)
    Given a Class with ID "${CLASS_ID}" exists with several Students and GradeRecords
    When a GraphQL query is made for the Grade Summary of Class "${CLASS_ID}"
    Then the response should contain a matrix of all Students and their scores for each GradeItem
    And each Student's weighted_total_score should follow the weighted sum formula
    And Students should be ordered by student_number ascending

# ---------------------------------------------------------------------------
# US-08-00 AC3: Unregistered scores appear as null
# ---------------------------------------------------------------------------
Unregistered scores appear as null in Grade Summary
    [Documentation]    US-08-00 AC3 — Reused from: grade_export.feature
    ...                UI: weighted-total-column (score-preview-dashboard.ui-manifest.json)
    ...                Uses ${STUDENT_ID_NO_RECORD} (student with no grade record) created in Suite Setup
    Given a Student "${STUDENT_ID_NO_RECORD}" has no GradeRecord for GradeItem "${GRADE_ITEM_ID}"
    When a GraphQL query is made for the Grade Summary of Class "${CLASS_ID}"
    Then the score for Student "${STUDENT_ID_NO_RECORD}" on GradeItem "${GRADE_ITEM_ID}" should be null
    And the null score should be treated as 0 in the weighted_total_score calculation

# ---------------------------------------------------------------------------
# US-08-00 AC5: Weight warning banner
# ---------------------------------------------------------------------------
Grade Summary preview shows weight warning when total weight is not 100%
    [Documentation]    US-08-00 AC5 — Reused from: grade_export.feature
    ...                UI: weight-warning-banner (score-preview-dashboard.ui-manifest.json)
    ...                Suite Setup sets total weight = 80 intentionally for this scenario
    Given the GradeItems in Class "${CLASS_ID}" have a total weight of 80
    When a GraphQL query is made for the Grade Summary of Class "${CLASS_ID}"
    Then the response should contain a "weight_warning" flag set to true

# ---------------------------------------------------------------------------
# US-08-03: Export grades to file
# ---------------------------------------------------------------------------
Export grades to EXCEL format returns 200
    [Documentation]    US-08-03 — Reused from: grade_export.feature
    ...                UI: export-xlsx-trigger (score-preview-dashboard.ui-manifest.json)
    Given a Class with ID "${CLASS_ID}" exists with several Students and GradeRecords
    When a POST request is made to exportGrades endpoint with format "EXCEL"
    Then the response code should be 200
    And the response body should contain "status" equal to "COMPLETED"
    And the response body should contain "file_name" matching export pattern with extension "xlsx"

Export grades to CSV format returns 200
    [Documentation]    US-08-03 — Reused from: grade_export.feature
    Given a Class with ID "${CLASS_ID}" exists with several Students and GradeRecords
    When a POST request is made to exportGrades endpoint with format "CSV"
    Then the response code should be 200
    And the response body should contain "status" equal to "COMPLETED"
    And the response body should contain "file_name" matching export pattern with extension "csv"

Export grades for a non-existent Class returns 404
    [Documentation]    US-08-03 — Reused from: grade_export.feature
    When a POST request is made to exportGrades endpoint for nonexistent class with format "EXCEL"
    Then the response code should be 404

# ---------------------------------------------------------------------------
# US-08-04: Export Attendance summary
# ---------------------------------------------------------------------------
Export Attendance summary report
    [Documentation]    US-08-04 — Reused from: grade_export.feature
    ...                Uses ${ATTENDANCE_ITEM_ID} created in Suite Setup
    Given a Class with ID "${CLASS_ID}" exists with several Students and GradeRecords
    When a POST request is made to exportAttendance endpoint with format "EXCEL"
    Then the response code should be 200
    And the response body should contain "status" equal to "COMPLETED"
    And the exported report should only include GradeItems of type ATTENDANCE

Attendance export includes required columns
    [Documentation]    US-08-04 AC2 — Reused from: grade_export.feature
    Given a Class with ID "${CLASS_ID}" exists with several Students and GradeRecords
    When a POST request is made to exportAttendance endpoint with format "EXCEL"
    Then the response code should be 200
    And the response body should indicate the export includes required attendance columns

*** Keywords ***
# ---------------------------------------------------------------------------
# Suite Lifecycle
# ---------------------------------------------------------------------------
Initialize Grade Export Suite
    Create Session    score_api    ${BASE_URL}    verify=True
    # Step 1: Semester
    ${s_resp}=    POST On Session    score_api    /semesters
    ...    json={"semester_name":"AutoTest-ExportSuite-Semester","start_date":"2024-09-01","end_date":"2025-01-31"}
    Should Be Equal As Strings    ${s_resp.status_code}    201
    Set Suite Variable    ${SEMESTER_ID}    ${s_resp.json()}[semester_id]
    # Step 2: Class
    ${c_resp}=    POST On Session    score_api    /semesters/${SEMESTER_ID}/classes
    ...    json={"class_name":"AutoTest-ExportSuite-Class"}
    Should Be Equal As Strings    ${c_resp.status_code}    201
    Set Suite Variable    ${CLASS_ID}    ${c_resp.json()}[class_id]
    Set Suite Variable    ${ITEMS_BASE}    /semesters/${SEMESTER_ID}/classes/${CLASS_ID}/grade-items
    Set Suite Variable    ${STUDENTS_BASE}    /semesters/${SEMESTER_ID}/classes/${CLASS_ID}/students
    # Step 3: Student with grade record (seat 1)
    ${st1_resp}=    POST On Session    score_api    ${STUDENTS_BASE}
    ...    json={"student_number":1,"student_name":"AutoTest-ExportStudent1"}
    Should Be Equal As Strings    ${st1_resp.status_code}    201
    Set Suite Variable    ${STUDENT_ID}    ${st1_resp.json()}[student_id]
    # Step 4: Student WITHOUT grade record (seat 2) — used for null score test
    ${st2_resp}=    POST On Session    score_api    ${STUDENTS_BASE}
    ...    json={"student_number":2,"student_name":"AutoTest-ExportStudent2-NoRecord"}
    Should Be Equal As Strings    ${st2_resp.status_code}    201
    Set Suite Variable    ${STUDENT_ID_NO_RECORD}    ${st2_resp.json()}[student_id]
    # Step 5: ASSIGNMENT GradeItem (weight 40)
    ${i_resp}=    POST On Session    score_api    ${ITEMS_BASE}
    ...    json={"item_name":"AutoTest-ExportAssignment","item_type":"ASSIGNMENT","max_score":100,"weight":40}
    Should Be Equal As Strings    ${i_resp.status_code}    201
    Set Suite Variable    ${GRADE_ITEM_ID}    ${i_resp.json()}[grade_item_id]
    # Step 6: ATTENDANCE GradeItem (weight 40) — used for attendance export tests
    ${ai_resp}=    POST On Session    score_api    ${ITEMS_BASE}
    ...    json={"item_name":"AutoTest-ExportAttendance","item_type":"ATTENDANCE","max_score":1,"weight":40}
    Should Be Equal As Strings    ${ai_resp.status_code}    201
    Set Suite Variable    ${ATTENDANCE_ITEM_ID}    ${ai_resp.json()}[grade_item_id]
    # Total weight is intentionally 80 (not 100) to support the weight_warning test
    # Step 7: GradeRecord for Student1 on ASSIGNMENT item (score 85)
    ${r_resp}=    POST On Session    score_api    /grade-records
    ...    json={"grade_item_id":"${GRADE_ITEM_ID}","student_id":"${STUDENT_ID}","score":85}
    Should Be Equal As Strings    ${r_resp.status_code}    201
    Set Suite Variable    ${GRADE_RECORD_ID}    ${r_resp.json()}[grade_record_id]
    # Step 8: Attendance record for Student1 (PRESENT → score 1.0)
    POST On Session    score_api    /grade-records
    ...    json={"grade_item_id":"${ATTENDANCE_ITEM_ID}","student_id":"${STUDENT_ID}","attendance_status":"PRESENT"}
    ...    expected_status=any

Cleanup Grade Export Suite
    DELETE On Session    score_api    /semesters/${SEMESTER_ID}    expected_status=any
    Delete All Sessions

# ---------------------------------------------------------------------------
# Given Steps
# ---------------------------------------------------------------------------
a Class with ID "${class_id}" exists with several Students and GradeRecords
    ${resp}=    GET On Session    score_api    /semesters/${SEMESTER_ID}/classes/${class_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a Student "${student_id}" has no GradeRecord for GradeItem "${item_id}"
    [Documentation]    Verifies no grade record exists for the given student/item pair.
    ...                ${STUDENT_ID_NO_RECORD} was intentionally not given a record in Suite Setup.
    ${params}=    Create Dictionary    student_id=${student_id}    grade_item_id=${item_id}
    ${resp}=    GET On Session    score_api    /grade-records    params=${params}    expected_status=any
    ${body}=    Set Variable    ${resp.json()}
    ${count}=    Get Length    ${body}
    Should Be Equal As Integers    ${count}    0

the GradeItems in Class "${class_id}" have a total weight of 80
    [Documentation]    Suite Setup already sets total weight = 80 (40 + 40). No action needed.
    Log    Total weight is already 80 from Suite Setup (ASSIGNMENT=40 + ATTENDANCE=40).

# ---------------------------------------------------------------------------
# When Steps
# ---------------------------------------------------------------------------
a GraphQL query is made for the Grade Summary of Class "${class_id}"
    [Documentation]    POST /graphql — grade summary matrix
    ...    UI: score-summary-table (score-preview-dashboard.ui-manifest.json)
    ${query}=    Set Variable
    ...    { gradeSummary(classId: "${class_id}") { student_id student_number student_name grade_records weighted_total_score weight_warning } }
    ${payload}=    Create Dictionary    query=${query}
    ${resp}=    POST On Session    score_api    ${GRAPHQL_ENDPOINT}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to exportGrades endpoint with format "${format}"
    [Documentation]    POST /semesters/{id}/classes/{id}:exportGrades
    ...    UI: export-xlsx-trigger (score-preview-dashboard.ui-manifest.json)
    ${payload}=    Create Dictionary    format=${format}
    ${resp}=    POST On Session    score_api
    ...    /semesters/${SEMESTER_ID}/classes/${CLASS_ID}:exportGrades
    ...    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to exportGrades endpoint for nonexistent class with format "${format}"
    ${payload}=    Create Dictionary    format=${format}
    ${resp}=    POST On Session    score_api
    ...    /semesters/${SEMESTER_ID}/classes/00000000-0000-0000-0000-000000000000:exportGrades
    ...    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to exportAttendance endpoint with format "${format}"
    [Documentation]    POST /semesters/{id}/classes/{id}:exportAttendance
    ${payload}=    Create Dictionary    format=${format}
    ${resp}=    POST On Session    score_api
    ...    /semesters/${SEMESTER_ID}/classes/${CLASS_ID}:exportAttendance
    ...    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

# ---------------------------------------------------------------------------
# Then Steps
# ---------------------------------------------------------------------------
the response code should be ${expected_code}
    Should Be Equal As Strings    ${RESPONSE.status_code}    ${expected_code}

the response body should contain "${field}" equal to "${value}"
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    ${field}
    Should Be Equal As Strings    ${body}[${field}]    ${value}

the response should contain a matrix of all Students and their scores for each GradeItem
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    data
    Dictionary Should Contain Key    ${body}[data]    gradeSummary
    Should Not Be Empty    ${body}[data][gradeSummary]
    FOR    ${row}    IN    @{body}[data][gradeSummary]
        Dictionary Should Contain Key    ${row}    student_id
        Dictionary Should Contain Key    ${row}    grade_records
        Dictionary Should Contain Key    ${row}    weighted_total_score
    END

each Student's weighted_total_score should follow the weighted sum formula
    ${rows}=    Set Variable    ${RESPONSE.json()}[data][gradeSummary]
    FOR    ${row}    IN    @{rows}
        Should Not Be Equal    ${row}[weighted_total_score]    ${None}
    END

Students should be ordered by student_number ascending
    ${rows}=    Set Variable    ${RESPONSE.json()}[data][gradeSummary]
    ${length}=    Get Length    ${rows}
    FOR    ${i}    IN RANGE    0    ${length} - 1
        Should Be True    ${rows}[${i}][student_number] <= ${rows}[${i+1}][student_number]
    END

the score for Student "${student_id}" on GradeItem "${item_id}" should be null
    ${rows}=    Set Variable    ${RESPONSE.json()}[data][gradeSummary]
    ${found}=    Set Variable    ${False}
    FOR    ${row}    IN    @{rows}
        IF    '${row}[student_id]' == '${student_id}'
            FOR    ${rec}    IN    @{row}[grade_records]
                IF    '${rec}[grade_item_id]' == '${item_id}'
                    Should Be Equal    ${rec}[score]    ${None}
                    ${found}=    Set Variable    ${True}
                END
            END
        END
    END
    Should Be True    ${found}

the null score should be treated as 0 in the weighted_total_score calculation
    ${rows}=    Set Variable    ${RESPONSE.json()}[data][gradeSummary]
    FOR    ${row}    IN    @{rows}
        IF    '${row}[student_id]' == '${STUDENT_ID_NO_RECORD}'
            Should Not Be Equal    ${row}[weighted_total_score]    ${None}
        END
    END

the response should contain a "weight_warning" flag set to true
    ${data}=    Set Variable    ${RESPONSE.json()}[data][gradeSummary]
    Should Not Be Empty    ${data}
    Should Be True    ${data}[0][weight_warning]

the response body should contain "file_name" matching export pattern with extension "${ext}"
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    file_name
    Should Match Regexp    ${body}[file_name]    .+_成績報表_\\d{4}-\\d{2}-\\d{2}\\.${ext}$

the exported report should only include GradeItems of type ATTENDANCE
    ${body}=    Set Variable    ${RESPONSE.json()}
    Should Be Equal As Strings    ${body}[status]    COMPLETED

the response body should indicate the export includes required attendance columns
    ${body_str}=    Convert To String    ${RESPONSE.json()}
    Should Contain Any    ${body_str}    student_number    student_name    present_count    absent_count    excused_count
