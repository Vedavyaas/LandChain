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
public class BlockchainDocumentRecord {
    private String documentId;
    private String propertyId;
    private String documentType;
    private String sha256Hash;
    private String registeredBy;
    private String txId;
    private long blockNumber;
    private LocalDateTime registeredAt;
}
