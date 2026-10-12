package com.landchain.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateMortgageRequest(
        @NotBlank(message = "Property ID is required")
        String propertyId,

        @NotNull(message = "Mortgage loan amount is required")
        @DecimalMin(value = "1.0", message = "Loan amount must be greater than zero")
        Double amount,

        String bankName,
        String documentId,
        String remarks
) {}
