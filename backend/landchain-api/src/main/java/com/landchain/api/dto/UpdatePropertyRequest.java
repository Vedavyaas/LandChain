package com.landchain.api.dto;

import com.landchain.api.entity.PropertyStatus;

public record UpdatePropertyRequest(
        String surveyNumber,
        String address,
        String village,
        String taluk,
        String district,
        String area,
        String propertyType,
        String ownerUsername,
        PropertyStatus status
) {}
