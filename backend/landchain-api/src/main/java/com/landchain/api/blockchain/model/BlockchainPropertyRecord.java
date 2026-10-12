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
public class BlockchainPropertyRecord {
    private String propertyId;
    private String surveyNumber;
    private String address;
    private String village;
    private String taluk;
    private String district;
    private String area;
    private String propertyType;
    private String currentOwner;
    private String status; // ACTIVE, PENDING_TRANSFER, FROZEN, MORTGAGED
    private String registeredBy;
    private LocalDateTime registeredAt;
    private String lastTxId;
    private long lastBlockNumber;
    private LocalDateTime lastUpdatedAt;
    private String mortgageHolder;
    private Double mortgageAmount;
    private String freezeReason;
}
