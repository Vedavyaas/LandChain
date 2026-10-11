package com.landchain.api.dto;

import jakarta.validation.constraints.NotBlank;

public record CreatePropertyRequest(
        @NotBlank(message = "Survey number is required")
        String surveyNumber,

        @NotBlank(message = "Address is required")
        String address,

        @NotBlank(message = "Village is required")
        String village,

        @NotBlank(message = "Taluk is required")
        String taluk,

        @NotBlank(message = "District is required")
        String district,

        @NotBlank(message = "Area is required")
        String area,

        @NotBlank(message = "Property type is required")
        String propertyType,

        String ownerUsername
) {}
