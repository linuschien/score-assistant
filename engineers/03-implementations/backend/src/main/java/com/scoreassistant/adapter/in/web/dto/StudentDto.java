package com.scoreassistant.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public sealed interface StudentDto permits
        StudentDto.StudentRequest,
        StudentDto.StudentPatchRequest,
        StudentDto.StudentResponse {

    record StudentRequest(
            @NotNull Integer student_number,
            @NotBlank String student_name
    ) implements StudentDto {}

    record StudentPatchRequest(
            Integer student_number,
            String student_name
    ) implements StudentDto {}

    record StudentResponse(
            String id,
            int student_number,
            String student_name
    ) implements StudentDto {}
}
