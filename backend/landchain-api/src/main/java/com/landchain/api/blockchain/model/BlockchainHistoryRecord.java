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
public class BlockchainHistoryRecord {
    private String txId;
    private long blockNumber;
    private LocalDateTime timestamp;
    private String propertyId;
    private String action; // REGISTER_PROPERTY, TRANSFER_OWNERSHIP, MORTGAGE, UNMORTGAGE, FREEZE, UNFREEZE
    private String previousOwner;
    private String newOwner;
    private String status;
    private String actor;
    private String actorMsp;
    private String details;
    private boolean isDelete;
}
