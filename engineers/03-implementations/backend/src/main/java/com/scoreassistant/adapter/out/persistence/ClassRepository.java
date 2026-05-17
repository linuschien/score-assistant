package com.scoreassistant.adapter.out.persistence;

import com.scoreassistant.domain.model.ClassEntity;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

import java.util.UUID;

@Repository
public interface ClassRepository extends R2dbcRepository<ClassEntity, UUID> {

    @Query("SELECT * FROM class WHERE deleted_at IS NULL")
    Flux<ClassEntity> findAllActive();

    @Query("SELECT * FROM class WHERE semester_id = :semesterId AND deleted_at IS NULL")
    Flux<ClassEntity> findBySemesterId(UUID semesterId);

    @Query("SELECT * FROM class WHERE semester_id = :semesterId AND LOWER(class_name) LIKE LOWER(CONCAT('%', :name, '%')) AND deleted_at IS NULL")
    Flux<ClassEntity> findBySemesterIdAndNameContaining(UUID semesterId, String name);
}
