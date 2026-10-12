package com.landchain.api.dto;

import com.landchain.api.entity.Property;
import com.landchain.api.entity.PropertyStatus;

import java.time.LocalDateTime;
import java.util.List;

public record PropertyDTO(
        Long id,
        String propertyId,
        String surveyNumber,
        String address,
        String village,
        String taluk,
        String district,
        String area,
        String propertyType,
        String ownerUsername,
        PropertyStatus status,
        String blockchainTxId,
        Long blockchainBlockNumber,
        LocalDateTime createdAt,
        int documentCount,
        List<DocumentDTO> documents
) {
    public static PropertyDTO from(Property p, int documentCount, List<DocumentDTO> documents) {
        return new PropertyDTO(
                p.getId(),
                p.getPropertyId(),
                p.getSurveyNumber(),
                p.getAddress(),
                p.getVillage(),
                p.getTaluk(),
                p.getDistrict(),
                p.getArea(),
                p.getPropertyType(),
                p.getOwnerUsername(),
                p.getStatus(),
                p.getBlockchainTxId(),
                p.getBlockchainBlockNumber(),
                p.getCreatedAt(),
                documentCount,
                documents != null ? documents : List.of()
        );
    }

    public static PropertyDTO from(Property p, int documentCount) {
        return from(p, documentCount, List.of());
    }
}
