package com.landchain.api.dto;

public record ApproveTransferRequest(
        String deedDocumentId,
        String remarks
) {}
