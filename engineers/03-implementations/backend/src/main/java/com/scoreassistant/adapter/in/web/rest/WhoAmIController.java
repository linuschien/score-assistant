package com.scoreassistant.adapter.in.web.rest;

import com.scoreassistant.adapter.in.web.dto.WhoAmIDto.WhoAmIResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
public class WhoAmIController {

    private static final Logger log = LoggerFactory.getLogger(WhoAmIController.class);

    @GetMapping({"/api/whoami", "/api/v1/whoami"})
    public Mono<WhoAmIResponse> whoami(
            @RequestHeader(value = "x-goog-authenticated-user-email", required = false) String rawUserEmail
    ) {
        // TODO(security): When implementing role-based access control or backend state authorization,
        // verify the Google IAP JWT token ("x-goog-authenticated-user-jwt") instead of trusting raw headers.
        
        String email = "dev-user@example.com";

        if (rawUserEmail != null && !rawUserEmail.isBlank()) {
            email = rawUserEmail.replace("accounts.google.com:", "");
        }

        log.info("WhoAmI API called. Resolved email: {}", email);

        return Mono.just(new WhoAmIResponse(email));
    }
}
