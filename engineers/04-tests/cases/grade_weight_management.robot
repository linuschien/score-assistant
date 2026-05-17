*** Settings ***
Documentation       Feature: Grade Weight Management
...                 Source Feature : docs/02-design-specs/behavior-specs/user/grade_weight_management.feature
...                 Upstream Req   : US-07-grade-weight-management.md
...                 UI Manifests   : grade-weight-dashboard.ui-manifest.json, grade-item-list.ui-manifest.json

Library             RequestsLibrary
Library             Collections

Suite Setup         Create Session    score_api    ${BASE_URL}    verify=True
Suite Teardown      Delete All Sessions

*** Variables ***
${BASE_URL}             http://localhost:8080
${SEMESTER_ID}          d3b07384-d113-404c-9f8a-020524032a9a
${CLASS_ID}             c81d4e2e-bcf2-4b2a-8c81-8b1e428df13a
${ITEM_ID_1}            f4e3d2c1-b0a9-8f7e-6d5c-4b3a2f1e0d9c
${ITEM_ID_2}            e5f4d3c2-b1a0-9e8d-7c6b-5a4b3c2d1e0f
${NONEXIST_ID}          00000000-0000-0000-0000-000000000000
${GRAPHQL_ENDPOINT}     /graphql
${ITEMS_BASE}           /semesters/${SEMESTER_ID}/classes/${CLASS_ID}/grade-items

*** Test Cases ***
Update weight for a single GradeItem — valid weight 25 returns 200
    [Documentation]    US-07-01 — Reused from: grade_weight_management.feature
    Given the background GradeItems exist in the Class
    When a PATCH request is made to grade-item "${ITEM_ID_1}" with weight 25
    Then the response code should be 200
    And the weight for GradeItem "${ITEM_ID_1}" should be 25

Update weight for a single GradeItem — negative weight returns 400
    [Documentation]    US-07-01 — Reused from: grade_weight_management.feature
    Given the background GradeItems exist in the Class
    When a PATCH request is made to grade-item "${ITEM_ID_1}" with weight -5
    Then the response code should be 400

Update weight for a non-existent GradeItem returns 404
    [Documentation]    US-07-01 — Reused from: grade_weight_management.feature
    When a PATCH request is made to grade-item "${NONEXIST_ID}" with weight 10
    Then the response code should be 404

Allow saving weight when total is not 100% with a warning
    [Documentation]    US-07-01 AC2 — Reused from: grade_weight_management.feature
    ...    UI locator: weight-input → total-weight-indicator, save-weights-trigger (grade-weight-dashboard)
    Given the background GradeItems exist in the Class
    When a PATCH request is made to grade-item "${ITEM_ID_1}" with weight 10
    Then the response code should be 200
    And the response body should contain "total_weight" not equal to 100
    And the response body should contain a "weight_warning" flag set to true

View weight distribution summary via GraphQL
    [Documentation]    US-07-02 — Reused from: grade_weight_management.feature
    ...    UI locator: weight-distribution-chart, weight-editor-table (grade-weight-dashboard)
    Given the background GradeItems exist in the Class
    When a GraphQL query is made for GradeItems in Class "${CLASS_ID}" with weight fields
    Then the response should contain a list of GradeItems with their weight values
    And the response should include the aggregated "total_weight" for the Class

Calculate weighted scores for all Students in a Class
    [Documentation]    US-07-02 AC4 — Reused from: grade_weight_management.feature
    Given all GradeItems in the Class have weights assigned and the total weight equals 100
    When a POST request is made to calculateWeightedScores endpoint with passing_threshold 60
    Then the response code should be 200
    And the response body should contain "status" equal to "COMPLETED"

Warn when total weight is not 100% during calculation
    [Documentation]    US-07-01 AC2 — Reused from: grade_weight_management.feature
    ...    UI locator: total-weight-indicator (grade-weight-dashboard)
    Given the GradeItems in the Class have a total weight of 90
    When a POST request is made to calculateWeightedScores endpoint with passing_threshold 60
    Then the response code should be 200
    And the response body should contain a "weight_warning" flag set to true

