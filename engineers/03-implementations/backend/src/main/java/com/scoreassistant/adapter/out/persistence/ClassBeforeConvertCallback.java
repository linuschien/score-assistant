package com.scoreassistant.adapter.out.persistence;

import com.scoreassistant.domain.model.ClassEntity;
import org.springframework.data.r2dbc.mapping.event.BeforeConvertCallback;
import org.springframework.data.relational.core.sql.SqlIdentifier;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class ClassBeforeConvertCallback implements BeforeConvertCallback<ClassEntity> {

    @Override
    public Mono<ClassEntity> onBeforeConvert(ClassEntity entity, SqlIdentifier table) {
        if (entity.id() == null) {
            return Mono.just(new ClassEntity(
                    UUID.randomUUID(),
                    entity.semesterId(),
                    entity.className(),
                    entity.passingThreshold(),
                    entity.createdAt(),
                    entity.updatedAt(),
                    entity.deletedAt()
            ));
        }
        return Mono.just(entity);
    }
}
