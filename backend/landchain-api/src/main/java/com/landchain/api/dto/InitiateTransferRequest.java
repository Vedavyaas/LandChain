package com.landchain.api.dto;

import jakarta.validation.constraints.NotBlank;

public record InitiateTransferRequest(
        @NotBlank(message = "Property ID is required")
        String propertyId,

        String newOwner,
        String deedDocumentId,
        String remarks
) {}
