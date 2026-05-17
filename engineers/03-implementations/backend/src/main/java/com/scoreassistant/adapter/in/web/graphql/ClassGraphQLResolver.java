package com.scoreassistant.adapter.in.web.graphql;

import com.scoreassistant.adapter.in.web.dto.ClassDto.ClassResponse;
import com.scoreassistant.application.service.ClassService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Flux;

import java.util.UUID;

@Controller
public class ClassGraphQLResolver {

    private final ClassService classService;

    public ClassGraphQLResolver(ClassService classService) {
        this.classService = classService;
    }

    @QueryMapping
    public Flux<ClassResponse> listClasses(@Argument ClassFilterInput filter) {
        UUID semesterId = filter != null && filter.semesterId() != null ? UUID.fromString(filter.semesterId()) : null;
        String className = filter != null ? filter.className() : null;
        return classService.listAll(semesterId, className);
    }

    public record ClassFilterInput(String semesterId, String className) {}
}
