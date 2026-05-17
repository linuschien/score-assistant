package com.scoreassistant.adapter.out.persistence;

import com.scoreassistant.domain.model.GradeItemEntity;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

import java.util.UUID;

@Repository
public interface GradeItemRepository extends R2dbcRepository<GradeItemEntity, UUID> {

    @Query("SELECT * FROM grade_item WHERE class_id = :classId AND deleted_at IS NULL")
    Flux<GradeItemEntity> findByClassId(UUID classId);

    @Query("SELECT * FROM grade_item WHERE class_id = :classId AND item_type = :itemType AND deleted_at IS NULL")
    Flux<GradeItemEntity> findByClassIdAndItemType(UUID classId, String itemType);
}