*** Keywords ***
the background GradeItems exist in the Class
    [Documentation]    Seed: Assignment 1 (weight 20) and Midterm Exam (weight 30).
    ${payload1}=    Create Dictionary    item_name=Assignment 1    item_type=ASSIGNMENT    max_score=100    weight=20
    POST On Session    score_api    ${ITEMS_BASE}    json=${payload1}    expected_status=any
    ${payload2}=    Create Dictionary    item_name=Midterm Exam    item_type=REPORT    max_score=100    weight=30
    POST On Session    score_api    ${ITEMS_BASE}    json=${payload2}    expected_status=any

all GradeItems in the Class have weights assigned and the total weight equals 100
    [Documentation]    Seed items so total weight = 100.
    ${payload1}=    Create Dictionary    item_name=Assignment 1    item_type=ASSIGNMENT    max_score=100    weight=50
    POST On Session    score_api    ${ITEMS_BASE}    json=${payload1}    expected_status=any
    ${payload2}=    Create Dictionary    item_name=Midterm Exam    item_type=REPORT    max_score=100    weight=50
    POST On Session    score_api    ${ITEMS_BASE}    json=${payload2}    expected_status=any

the GradeItems in the Class have a total weight of 90
    [Documentation]    Seed items so total weight = 90.
    ${payload1}=    Create Dictionary    item_name=Assignment 1    item_type=ASSIGNMENT    max_score=100    weight=40
    POST On Session    score_api    ${ITEMS_BASE}    json=${payload1}    expected_status=any
    ${payload2}=    Create Dictionary    item_name=Midterm Exam    item_type=REPORT    max_score=100    weight=50
    POST On Session    score_api    ${ITEMS_BASE}    json=${payload2}    expected_status=any

a PATCH request is made to grade-item "${item_id}" with weight ${weight}
    [Documentation]    PATCH /semesters/{id}/classes/{id}/grade-items/{id}
    ...    UI locator: weight-input, save-weights-trigger (grade-weight-dashboard.ui-manifest.json)
    ${payload}=    Create Dictionary    weight=${weight}
    ${resp}=    PATCH On Session    score_api    ${ITEMS_BASE}/${item_id}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GraphQL query is made for GradeItems in Class "${class_id}" with weight fields
    [Documentation]    POST /graphql — weight distribution query
    ...    UI locator: weight-distribution-chart (grade-weight-dashboard)
    ${query}=    Set Variable
    ...    { gradeItemsByClass(classId: "${class_id}") { grade_item_id item_name item_type weight } totalWeight(classId: "${class_id}") }
    ${payload}=    Create Dictionary    query=${query}
    ${resp}=    POST On Session    score_api    ${GRAPHQL_ENDPOINT}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to calculateWeightedScores endpoint with passing_threshold ${threshold}
    [Documentation]    POST /semesters/{id}/classes/{id}:calculateWeightedScores
    ${payload}=    Create Dictionary    passing_threshold=${threshold}
    ${resp}=    POST On Session    score_api
    ...    /semesters/${SEMESTER_ID}/classes/${CLASS_ID}:calculateWeightedScores
    ...    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

the response code should be ${expected_code}
    Should Be Equal As Strings    ${RESPONSE.status_code}    ${expected_code}

the response body should contain "${field}" equal to "${value}"
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    ${field}
    Should Be Equal As Strings    ${body}[${field}]    ${value}

the weight for GradeItem "${item_id}" should be ${expected_weight}
    ${resp}=    GET On Session    score_api    ${ITEMS_BASE}/${item_id}    expected_status=any
    Should Be Equal As Numbers    ${resp.json()}[weight]    ${expected_weight}

the response body should contain "total_weight" not equal to 100
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    total_weight
    Should Not Be Equal As Numbers    ${body}[total_weight]    100

the response body should contain a "weight_warning" flag set to true
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    weight_warning
    Should Be True    ${body}[weight_warning]

the response should contain a list of GradeItems with their weight values
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    data
    Dictionary Should Contain Key    ${body}[data]    gradeItemsByClass
    ${items}=    Set Variable    ${body}[data][gradeItemsByClass]
    Should Not Be Empty    ${items}
    FOR    ${item}    IN    @{items}
        Dictionary Should Contain Key    ${item}    weight
    END

the response should include the aggregated "total_weight" for the Class
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}[data]    totalWeight
    Should Not Be Empty    ${body}[data][totalWeight]
