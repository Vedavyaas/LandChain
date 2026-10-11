package com.landchain.api.dto;

import jakarta.validation.constraints.NotBlank;

/** Payload sent by the client to authenticate. */
public record LoginRequest(

        @NotBlank
        String username,

        @NotBlank
        String password
) {}
