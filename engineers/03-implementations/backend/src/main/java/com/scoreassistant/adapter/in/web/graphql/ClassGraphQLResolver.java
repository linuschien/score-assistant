package com.scoreassistant.adapter.in.web.graphql;

import com.scoreassistant.adapter.in.web.dto.ClassDto.ClassResponse;
import com.scoreassistant.application.service.ClassService;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Flux;

import java.math.BigDecimal;
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
        String classGroup = filter != null ? filter.classGroup() : null;
        return classService.listAll(semesterId, className, classGroup);
    }

    @SchemaMapping(typeName = "Class", field = "semesterId")
    public String semesterId(ClassResponse cls) {
        return cls.semesterId();
    }

    @SchemaMapping(typeName = "Class", field = "className")
    public String className(ClassResponse cls) {
        return cls.className();
    }

    @SchemaMapping(typeName = "Class", field = "passingThreshold")
    public BigDecimal passingThreshold(ClassResponse cls) {
        return cls.passingThreshold();
    }

    @SchemaMapping(typeName = "Class", field = "classGroup")
    public String classGroup(ClassResponse cls) {
        return cls.classGroup();
    }

    public record ClassFilterInput(String semesterId, String className, String classGroup) {}
}
