package com.scoreassistant.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public sealed interface StudentDto permits
        StudentDto.StudentRequest,
        StudentDto.StudentPatchRequest,
        StudentDto.StudentResponse {

    record StudentRequest(
            @NotBlank String studentId,
            @NotNull Integer studentNumber,
            @NotBlank String studentName,
            @NotBlank @jakarta.validation.constraints.Email String email
    ) implements StudentDto {}

    record StudentPatchRequest(
            String studentId,
            Integer studentNumber,
            String studentName,
            String email
    ) implements StudentDto {}

    record StudentResponse(
            String id,
            String classId,
            String studentId,
            int studentNumber,
            String studentName,
            String email
    ) implements StudentDto {}
}
