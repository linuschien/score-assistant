package com.scoreassistant.adapter.in.web.dto;

public sealed interface WhoAmIDto permits WhoAmIDto.WhoAmIResponse {
    record WhoAmIResponse(
            String email
    ) implements WhoAmIDto {}
}
