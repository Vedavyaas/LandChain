package com.landchain.api.blockchain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlockchainBlock {
    private long blockNumber;
    private String blockHash;
    private String previousBlockHash;
    private LocalDateTime timestamp;
    private int transactionCount;
    private List<BlockchainTransaction> transactions;
    private String channelName;
    private String dataHash;
}
