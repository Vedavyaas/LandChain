package com.landchain.api.blockchain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlockchainTransferRecord {
    private String transferId;
    private String propertyId;
    private String currentOwner;
    private String newOwner;
    private String deedDocumentId;
    private String deedSha256Hash;
    private String status; // PENDING_BUYER_ACCEPTANCE, PENDING_OWNER_ACCEPTANCE, PENDING_REGISTRAR, APPROVED, REJECTED
    private String initiatedBy;
    private LocalDateTime initiatedAt;

    // Mutual Acceptance
    private boolean ownerAccepted;
    private LocalDateTime ownerAcceptedAt;
    private boolean buyerAccepted;
    private LocalDateTime buyerAcceptedAt;

    // Sub-Registrar Review & Finalization
    private String approvedBy;
    private LocalDateTime approvedAt;
    private String rejectedBy;
    private LocalDateTime rejectedAt;
    private String cancellationReason;

    private String remarks;
    private String txId;
    private long blockNumber;
}
