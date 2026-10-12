package com.landchain.api.dto;

import com.landchain.api.entity.BuyRequest;

import java.time.LocalDateTime;

public record BuyRequestDTO(
        Long id,
        String requestId,
        String propertyId,
        String buyerUsername,
        Double offeredPrice,
        String message,
        String status,
        LocalDateTime createdAt
) {
    public static BuyRequestDTO from(BuyRequest r) {
        return new BuyRequestDTO(
                r.getId(),
                r.getRequestId(),
                r.getPropertyId(),
                r.getBuyerUsername(),
                r.getOfferedPrice(),
                r.getMessage(),
                r.getStatus(),
                r.getCreatedAt()
        );
    }
}
