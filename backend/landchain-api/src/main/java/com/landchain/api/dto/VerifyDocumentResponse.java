package com.landchain.api.dto;

import com.landchain.api.entity.DocumentType;

import java.time.LocalDateTime;

public record VerifyDocumentResponse(
        String documentId,
        String originalFileName,
        DocumentType documentType,
        String storedHash,
        String uploadedHash,
        String blockchainHash,
        boolean matches,
        boolean blockchainVerified,
        String blockchainTxId,
        String message,
        LocalDateTime verifiedAt
) {}
