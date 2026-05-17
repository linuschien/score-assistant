package com.scoreassistant.adapter.out.persistence;

import com.scoreassistant.domain.model.GradeRecordEntity;
import org.springframework.data.r2dbc.mapping.event.BeforeConvertCallback;
import org.springframework.data.relational.core.sql.SqlIdentifier;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class GradeRecordBeforeConvertCallback implements BeforeConvertCallback<GradeRecordEntity> {

    @Override
    public Mono<GradeRecordEntity> onBeforeConvert(GradeRecordEntity entity, SqlIdentifier table) {
        if (entity.id() == null) {
            return Mono.just(new GradeRecordEntity(
                    UUID.randomUUID(),
                    entity.gradeItemId(),
                    entity.studentId(),
                    entity.score(),
                    entity.lastModifiedAt(),
                    entity.version(),
                    entity.createdAt(),
                    entity.updatedAt(),
                    entity.deletedAt()
            ));
        }
        return Mono.just(entity);
    }
}
