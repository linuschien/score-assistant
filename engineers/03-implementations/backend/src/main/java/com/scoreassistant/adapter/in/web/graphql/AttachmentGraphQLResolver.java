package com.scoreassistant.adapter.in.web.graphql;

import com.scoreassistant.adapter.in.web.dto.AttachmentDto.AttachmentResponse;
import com.scoreassistant.application.service.AttachmentService;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
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

    @SchemaMapping(typeName = "Attachment", field = "gradeRecordId")
    public String gradeRecordId(AttachmentResponse att) {
        return att.gradeRecordId();
    }

    @SchemaMapping(typeName = "Attachment", field = "fileName")
    public String fileName(AttachmentResponse att) {
        return att.fileName();
    }

    @SchemaMapping(typeName = "Attachment", field = "mimeType")
    public String mimeType(AttachmentResponse att) {
        return att.mimeType();
    }

    @SchemaMapping(typeName = "Attachment", field = "fileSize")
    public int fileSize(AttachmentResponse att) {
        return att.fileSize();
    }

    @SchemaMapping(typeName = "Attachment", field = "uploadedAt")
    public String uploadedAt(AttachmentResponse att) {
        return att.uploadedAt().toString();
    }

    public record AttachmentFilterInput(String gradeRecordId) {}
}
