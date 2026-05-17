package com.scoreassistant.adapter.in.web.graphql;

import com.scoreassistant.adapter.in.web.dto.GradeItemDto.GradeItemResponse;
import com.scoreassistant.application.service.GradeItemService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Flux;

import java.util.UUID;

@Controller
public class GradeItemGraphQLResolver {

    private final GradeItemService gradeItemService;

    public GradeItemGraphQLResolver(GradeItemService gradeItemService) {
        this.gradeItemService = gradeItemService;
    }

    @QueryMapping
    public Flux<GradeItemResponse> listGradeItems(@Argument GradeItemFilterInput filter) {
        UUID classId  = filter != null && filter.classId()  != null ? UUID.fromString(filter.classId())  : null;
        String type   = filter != null ? filter.itemType() : null;
        return gradeItemService.listAll(classId, type);
    }

    public record GradeItemFilterInput(String classId, String itemType) {}
}
