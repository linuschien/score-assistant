package com.scoreassistant.adapter.out.persistence;

import com.scoreassistant.domain.model.AttachmentEntity;
import org.springframework.data.r2dbc.mapping.event.BeforeConvertCallback;
import org.springframework.data.relational.core.sql.SqlIdentifier;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class AttachmentBeforeConvertCallback implements BeforeConvertCallback<AttachmentEntity> {

    @Override
    public Mono<AttachmentEntity> onBeforeConvert(AttachmentEntity entity, SqlIdentifier table) {
        if (entity.id() == null) {
            return Mono.just(new AttachmentEntity(
                    UUID.randomUUID(),
                    entity.gradeRecordId(),
                    entity.fileName(),
                    entity.mimeType(),
                    entity.fileSize(),
                    entity.fileData(),
                    entity.uploadedAt(),
                    entity.createdAt(),
                    entity.updatedAt(),
                    entity.deleted(),
                    entity.deletedAt()
            ));
        }
        return Mono.just(entity);
    }
}
