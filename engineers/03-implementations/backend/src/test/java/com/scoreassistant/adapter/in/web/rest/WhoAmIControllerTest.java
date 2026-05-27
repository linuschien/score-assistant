package com.scoreassistant.adapter.in.web.rest;

import com.scoreassistant.adapter.in.web.dto.WhoAmIDto.WhoAmIResponse;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.reactive.server.WebTestClient;

import static org.assertj.core.api.Assertions.assertThat;

class WhoAmIControllerTest {

    private final WebTestClient webTestClient = WebTestClient
            .bindToController(new WhoAmIController())
            .build();

    @Test
    void shouldReturnDefaultDevUserWhenNoHeadersProvided() {
        webTestClient.get()
                .uri("/api/whoami")
                .exchange()
                .expectStatus().isOk()
                .expectBody(WhoAmIResponse.class)
                .value(response -> {
                    assertThat(response.email()).isEqualTo("dev-user@example.com");
                });
    }

    @Test
    void shouldReturnIapUserWhenIapHeadersAreProvided() {
        webTestClient.get()
                .uri("/api/v1/whoami")
                .header("x-goog-authenticated-user-email", "accounts.google.com:linus@example.com")
                .exchange()
                .expectStatus().isOk()
                .expectBody(WhoAmIResponse.class)
                .value(response -> {
                    assertThat(response.email()).isEqualTo("linus@example.com");
                });
    }
}
