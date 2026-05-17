package com.scoreassistant.adapter.out.persistence;

import com.scoreassistant.domain.model.SemesterEntity;
import org.springframework.data.r2dbc.mapping.event.BeforeConvertCallback;
import org.springframework.data.relational.core.sql.SqlIdentifier;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class SemesterBeforeConvertCallback implements BeforeConvertCallback<SemesterEntity> {

    @Override
    public Mono<SemesterEntity> onBeforeConvert(SemesterEntity entity, SqlIdentifier table) {
        if (entity.id() == null) {
            return Mono.just(new SemesterEntity(
                    UUID.randomUUID(),
                    entity.semesterName(),
                    entity.startDate(),
                    entity.endDate(),
                    entity.createdAt(),
                    entity.updatedAt(),
                    entity.deletedAt()
            ));
        }
        return Mono.just(entity);
    }
}
