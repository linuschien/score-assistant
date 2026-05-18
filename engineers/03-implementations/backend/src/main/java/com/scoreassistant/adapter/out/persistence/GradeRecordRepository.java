package com.scoreassistant.adapter.out.persistence;

import com.scoreassistant.domain.model.GradeRecordEntity;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Repository
public interface GradeRecordRepository extends R2dbcRepository<GradeRecordEntity, UUID> {

    @Query("""
            SELECT gr.* FROM grade_record gr
            INNER JOIN grade_item gi ON gr.grade_item_id = gi.id
            WHERE gi.class_id = :classId AND gr.deleted = false
            """)
    Flux<GradeRecordEntity> findByClassId(UUID classId);
}
