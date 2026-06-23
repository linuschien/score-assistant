package com.scoreassistant.adapter.in.web.rest;

import com.scoreassistant.adapter.in.web.dto.GradeRecordDto.GradeRecordRequest;
import com.scoreassistant.adapter.in.web.dto.GradeRecordDto.GradeRecordResponse;
import com.scoreassistant.application.service.GradeRecordService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyList;

class GradeRecordControllerTest {

    private final GradeRecordService gradeRecordService = Mockito.mock(GradeRecordService.class);
    
    private final WebTestClient webTestClient = WebTestClient
            .bindToController(new GradeRecordController(gradeRecordService))
            .build();

    @Test
    void shouldBatchUpsertGradeRecords() {
        UUID gradeItemId = UUID.randomUUID();
        UUID student1 = UUID.randomUUID();
        UUID student2 = UUID.randomUUID();

        List<GradeRecordRequest> requests = List.of(
                new GradeRecordRequest(gradeItemId, student1, new BigDecimal("100")),
                new GradeRecordRequest(gradeItemId, student2, new BigDecimal("0"))
        );

        GradeRecordResponse response1 = new GradeRecordResponse(
                UUID.randomUUID().toString(), gradeItemId.toString(), student1.toString(), new BigDecimal("100"), LocalDateTime.now(), 0);
        GradeRecordResponse response2 = new GradeRecordResponse(
                UUID.randomUUID().toString(), gradeItemId.toString(), student2.toString(), new BigDecimal("0"), LocalDateTime.now(), 0);

        Mockito.when(gradeRecordService.batchUpsert(anyList()))
               .thenReturn(Flux.just(response1, response2));

        webTestClient.post()
                .uri("/api/v1/grade-records:batchUpsert")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requests)
                .exchange()
                .expectStatus().isCreated()
                .expectBodyList(GradeRecordResponse.class)
                .hasSize(2)
                .contains(response1, response2);
                
        Mockito.verify(gradeRecordService).batchUpsert(anyList());
    }
}
