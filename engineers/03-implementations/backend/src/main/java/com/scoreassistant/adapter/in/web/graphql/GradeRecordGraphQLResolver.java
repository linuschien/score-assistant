package com.scoreassistant.adapter.in.web.graphql;

import com.scoreassistant.adapter.in.web.dto.GradeRecordDto.GradeRecordResponse;
import com.scoreassistant.application.service.GradeRecordService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Flux;

import java.util.UUID;

@Controller
public class GradeRecordGraphQLResolver {

    private final GradeRecordService gradeRecordService;

    public GradeRecordGraphQLResolver(GradeRecordService gradeRecordService) {
        this.gradeRecordService = gradeRecordService;
    }

    @QueryMapping
    public Flux<GradeRecordResponse> listGradeRecords(@Argument GradeRecordFilterInput filter) {
        UUID gradeItemId = filter != null && filter.gradeItemId() != null ? UUID.fromString(filter.gradeItemId()) : null;
        UUID studentId   = filter != null && filter.studentId()   != null ? UUID.fromString(filter.studentId())   : null;
        return gradeRecordService.listAll(gradeItemId, studentId);
    }

    public record GradeRecordFilterInput(String gradeItemId, String studentId) {}
}
