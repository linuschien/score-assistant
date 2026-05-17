package com.scoreassistant.adapter.out.persistence;

import com.scoreassistant.domain.model.StudentEntity;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

import java.util.UUID;

@Repository
public interface StudentRepository extends R2dbcRepository<StudentEntity, UUID> {

    @Query("SELECT * FROM student WHERE class_id = :classId AND deleted_at IS NULL")
    Flux<StudentEntity> findByClassId(UUID classId);

    @Query("SELECT * FROM student WHERE class_id = :classId AND deleted_at IS NULL ORDER BY student_number")
    Flux<StudentEntity> findByClassIdOrdered(UUID classId);
}
