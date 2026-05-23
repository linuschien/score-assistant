package com.scoreassistant.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public sealed interface StudentDto permits
        StudentDto.StudentRequest,
        StudentDto.StudentPatchRequest,
        StudentDto.StudentResponse {

    record StudentRequest(
            @NotNull Integer studentNumber,
            @NotBlank String studentName
    ) implements StudentDto {}

    record StudentPatchRequest(
            Integer studentNumber,
            String studentName
    ) implements StudentDto {}

    record StudentResponse(
            String id,
            String classId,
            int studentNumber,
            String studentName
    ) implements StudentDto {}
}
