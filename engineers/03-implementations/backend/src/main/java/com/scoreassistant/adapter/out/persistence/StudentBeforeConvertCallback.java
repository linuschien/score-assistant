package com.scoreassistant.adapter.out.persistence;

import com.scoreassistant.domain.model.StudentEntity;
import org.springframework.data.r2dbc.mapping.event.BeforeConvertCallback;
import org.springframework.data.relational.core.sql.SqlIdentifier;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class StudentBeforeConvertCallback implements BeforeConvertCallback<StudentEntity> {

    @Override
    public Mono<StudentEntity> onBeforeConvert(StudentEntity entity, SqlIdentifier table) {
        if (entity.id() == null) {
            return Mono.just(new StudentEntity(
                    UUID.randomUUID(),
                    entity.classId(),
                    entity.studentNumber(),
                    entity.studentName(),
                    entity.createdAt(),
                    entity.updatedAt(),
                    entity.deleted(),
                    entity.deletedAt()
            ));
        }
        return Mono.just(entity);
    }
}
