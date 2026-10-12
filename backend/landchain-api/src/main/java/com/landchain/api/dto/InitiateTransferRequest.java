package com.landchain.api.dto;

import jakarta.validation.constraints.NotBlank;

public record InitiateTransferRequest(
        @NotBlank(message = "Property ID is required")
        String propertyId,

        @NotBlank(message = "Buyer username is required")
        String newOwner,

        String deedDocumentId,
        String remarks
) {}
