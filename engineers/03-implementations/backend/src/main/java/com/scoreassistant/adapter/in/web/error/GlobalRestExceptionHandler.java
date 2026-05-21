package com.scoreassistant.adapter.in.web.error;

import com.scoreassistant.domain.exception.OptimisticLockingException;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import com.scoreassistant.domain.exception.ValidationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.support.WebExchangeBindException;
import reactor.core.publisher.Mono;

import java.net.URI;

/**
 * Centralized REST exception handler translating domain exceptions
 * into RFC 7807 Problem Details responses.
 */
@RestControllerAdvice
public class GlobalRestExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public Mono<ProblemDetail> handleNotFound(ResourceNotFoundException ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setType(URI.create("urn:scoreassistant:error:not-found"));
        problem.setTitle("Resource Not Found");
        return Mono.just(problem);
    }

    @ExceptionHandler(OptimisticLockingException.class)
    public Mono<ProblemDetail> handleConflict(OptimisticLockingException ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problem.setType(URI.create("urn:scoreassistant:error:conflict"));
        problem.setTitle("Optimistic Locking Conflict");
        problem.setProperty("currentVersion", ex.getCurrentVersion());
        return Mono.just(problem);
    }

    @ExceptionHandler(ValidationException.class)
    public Mono<ProblemDetail> handleValidation(ValidationException ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        problem.setType(URI.create("urn:scoreassistant:error:validation"));
        problem.setTitle("Validation Error");
        return Mono.just(problem);
    }

    @ExceptionHandler(WebExchangeBindException.class)
    public Mono<ProblemDetail> handleBindException(WebExchangeBindException ex) {
        var fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .toList();
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "Request validation failed: " + String.join(", ", fieldErrors));
        problem.setType(URI.create("urn:scoreassistant:error:validation"));
        problem.setTitle("Validation Error");
        return Mono.just(problem);
    }

    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    public Mono<ProblemDetail> handleConstraintViolation(jakarta.validation.ConstraintViolationException ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "Constraint validation failed: " + ex.getMessage());
        problem.setType(URI.create("urn:scoreassistant:error:validation"));
        problem.setTitle("Validation Error");
        return Mono.just(problem);
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public Mono<ProblemDetail> handleDataIntegrity(org.springframework.dao.DataIntegrityViolationException ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "Database integrity violation: " + (ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage()));
        problem.setType(URI.create("urn:scoreassistant:error:validation"));
        problem.setTitle("Database Error");
        return Mono.just(problem);
    }

    @ExceptionHandler(Exception.class)
    public Mono<ProblemDetail> handleGeneric(Exception ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred");
        problem.setType(URI.create("urn:scoreassistant:error:internal"));
        problem.setTitle("Internal Server Error");
        return Mono.just(problem);
    }
}
