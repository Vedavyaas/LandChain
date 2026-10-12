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
public class BlockchainTransaction {
    private String txId;
    private long blockNumber;
    private LocalDateTime timestamp;
    private String channelName;
    private String chaincodeName;
    private String functionName;
    private String creatorMspId;
    private String creator;
    private String payloadJson;
    private String validationCode; // e.g. VALID, INVALID
    private String blockHash;
    private String previousBlockHash;
}
