package com.scoreassistant.adapter.in.web.graphql;

import com.scoreassistant.adapter.in.web.dto.StudentDto.StudentResponse;
import com.scoreassistant.application.service.StudentService;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Flux;

import java.util.UUID;

@Controller
public class StudentGraphQLResolver {

    private final StudentService studentService;

    public StudentGraphQLResolver(StudentService studentService) {
        this.studentService = studentService;
    }

    @QueryMapping
    public Flux<StudentResponse> listStudents(@Argument StudentFilterInput filter) {
        UUID classId = filter != null && filter.classId() != null ? UUID.fromString(filter.classId()) : null;
        return studentService.listAll(classId);
    }

    @SchemaMapping(typeName = "Student", field = "classId")
    public String classId(StudentResponse student) {
        return student.classId();
    }

    @SchemaMapping(typeName = "Student", field = "studentNumber")
    public int studentNumber(StudentResponse student) {
        return student.studentNumber();
    }

    @SchemaMapping(typeName = "Student", field = "studentName")
    public String studentName(StudentResponse student) {
        return student.studentName();
    }

    public record StudentFilterInput(String classId) {}
}
