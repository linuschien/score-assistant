package com.scoreassistant.adapter.out.persistence;

import com.scoreassistant.domain.model.GradeItemEntity;
import org.springframework.data.r2dbc.mapping.event.BeforeConvertCallback;
import org.springframework.data.relational.core.sql.SqlIdentifier;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class GradeItemBeforeConvertCallback implements BeforeConvertCallback<GradeItemEntity> {

    @Override
    public Mono<GradeItemEntity> onBeforeConvert(GradeItemEntity entity, SqlIdentifier table) {
        if (entity.id() == null) {
            return Mono.just(new GradeItemEntity(
                    UUID.randomUUID(),
                    entity.classId(),
                    entity.itemName(),
                    entity.itemType(),
                    entity.itemDate(),
                    entity.itemDescription(),
                    entity.maxScore(),
                    entity.weight(),
                    entity.createdAt(),
                    entity.updatedAt(),
                    entity.deletedAt()
            ));
        }
        return Mono.just(entity);
    }
}
