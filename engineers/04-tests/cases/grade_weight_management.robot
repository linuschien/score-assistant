*** Settings ***
Documentation       Feature: Grade Weight Management
...                 Source Feature : docs/02-design-specs/behavior-specs/user/grade_weight_management.feature
...                 Upstream Req   : US-07-grade-weight-management.md
...                 UI Manifests   : grade-weight-dashboard.ui-manifest.json, grade-item-list.ui-manifest.json

Library             RequestsLibrary
Library             Collections

Suite Setup         Initialize Grade Weight Suite
Suite Teardown      Cleanup Grade Weight Suite

*** Variables ***
${BASE_URL}             http://localhost:8080
${GRAPHQL_ENDPOINT}     /graphql
# Populated dynamically in Suite Setup — never hardcoded
${SEMESTER_ID}          ${EMPTY}
${CLASS_ID}             ${EMPTY}
${ITEM_ID_1}            ${EMPTY}
${ITEM_ID_2}            ${EMPTY}
${ITEMS_BASE}           ${EMPTY}

*** Test Cases ***
# ---------------------------------------------------------------------------
# US-07-01: Update weight for a single GradeItem — Scenario Outline
# ---------------------------------------------------------------------------
Update weight for a single GradeItem — valid weight 25 returns 200
    [Documentation]    US-07-01 — Reused from: grade_weight_management.feature
    ...                UI: weight-input, save-weights-trigger (grade-weight-dashboard.ui-manifest.json)
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
    When a PATCH request is made to grade-item "00000000-0000-0000-0000-000000000000" with weight 10
    Then the response code should be 404

# ---------------------------------------------------------------------------
# US-07-01 AC2: Allow saving when total ≠ 100% — with warning
# ---------------------------------------------------------------------------
Allow saving weight when total is not 100% with a warning
    [Documentation]    US-07-01 AC2 — Reused from: grade_weight_management.feature
    ...                UI: weight-input → total-weight-indicator, save-weights-trigger (grade-weight-dashboard)
    Given the background GradeItems exist in the Class
    When a PATCH request is made to grade-item "${ITEM_ID_1}" with weight 10
    Then the response code should be 200
    And the response body should contain "totalWeight" not equal to 100
    And the response body should contain a "weightWarning" flag set to true

# ---------------------------------------------------------------------------
# US-07-02: View weight distribution via GraphQL
# ---------------------------------------------------------------------------
View weight distribution summary via GraphQL
    [Documentation]    US-07-02 — Reused from: grade_weight_management.feature
    ...                UI: weight-distribution-chart, weight-editor-table (grade-weight-dashboard)
    Given the background GradeItems exist in the Class
    When a GraphQL query is made for GradeItems in Class "${CLASS_ID}" with weight fields
    Then the response should contain a list of GradeItems with their weight values
    And the response should include the aggregated "totalWeight" for the Class

# ---------------------------------------------------------------------------
# US-07-02 AC4: Calculate weighted scores (custom action)
# ---------------------------------------------------------------------------
Calculate weighted scores for all Students in a Class
    [Documentation]    US-07-02 AC4 — Reused from: grade_weight_management.feature
    ...                Weights are set to sum = 100 in Suite Setup
    Given all GradeItems in the Class have weights totalling 100
    When a POST request is made to calculateWeightedScores endpoint with passing_threshold 60
    Then the response code should be 200
    And the response body should contain "success" equal to "True"

Warn when total weight is not 100% during calculation
    [Documentation]    US-07-01 AC2 — Reused from: grade_weight_management.feature
    ...                UI: total-weight-indicator (grade-weight-dashboard.ui-manifest.json)
    Given the GradeItems in the Class have a total weight of 90
    When a POST request is made to calculateWeightedScores endpoint with passing_threshold 60
    Then the response code should be 200
    And the response body should contain a "weightWarning" flag set to true

*** Keywords ***
# ---------------------------------------------------------------------------
# Suite Lifecycle
# ---------------------------------------------------------------------------
Initialize Grade Weight Suite
    Create Session    score_api    ${BASE_URL}    verify=True
    # Step 1: Semester
    ${s_resp}=    POST On Session    score_api    /semesters
    ...    json={"semesterName":"AutoTest-WeightSuite-Semester","startDate":"2024-09-01","endDate":"2025-01-31"}
    Should Be Equal As Strings    ${s_resp.status_code}    201
    Set Suite Variable    ${SEMESTER_ID}    ${s_resp.json()}[id]
    # Step 2: Class
    ${c_resp}=    POST On Session    score_api    /semesters/${SEMESTER_ID}/classes
    ...    json={"className":"AutoTest-WeightSuite-Class"}
    Should Be Equal As Strings    ${c_resp.status_code}    201
    Set Suite Variable    ${CLASS_ID}    ${c_resp.json()}[id]
    Set Suite Variable    ${ITEMS_BASE}    /semesters/${SEMESTER_ID}/classes/${CLASS_ID}/grade-items
    # Step 3: GradeItem 1 — Assignment, weight 20
    ${i1_resp}=    POST On Session    score_api    ${ITEMS_BASE}
    ...    json={"itemName":"Assignment 1","itemType":"ASSIGNMENT","maxScore":100,"weight":20}
    Should Be Equal As Strings    ${i1_resp.status_code}    201
    Set Suite Variable    ${ITEM_ID_1}    ${i1_resp.json()}[id]
    # Step 4: GradeItem 2 — Report, weight 30
    ${i2_resp}=    POST On Session    score_api    ${ITEMS_BASE}
    ...    json={"itemName":"Midterm Exam","itemType":"REPORT","maxScore":100,"weight":30}
    Should Be Equal As Strings    ${i2_resp.status_code}    201
    Set Suite Variable    ${ITEM_ID_2}    ${i2_resp.json()}[id]

