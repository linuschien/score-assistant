package com.scoreassistant.adapter.in.web.graphql;

import com.scoreassistant.adapter.in.web.dto.GradeItemDto.GradeItemResponse;
import com.scoreassistant.application.service.GradeItemService;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Flux;

import java.math.BigDecimal;
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

    @SchemaMapping(typeName = "GradeItem", field = "classId")
    public String classId(GradeItemResponse item) {
        return item.classId();
    }

    @SchemaMapping(typeName = "GradeItem", field = "itemName")
    public String itemName(GradeItemResponse item) {
        return item.itemName();
    }

    @SchemaMapping(typeName = "GradeItem", field = "itemType")
    public String itemType(GradeItemResponse item) {
        return item.itemType();
    }

    @SchemaMapping(typeName = "GradeItem", field = "itemDate")
    public String itemDate(GradeItemResponse item) {
        return item.itemDate() != null ? item.itemDate().toString() : null;
    }

    @SchemaMapping(typeName = "GradeItem", field = "itemDescription")
    public String itemDescription(GradeItemResponse item) {
        return item.itemDescription();
    }

    @SchemaMapping(typeName = "GradeItem", field = "maxScore")
    public BigDecimal maxScore(GradeItemResponse item) {
        return item.maxScore();
    }

    @SchemaMapping(typeName = "GradeItem", field = "weight")
    public BigDecimal weight(GradeItemResponse item) {
        return item.weight();
    }

    public record GradeItemFilterInput(String classId, String itemType) {}
}
