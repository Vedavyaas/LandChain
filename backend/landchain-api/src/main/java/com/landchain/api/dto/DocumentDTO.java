package com.landchain.api.dto;

import com.landchain.api.entity.Document;
import com.landchain.api.entity.DocumentType;

import java.time.LocalDateTime;

public record DocumentDTO(
        Long id,
        String documentId,
        String propertyId,
        DocumentType documentType,
        String originalFileName,
        String sha256Hash,
        String blockchainTxId,
        Long blockchainBlockNumber,
        LocalDateTime uploadedAt
) {
    public static DocumentDTO from(Document d) {
        return new DocumentDTO(
                d.getId(),
                d.getDocumentId(),
                d.getPropertyId(),
                d.getDocumentType(),
                d.getOriginalFileName(),
                d.getSha256Hash(),
                d.getBlockchainTxId(),
                d.getBlockchainBlockNumber(),
                d.getUploadedAt()
        );
    }
}
