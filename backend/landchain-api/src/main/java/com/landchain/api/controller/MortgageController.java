package com.landchain.api.controller;

import com.landchain.api.blockchain.model.BlockchainPropertyRecord;
import com.landchain.api.blockchain.model.BlockchainTransaction;
import com.landchain.api.blockchain.service.MortgageContractService;
import com.landchain.api.blockchain.service.PropertyContractService;
import com.landchain.api.dto.CreateMortgageRequest;
import com.landchain.api.entity.PropertyStatus;
import com.landchain.api.repository.PropertyRepository;
import com.landchain.api.service.AuditLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/mortgages")
@RequiredArgsConstructor
public class MortgageController {

    private final MortgageContractService mortgageContractService;
    private final PropertyContractService propertyContractService;
    private final PropertyRepository propertyRepository;
    private final AuditLogService auditLogService;

    /**
     * File a mortgage lien on a property parcel / deed.
     * Restricted to BANK role.
     */
    @PostMapping
    @PreAuthorize("hasRole('BANK')")
    public ResponseEntity<Map<String, Object>> fileMortgage(
            @Valid @RequestBody CreateMortgageRequest request,
            Authentication authentication
    ) {
        String actor = authentication != null ? authentication.getName() : "bank1";
        String bankName = (request.bankName() != null && !request.bankName().isBlank())
                ? request.bankName().trim()
                : "Commercial Apex Bank";

        log.info("Banker [{}] filing mortgage lien on property [{}] for ₹{}", actor, request.propertyId(), request.amount());

        // 1. Invoke Fabric smart contract to create mortgage encumbrance
        BlockchainTransaction tx = mortgageContractService.createMortgage(
                request.propertyId(),
                bankName,
                request.amount(),
                actor,
                "BankMSP"
        );

        // 2. Synchronize H2 metadata status with authoritative blockchain state
        propertyRepository.findByPropertyId(request.propertyId()).ifPresent(p -> {
            p.setStatus(PropertyStatus.MORTGAGED);
            propertyRepository.save(p);
        });

        auditLogService.log(
                "MORTGAGE_FILED",
                actor,
                request.propertyId(),
                "Mortgage encumbrance filed by " + bankName + " for ₹" + request.amount() +
                        " (Fabric Tx: " + tx.getTxId().substring(0, 16) + "…)",
                "WARNING"
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "status", "MORTGAGED",
                "propertyId", request.propertyId(),
                "bankName", bankName,
                "loanAmount", request.amount(),
                "blockchainTxId", tx.getTxId(),
                "blockNumber", tx.getBlockNumber(),
                "message", "Mortgage lien successfully recorded on Hyperledger Fabric ledger"
        ));
    }

    /**
     * Release mortgage encumbrance upon loan satisfaction.
     * Restricted to BANK role.
     */
    @PostMapping("/{propertyId}/release")
    @PreAuthorize("hasRole('BANK')")
    public ResponseEntity<Map<String, Object>> releaseMortgage(
            @PathVariable String propertyId,
            Authentication authentication
    ) {
        String actor = authentication != null ? authentication.getName() : "bank1";
        log.info("Banker [{}] releasing mortgage lien on property [{}]", actor, propertyId);

        // 1. Invoke Fabric smart contract to clear mortgage
        BlockchainTransaction tx = mortgageContractService.releaseMortgage(propertyId, actor, "BankMSP");

        // 2. Synchronize H2 metadata status with authoritative blockchain state
        propertyRepository.findByPropertyId(propertyId).ifPresent(p -> {
            p.setStatus(PropertyStatus.ACTIVE);
            propertyRepository.save(p);
        });

        auditLogService.log(
                "MORTGAGE_RELEASED",
                actor,
                propertyId,
                "Mortgage encumbrance cleared on Hyperledger Fabric by @" + actor +
                        " (Tx: " + tx.getTxId().substring(0, 16) + "…)",
                "SUCCESS"
        );

        return ResponseEntity.ok(Map.of(
                "status", "ACTIVE",
                "propertyId", propertyId,
                "blockchainTxId", tx.getTxId(),
                "blockNumber", tx.getBlockNumber(),
                "message", "Mortgage encumbrance released on Hyperledger Fabric. Title is now unencumbered."
        ));
    }

    /**
     * Check on-chain mortgage status for a property.
     */
    @GetMapping("/{propertyId}")
    @PreAuthorize("hasAnyRole('BANK', 'GOVERNMENT', 'REGISTRAR', 'OWNER', 'AUDITOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getMortgageStatus(@PathVariable String propertyId) {
        BlockchainPropertyRecord record = propertyContractService.getProperty(propertyId);
        boolean isMortgaged = "MORTGAGED".equalsIgnoreCase(record.getStatus());
        return ResponseEntity.ok(Map.of(
                "propertyId", propertyId,
                "isMortgaged", isMortgaged,
                "status", record.getStatus(),
                "mortgageHolder", record.getMortgageHolder() != null ? record.getMortgageHolder() : "None",
                "mortgageAmount", record.getMortgageAmount() != null ? record.getMortgageAmount() : 0.0
        ));
    }
}
