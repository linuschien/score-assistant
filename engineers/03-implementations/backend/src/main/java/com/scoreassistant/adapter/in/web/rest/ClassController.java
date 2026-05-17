package com.scoreassistant.adapter.in.web.rest;

import com.scoreassistant.adapter.in.web.dto.ClassDto.*;
import com.scoreassistant.application.service.ClassService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/semesters/{semesterId}/classes")
public class ClassController {

    private final ClassService classService;

    public ClassController(ClassService classService) {
        this.classService = classService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<ClassResponse> createClass(
            @PathVariable UUID semesterId,
            @Valid @RequestBody ClassRequest req) {
        return classService.create(semesterId, req);
    }

    @GetMapping("/{classId}")
    public Mono<ClassResponse> getClassById(
            @PathVariable UUID semesterId,
            @PathVariable UUID classId) {
        return classService.findById(classId);
    }

    @PutMapping("/{classId}")
    public Mono<ClassResponse> updateClass(
            @PathVariable UUID semesterId,
            @PathVariable UUID classId,
            @Valid @RequestBody ClassRequest req) {
        return classService.update(classId, req);
    }

    @PatchMapping("/{classId}")
    public Mono<ClassResponse> patchClass(
            @PathVariable UUID semesterId,
            @PathVariable UUID classId,
            @RequestBody ClassPatchRequest req) {
        return classService.patch(classId, req);
    }

    @DeleteMapping("/{classId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> deleteClass(
            @PathVariable UUID semesterId,
            @PathVariable UUID classId) {
        return classService.delete(classId);
    }
}
