package com.scoreassistant.adapter.in.web.graphql;

import com.scoreassistant.adapter.in.web.dto.GradeRecordDto.GradeRecordResponse;
import com.scoreassistant.application.service.GradeRecordService;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Flux;

import java.math.BigDecimal;
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

    @SchemaMapping(typeName = "GradeRecord", field = "gradeItemId")
    public String gradeItemId(GradeRecordResponse record) {
        return record.gradeItemId();
    }

    @SchemaMapping(typeName = "GradeRecord", field = "studentId")
    public String studentId(GradeRecordResponse record) {
        return record.studentId();
    }

    @SchemaMapping(typeName = "GradeRecord", field = "score")
    public BigDecimal score(GradeRecordResponse record) {
        return record.score();
    }

    @SchemaMapping(typeName = "GradeRecord", field = "lastModifiedAt")
    public String lastModifiedAt(GradeRecordResponse record) {
        return record.lastModifiedAt() != null ? record.lastModifiedAt().toString() : null;
    }

    public record GradeRecordFilterInput(String gradeItemId, String studentId) {}
}
