package com.landchain.api.controller;

import com.landchain.api.blockchain.model.BlockchainPropertyRecord;
import com.landchain.api.blockchain.model.BlockchainTransaction;
import com.landchain.api.blockchain.model.BlockchainTransferRecord;
import com.landchain.api.blockchain.service.PropertyContractService;
import com.landchain.api.blockchain.service.TransferContractService;
import com.landchain.api.dto.InitiateTransferRequest;
import com.landchain.api.entity.Property;
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

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/transfers")
@RequiredArgsConstructor
public class TransferController {

    private final TransferContractService transferContractService;
    private final PropertyContractService propertyContractService;
    private final PropertyRepository propertyRepository;
    private final AuditLogService auditLogService;
    private final com.landchain.api.service.DocumentService documentService;
    private final SecureRandom random = new SecureRandom();

    /**
     * Initiate property title transfer proposal.
     * Must be invoked by the current authoritative property owner.
     */
    @PostMapping
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<BlockchainTransferRecord> initiateTransfer(
            @Valid @RequestBody InitiateTransferRequest request,
            Authentication authentication
    ) {
        String actor = authentication != null ? authentication.getName() : "owner1";
        String transferId = "TRF-" + (100000 + random.nextInt(900000));

        BlockchainTransferRecord record = transferContractService.initiateTransfer(
                transferId,
                request.propertyId(),
                request.newOwner(),
                request.deedDocumentId(),
                actor,
                "OwnerMSP"
        );

        // Update local metastore status to PENDING_TRANSFER to stay synchronized with ledger
        propertyRepository.findByPropertyId(request.propertyId()).ifPresent(p -> {
            p.setStatus(PropertyStatus.PENDING_TRANSFER);
            propertyRepository.save(p);
        });

        auditLogService.log(
                "TRANSFER_INITIATED",
                actor,
                request.propertyId(),
                "Transfer " + transferId + " initiated to @" + request.newOwner() + " (Pending Registrar Review)",
                "SUCCESS"
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(record);
    }

    /**
     * Registrar approval: executes atomic ownership conveyance on Hyperledger Fabric.
     * The backend does NOT update ownership directly in H2 as the authoritative operation;
     * it updates local metadata only after the blockchain commits the transaction.
     */
    @PostMapping("/{transferId}/approve")
    @PreAuthorize("hasAnyRole('REGISTRAR', 'GOVERNMENT', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> approveTransfer(
            @PathVariable String transferId,
            Authentication authentication
    ) {
        String registrarActor = authentication != null ? authentication.getName() : "registrar1";
        String mspId = "RegistrarMSP";
        if (authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_GOVERNMENT"))) {
            mspId = "GovernmentMSP";
        }

        // Step 1: Submit transaction to Fabric blockchain
        BlockchainTransaction tx = transferContractService.approveTransfer(transferId, registrarActor, mspId);

        // Step 2: Fetch authoritative record from Fabric to get the new owner
        BlockchainTransferRecord transfer = transferContractService.getTransfer(transferId);
        BlockchainPropertyRecord onChainProperty = propertyContractService.getProperty(transfer.getPropertyId());

        // Step 3: Reconcile H2 metadata with authoritative blockchain ownership
        propertyRepository.findByPropertyId(transfer.getPropertyId()).ifPresent(p -> {
            p.setOwnerUsername(onChainProperty.getCurrentOwner());
            p.setStatus(PropertyStatus.ACTIVE);
            propertyRepository.save(p);
        });

        // Step 4: Anchor and append the new Official Conveyance Deed (Sale Deed) alongside existing documents
        com.landchain.api.dto.DocumentDTO conveyanceDeed = null;
        try {
            conveyanceDeed = documentService.registerConveyanceCertificate(
                    transfer.getPropertyId(),
                    transferId,
                    transfer.getCurrentOwner(),
                    onChainProperty.getCurrentOwner(),
                    registrarActor,
                    tx.getTxId()
            );
        } catch (Exception e) {
            log.error("Failed to generate and anchor conveyance deed certificate", e);
        }

        auditLogService.log(
                "TRANSFER_APPROVED",
                registrarActor,
                transfer.getPropertyId(),
                "Title conveyance executed on blockchain. Authoritative new owner: @" + onChainProperty.getCurrentOwner() + " | Tx: " + tx.getTxId(),
                "SUCCESS"
        );

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Title conveyance committed to Hyperledger Fabric. Official Sale Deed attached to property record.",
                "transfer", transfer,
                "blockchainTx", tx,
                "newOwner", onChainProperty.getCurrentOwner(),
                "conveyanceDeedId", conveyanceDeed != null ? conveyanceDeed.documentId() : "N/A"
        ));
    }

    /**
     * Get list of all transfer proposals.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'GOVERNMENT', 'REGISTRAR', 'BANK', 'AUDITOR', 'ADMIN')")
    public ResponseEntity<List<BlockchainTransferRecord>> getAllTransfers() {
        return ResponseEntity.ok(transferContractService.getAllTransfers());
    }

    /**
     * Get transfer details by transferId.
     */
    @GetMapping("/{transferId}")
    @PreAuthorize("hasAnyRole('OWNER', 'GOVERNMENT', 'REGISTRAR', 'BANK', 'AUDITOR', 'ADMIN')")
    public ResponseEntity<BlockchainTransferRecord> getTransfer(@PathVariable String transferId) {
        return ResponseEntity.ok(transferContractService.getTransfer(transferId));
    }
}
