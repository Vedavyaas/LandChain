package com.landchain.api.controller;

import com.landchain.api.blockchain.model.BlockchainHistoryRecord;
import com.landchain.api.blockchain.model.BlockchainPropertyRecord;
import com.landchain.api.blockchain.model.BlockchainTransaction;
import com.landchain.api.blockchain.service.FabricGatewayService;
import com.landchain.api.blockchain.service.PropertyContractService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/blockchain")
@RequiredArgsConstructor
public class BlockchainController {

    private final FabricGatewayService gatewayService;
    private final PropertyContractService propertyContractService;

    /**
     * Retrieve ownership history for a property from Hyperledger Fabric ledger.
     */
    @GetMapping("/properties/{propertyId}/history")
    @PreAuthorize("hasAnyRole('OWNER', 'GOVERNMENT', 'REGISTRAR', 'BANK', 'AUDITOR', 'ADMIN')")
    public ResponseEntity<List<BlockchainHistoryRecord>> getPropertyHistory(@PathVariable String propertyId) {
        List<BlockchainHistoryRecord> history = propertyContractService.getPropertyHistory(propertyId);
        return ResponseEntity.ok(history);
    }

    /**
     * Retrieve authoritative on-chain state for a property.
     */
    @GetMapping("/properties/{propertyId}/state")
    @PreAuthorize("hasAnyRole('OWNER', 'GOVERNMENT', 'REGISTRAR', 'BANK', 'AUDITOR', 'ADMIN')")
    public ResponseEntity<BlockchainPropertyRecord> getPropertyState(@PathVariable String propertyId) {
        BlockchainPropertyRecord record = propertyContractService.getProperty(propertyId);
        return ResponseEntity.ok(record);
    }

    /**
     * Retrieve transaction details and cryptographic block receipt by txId.
     */
    @GetMapping("/transactions/{txId}")
    @PreAuthorize("hasAnyRole('OWNER', 'GOVERNMENT', 'REGISTRAR', 'BANK', 'AUDITOR', 'ADMIN')")
    public ResponseEntity<BlockchainTransaction> getTransaction(@PathVariable String txId) {
        BlockchainTransaction tx = gatewayService.getTransaction(txId);
        return ResponseEntity.ok(tx);
    }

    /**
     * Retrieve all ledger blocks chained cryptographically from latest down to Genesis Block #0.
     */
    @GetMapping("/blocks")
    @PreAuthorize("hasAnyRole('OWNER', 'GOVERNMENT', 'REGISTRAR', 'BANK', 'AUDITOR', 'ADMIN')")
    public ResponseEntity<List<com.landchain.api.blockchain.model.BlockchainBlock>> getAllBlocks() {
        return ResponseEntity.ok(gatewayService.getAllBlocks());
    }

    /**
     * Retrieve full transaction stream across the channel.
     */
    @GetMapping("/transactions")
    @PreAuthorize("hasAnyRole('OWNER', 'GOVERNMENT', 'REGISTRAR', 'BANK', 'AUDITOR', 'ADMIN')")
    public ResponseEntity<List<BlockchainTransaction>> getAllTransactions() {
        return ResponseEntity.ok(gatewayService.getAllTransactions());
    }

    /**
     * Retrieve complete ledger world state (properties, documents, transfers).
     */
    @GetMapping("/world-state")
    @PreAuthorize("hasAnyRole('OWNER', 'GOVERNMENT', 'REGISTRAR', 'BANK', 'AUDITOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getWorldState() {
        return ResponseEntity.ok(gatewayService.getWorldState());
    }

    /**
     * Retrieve comprehensive explorer overview and network telemetry.
     */
    @GetMapping("/overview")
    @PreAuthorize("hasAnyRole('OWNER', 'GOVERNMENT', 'REGISTRAR', 'BANK', 'AUDITOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getOverview() {
        return ResponseEntity.ok(gatewayService.getOverview());
    }

    /**
     * Network liveness and status report.
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getNetworkStatus() {
        return ResponseEntity.ok(gatewayService.getNetworkStatus());
    }

    /**
     * Toggle network availability simulation (useful for testing Fabric unavailable error handling).
     */
    @PostMapping("/simulate-liveness")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> simulateLiveness(@RequestParam boolean available) {
        gatewayService.setNetworkAvailable(available);
        return ResponseEntity.ok(Map.of(
                "networkAvailable", available,
                "message", available ? "Fabric Gateway is ONLINE" : "Fabric Gateway is OFFLINE (simulated)"
        ));
    }
}