Cleanup Grade Weight Suite
    DELETE On Session    score_api    /semesters/${SEMESTER_ID}    expected_status=any
    Delete All Sessions

# ---------------------------------------------------------------------------
# Given Steps
# ---------------------------------------------------------------------------
the background GradeItems exist in the Class
    [Documentation]    Verifies the suite items are accessible (already created in Suite Setup).
    ${resp}=    GET On Session    score_api    ${ITEMS_BASE}/${ITEM_ID_1}    expected_status=any
    Should Be Equal As Strings    ${resp.status_code}    200

all GradeItems in the Class have weights totalling 100
    [Documentation]    PATCH both items so that total weight = 100.
    PATCH On Session    score_api    ${ITEMS_BASE}/${ITEM_ID_1}    json={"weight":50}    expected_status=any
    PATCH On Session    score_api    ${ITEMS_BASE}/${ITEM_ID_2}    json={"weight":50}    expected_status=any

the GradeItems in the Class have a total weight of 90
    [Documentation]    PATCH both items so that total weight = 90.
    PATCH On Session    score_api    ${ITEMS_BASE}/${ITEM_ID_1}    json={"weight":40}    expected_status=any
    PATCH On Session    score_api    ${ITEMS_BASE}/${ITEM_ID_2}    json={"weight":50}    expected_status=any

# ---------------------------------------------------------------------------
# When Steps
# ---------------------------------------------------------------------------
a PATCH request is made to grade-item "${item_id}" with weight ${weight}
    [Documentation]    PATCH /semesters/{id}/classes/{id}/grade-items/{id}
    ...    UI: weight-input, save-weights-trigger (grade-weight-dashboard.ui-manifest.json)
    ${payload}=    Create Dictionary    weight=${weight}
    ${resp}=    PATCH On Session    score_api    ${ITEMS_BASE}/${item_id}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a GraphQL query is made for GradeItems in Class "${class_id}" with weight fields
    [Documentation]    POST /graphql — weight distribution
    ...    UI: weight-distribution-chart (grade-weight-dashboard.ui-manifest.json)
    ${query}=    Set Variable
    ...    { listGradeItems(filter: { classId: "${class_id}" }) { id itemName itemType weight } }
    ${payload}=    Create Dictionary    query=${query}
    ${resp}=    POST On Session    score_api    ${GRAPHQL_ENDPOINT}    json=${payload}    expected_status=any
    Set Test Variable    ${RESPONSE}    ${resp}

a POST request is made to calculateWeightedScores endpoint with passing_threshold ${threshold}
    [Documentation]    POST /semesters/{id}/classes/{id}:calculateWeightedScores
    ${payload}=    Create Dictionary    classId=${CLASS_ID}
    ${resp}=    POST On Session    score_api
    ...    /semesters/${SEMESTER_ID}/classes/${CLASS_ID}:calculateWeightedScores
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

the weight for GradeItem "${item_id}" should be ${expected_weight}
    ${resp}=    GET On Session    score_api    ${ITEMS_BASE}/${item_id}    expected_status=any
    Should Be Equal As Numbers    ${resp.json()}[weight]    ${expected_weight}

the response body should contain "totalWeight" not equal to 100
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    totalWeight
    Should Not Be Equal As Numbers    ${body}[totalWeight]    100

the response body should contain a "weightWarning" flag set to true
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    weightWarning
    Should Be True    ${body}[weightWarning]

the response should contain a list of GradeItems with their weight values
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}    data
    Dictionary Should Contain Key    ${body}[data]    listGradeItems
    ${items}=    Set Variable    ${body}[data][listGradeItems]
    Should Not Be Empty    ${items}
    FOR    ${item}    IN    @{items}
        Dictionary Should Contain Key    ${item}    weight
    END

the response should include the aggregated "totalWeight" for the Class
    ${body}=    Set Variable    ${RESPONSE.json()}
    Dictionary Should Contain Key    ${body}[data]    listGradeItems
    Should Not Be Empty    ${body}[data][listGradeItems]
