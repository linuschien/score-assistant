package com.scoreassistant.adapter.in.web.graphql;

import com.scoreassistant.adapter.in.web.dto.AttachmentDto.AttachmentResponse;
import com.scoreassistant.application.service.AttachmentService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Flux;

import java.util.UUID;

@Controller
public class AttachmentGraphQLResolver {

    private final AttachmentService attachmentService;

    public AttachmentGraphQLResolver(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @QueryMapping
    public Flux<AttachmentResponse> listAttachments(@Argument AttachmentFilterInput filter) {
        UUID gradeRecordId = filter != null && filter.gradeRecordId() != null
                ? UUID.fromString(filter.gradeRecordId()) : null;
        return attachmentService.listAll(gradeRecordId);
    }

    public record AttachmentFilterInput(String gradeRecordId) {}
}
