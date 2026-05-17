*** Settings ***
Documentation       Feature: Grade Export and Reporting
...                 Source Feature : docs/02-design-specs/behavior-specs/user/grade_export.feature
...                 Upstream Req   : US-08-weighted-score-and-export.md
...                 UI Manifests   : score-preview-dashboard.ui-manifest.json

Library             RequestsLibrary
Library             Collections
Library             String

Suite Setup         Create Session    score_api    ${BASE_URL}    verify=True
Suite Teardown      Delete All Sessions

*** Variables ***
${BASE_URL}             http://localhost:8080
${SEMESTER_ID}          d3b07384-d113-404c-9f8a-020524032a9a
${CLASS_ID}             c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a
${STUDENT_ID}           a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d
${GRADE_ITEM_ID}        f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c
${NONEXIST_CLASS_ID}    00000000-0000-0000-0000-000000000000
${GRAPHQL_ENDPOINT}     /graphql

*** Test Cases ***
Preview class Grade Summary matrix via GraphQL
    [Documentation]    US-08-00 — Reused from: grade_export.feature
    ...    UI locator: score-summary-table (score-preview-dashboard.ui-manifest.json)
    Given a Class with ID "${CLASS_ID}" exists with several Students and GradeRecords
    When a GraphQL query is made for the Grade Summary of Class "${CLASS_ID}"
    Then the response should contain a matrix of all Students and their scores for each GradeItem
    And each Student's weighted_total_score should follow the weighted sum formula
    And Students should be ordered by student_number ascending

Unregistered scores appear as null in Grade Summary
    [Documentation]    US-08-00 AC3 — Reused from: grade_export.feature
    ...    UI locator: score-summary-table, weighted-total-column (score-preview-dashboard)
    Given a Student with ID "${STUDENT_ID}" has no GradeRecord for GradeItem "${GRADE_ITEM_ID}"
    When a GraphQL query is made for the Grade Summary of Class "${CLASS_ID}"
    Then the score for Student "${STUDENT_ID}" on GradeItem "${GRADE_ITEM_ID}" should be null
    And the null score should be treated as 0 in the weighted_total_score calculation

Grade Summary preview shows weight warning when total weight is not 100%
    [Documentation]    US-08-00 AC5 — Reused from: grade_export.feature
    ...    UI locator: weight-warning-banner (score-preview-dashboard.ui-manifest.json)
    Given the GradeItems in Class "${CLASS_ID}" have a total weight of 80
    When a GraphQL query is made for the Grade Summary of Class "${CLASS_ID}"
    Then the response should contain a "weight_warning" flag set to true

Export grades to EXCEL format returns 200
    [Documentation]    US-08-03 — Reused from: grade_export.feature
    ...    UI locator: export-xlsx-trigger (score-preview-dashboard.ui-manifest.json)
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

Export Attendance summary report
    [Documentation]    US-08-04 — Reused from: grade_export.feature
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
a Class with ID "${class_id}" exists with several Students and GradeRecords
    [Documentation]    Pre-condition: verify class exists and seeded data is present.
    ${resp}=    GET On Session    score_api
    ...    /semesters/${SEMESTER_ID}/classes/${class_id}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

a Student with ID "${student_id}" has no GradeRecord for GradeItem "${item_id}"
    [Documentation]    Pre-condition: ensure no grade record exists for the pair.
    ${resp}=    GET On Session    score_api    /grade-records    params=student_id=${student_id}&grade_item_id=${item_id}    expected_status=any

the GradeItems in Class "${class_id}" have a total weight of 80
    [Documentation]    Pre-condition: seed items summing to 80%.
    ${items_base}=    Set Variable    /semesters/${SEMESTER_ID}/classes/${class_id}/grade-items
    ${payload1}=    Create Dictionary    item_name=Assignment A    item_type=ASSIGNMENT    max_score=100    weight=40
    POST On Session    score_api    ${items_base}    json=${payload1}    expected_status=any
    ${payload2}=    Create Dictionary    item_name=Report B    item_type=REPORT    max_score=100    weight=40
    POST On Session    score_api    ${items_base}    json=${payload2}    expected_status=any

a GraphQL query is made for the Grade Summary of Class "${class_id}"
    [Documentation]    POST /graphql — grade summary matrix
    ...    UI locator: score-summary-table (score-preview-dashboard.ui-manifest.json)
    ${query}=    Set Variable
    ...    { gradeSummary(classId: "${class_id}") { student_id student_number student_name grade_records weighted_total_score weight_warning } }
    ${payload}=    Create Dictionary    query=${query}
    ${resp}=    POST On Session    score_api    ${GRAPHQL_ENDPOINT}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to exportGrades endpoint with format "${format}"
    [Documentation]    POST /semesters/{id}/classes/{id}:exportGrades
    ...    UI locator: export-xlsx-trigger (score-preview-dashboard.ui-manifest.json)
    ${payload}=    Create Dictionary    format=${format}
    ${resp}=    POST On Session    score_api
    ...    /semesters/${SEMESTER_ID}/classes/${CLASS_ID}:exportGrades
    ...    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to exportGrades endpoint for nonexistent class with format "${format}"
    ${payload}=    Create Dictionary    format=${format}
    ${resp}=    POST On Session    score_api
    ...    /semesters/${SEMESTER_ID}/classes/${NONEXIST_CLASS_ID}:exportGrades
    ...    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to exportAttendance endpoint with format "${format}"
    [Documentation]    POST /semesters/{id}/classes/{id}:exportAttendance
    ${payload}=    Create Dictionary    format=${format}
    ${resp}=    POST On Session    score_api
    ...    /semesters/${SEMESTER_ID}/classes/${CLASS_ID}:exportAttendance
    ...    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

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
    [Documentation]    Σ(score / max_score × weight) — validated per row.
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
        IF    '${row}[student_id]' == '${STUDENT_ID}'
            Should Not Be Equal    ${row}[weighted_total_score]    ${None}
        END
    END

the response should contain a "weight_warning" flag set to true
    ${body}=    Set Variable    ${RESPONSE.json()}
    ${data}=    Set Variable    ${body}[data][gradeSummary]
    Should Not Be Empty    ${data}
    Should Be True    ${data}[0][weight_warning]

the response body should contain "file_name" matching export pattern with extension "${ext}"
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    file_name
    Should Match Regexp    ${body}[file_name]    .+_成績報表_\\d{4}-\\d{2}-\\d{2}\\.${ext}$

the exported report should only include GradeItems of type ATTENDANCE
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    status
    Should Be Equal As Strings    ${body}[status]    COMPLETED

the response body should indicate the export includes required attendance columns
    ${body}=    Convert To String    ${RESPONSE.json()}
    Should Contain Any    ${body}    student_number    student_name    present_count    absent_count    excused_count
