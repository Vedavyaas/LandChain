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
    private String status; // INITIATED, APPROVED, REJECTED
    private String initiatedBy;
    private LocalDateTime initiatedAt;
    private String approvedBy;
    private LocalDateTime approvedAt;
    private String txId;
    private long blockNumber;
}
