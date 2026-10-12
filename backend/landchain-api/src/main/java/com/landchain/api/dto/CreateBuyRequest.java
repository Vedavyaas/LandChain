package com.landchain.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateBuyRequest(
        @NotBlank(message = "Property ID is required")
        String propertyId,

        @NotNull(message = "Offered price is required")
        @DecimalMin(value = "1.0", message = "Offered price must be positive")
        Double offeredPrice,

        String message
) {}
