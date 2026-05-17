package com.scoreassistant.adapter.in.web.graphql;

import com.scoreassistant.adapter.in.web.dto.SemesterDto.SemesterResponse;
import com.scoreassistant.application.service.SemesterService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Flux;

@Controller
public class SemesterGraphQLResolver {

    private final SemesterService semesterService;

    public SemesterGraphQLResolver(SemesterService semesterService) {
        this.semesterService = semesterService;
    }

    @QueryMapping
    public Flux<SemesterResponse> listSemesters(@Argument SemesterFilterInput filter) {
        String name = filter != null ? filter.semesterName() : null;
        return semesterService.listAll(name);
    }

    public record SemesterFilterInput(String semesterName) {}
}
