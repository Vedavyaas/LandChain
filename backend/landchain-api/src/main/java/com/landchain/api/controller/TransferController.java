package com.landchain.api.controller;

import com.landchain.api.blockchain.model.BlockchainPropertyRecord;
import com.landchain.api.blockchain.model.BlockchainTransaction;
import com.landchain.api.blockchain.model.BlockchainTransferRecord;
import com.landchain.api.blockchain.service.PropertyContractService;
import com.landchain.api.blockchain.service.TransferContractService;
import com.landchain.api.dto.ApproveTransferRequest;
import com.landchain.api.dto.CancelTransferRequest;
import com.landchain.api.dto.DocumentDTO;
import com.landchain.api.dto.InitiateTransferRequest;
import com.landchain.api.entity.DocumentType;
import com.landchain.api.entity.Property;
import com.landchain.api.entity.PropertyStatus;
import com.landchain.api.repository.PropertyRepository;
import com.landchain.api.service.AuditLogService;
import com.landchain.api.service.DocumentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
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
    private final DocumentService documentService;
    private final SecureRandom random = new SecureRandom();

    /**
     * Start property title transfer transaction.
     * Can be initiated by either the current Owner OR a Buyer.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'GOVERNMENT', 'REGISTRAR', 'ADMIN')")
    public ResponseEntity<BlockchainTransferRecord> initiateTransfer(
            @Valid @RequestBody InitiateTransferRequest request,
            Authentication authentication
    ) {
        String actor = authentication != null ? authentication.getName() : "user1";

        Property prop = propertyRepository.findByPropertyId(request.propertyId())
                .orElseThrow(() -> new IllegalArgumentException("Property not found: " + request.propertyId()));

        if (prop.getStatus() != PropertyStatus.ACTIVE) {
            throw new IllegalStateException("Property [" + prop.getPropertyId() + "] is currently " +
                    prop.getStatus() + " and not available for transfer.");
        }

        boolean isCurrentOwner = prop.getOwnerUsername().equalsIgnoreCase(actor);
        String buyerUsername;

        if (isCurrentOwner) {
            if (request.newOwner() == null || request.newOwner().isBlank()) {
                throw new IllegalArgumentException("Buyer username must be specified when owner initiates transfer.");
            }
            if (request.newOwner().equalsIgnoreCase(actor)) {
                throw new IllegalArgumentException("You cannot initiate a transfer to yourself.");
            }
            buyerUsername = request.newOwner();
        } else {
            // Buyer is initiating transaction
            buyerUsername = actor;
        }

        String transferId = "TRF-" + (100000 + random.nextInt(900000));

        BlockchainTransferRecord record = transferContractService.initiateTransfer(
                transferId,
                request.propertyId(),
                buyerUsername,
                request.deedDocumentId(),
                actor,
                "Org1MSP",
                request.remarks(),
                false
        );

        // Update local metastore status to PENDING_TRANSFER to stay synchronized with ledger
        prop.setStatus(PropertyStatus.PENDING_TRANSFER);
        propertyRepository.save(prop);

        String logMsg = isCurrentOwner
                ? "Transfer " + transferId + " initiated by Owner @" + actor + " to Buyer @" + buyerUsername + " (Awaiting Buyer Acceptance)"
                : "Transfer transaction " + transferId + " initiated by Buyer @" + actor + " to purchase from Owner @" + prop.getOwnerUsername() + " (Awaiting Owner Acceptance)";

        auditLogService.log(
                "TRANSFER_INITIATED",
                actor,
                request.propertyId(),
                logMsg,
                "SUCCESS"
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(record);
    }

    /**
     * Accept a transfer transaction.
     * Invoked by the counter-party (buyer if owner initiated, or owner if buyer initiated).
     * Once both accept, the transaction moves to PENDING_REGISTRAR.
     */
    @PostMapping("/{transferId}/accept")
    @PreAuthorize("hasAnyRole('OWNER', 'GOVERNMENT', 'REGISTRAR', 'ADMIN')")
    public ResponseEntity<BlockchainTransferRecord> acceptTransfer(
            @PathVariable String transferId,
            Authentication authentication
    ) {
        String actor = authentication != null ? authentication.getName() : "user1";

        BlockchainTransferRecord updated = transferContractService.acceptTransfer(transferId, actor, "Org1MSP");

        auditLogService.log(
                "TRANSFER_ACCEPTED",
                actor,
                updated.getPropertyId(),
                "Transfer " + transferId + " accepted by @" + actor + ". Mutual acceptance reached. Forwarded to Sub-Registrar for document upload & final conveyance.",
                "SUCCESS"
        );

        return ResponseEntity.ok(updated);
    }

    /**
     * Sub-Registrar document upload for a transfer proposal.
     * The Registrar uploads physical/scanned conveyance deeds (Sale Deed, Stamp duty, etc.)
     * which are SHA-256 hashed and anchored to Fabric ledger.
     */
    @PostMapping(value = "/{transferId}/upload-doc", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('REGISTRAR', 'GOVERNMENT', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> uploadTransferDocument(
            @PathVariable String transferId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "documentType", required = false) DocumentType documentType,
            Authentication authentication
    ) throws IOException {
        String registrarActor = authentication != null ? authentication.getName() : "registrar1";

        BlockchainTransferRecord transfer = transferContractService.getTransfer(transferId);
        DocumentType type = documentType != null ? documentType : DocumentType.SALE_DEED;

        DocumentDTO uploadedDoc = documentService.uploadDocument(transfer.getPropertyId(), file, type, registrarActor);

        // Link uploaded document to the transfer proposal on the blockchain
        BlockchainTransferRecord updatedTransfer = transferContractService.attachDocumentToTransfer(
                transferId,
                uploadedDoc.documentId(),
                uploadedDoc.sha256Hash()
        );

        auditLogService.log(
                "TRANSFER_DOCUMENT_UPLOADED",
                registrarActor,
                transfer.getPropertyId(),
                "Sub-Registrar uploaded " + type + " (" + uploadedDoc.originalFileName() + ") for transfer " + transferId +
                        " · SHA-256: " + uploadedDoc.sha256Hash().substring(0, 16) + "…",
                "SUCCESS"
        );

        return ResponseEntity.ok(Map.of(
                "document", uploadedDoc,
                "transfer", updatedTransfer,
                "message", "Conveyance document uploaded and anchored to Fabric ledger."
        ));
    }

    /**
     * Sub-Registrar auto-generation & auto-attachment:
     * Automatically generates an official cryptographically sealed Title Conveyance Deed
     * with cadastral coordinates, hashes it, anchors it to Fabric, and attaches it to this transfer proposal.
     */
    @PostMapping("/{transferId}/auto-attach-deed")
    @PreAuthorize("hasAnyRole('REGISTRAR', 'GOVERNMENT', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> autoAttachConveyanceDeed(
            @PathVariable String transferId,
            Authentication authentication
    ) {
        String registrarActor = authentication != null ? authentication.getName() : "registrar1";
        BlockchainTransferRecord transfer = transferContractService.getTransfer(transferId);

        DocumentDTO doc = documentService.registerConveyanceCertificate(
                transfer.getPropertyId(),
                transferId,
                transfer.getCurrentOwner(),
                transfer.getNewOwner(),
                registrarActor,
                transfer.getTxId() != null ? transfer.getTxId() : "TX-PENDING-CONVEYANCE"
        );

        BlockchainTransferRecord updatedTransfer = transferContractService.attachDocumentToTransfer(
                transferId,
                doc.documentId(),
                doc.sha256Hash()
        );

        auditLogService.log(
                "TRANSFER_DEED_AUTO_ATTACHED",
                registrarActor,
                transfer.getPropertyId(),
                "Official Conveyance Deed " + doc.documentId() + " auto-generated and attached to transfer " + transferId +
                        " · SHA-256: " + doc.sha256Hash().substring(0, 16) + "…",
                "SUCCESS"
        );

        return ResponseEntity.ok(Map.of(
                "document", doc,
                "transfer", updatedTransfer,
                "message", "Official Conveyance Deed auto-generated and attached to transfer."
        ));
    }

    /**
     * Sub-Registrar attach existing document:
     * Attaches an existing registered document to this transfer proposal.
     */
    @PostMapping("/{transferId}/attach-doc/{documentId}")
    @PreAuthorize("hasAnyRole('REGISTRAR', 'GOVERNMENT', 'ADMIN')")
    public ResponseEntity<BlockchainTransferRecord> attachExistingDocument(
            @PathVariable String transferId,
            @PathVariable String documentId,
            Authentication authentication
    ) {
        String registrarActor = authentication != null ? authentication.getName() : "registrar1";
        DocumentDTO doc = documentService.getDocument(documentId);
        BlockchainTransferRecord updated = transferContractService.attachDocumentToTransfer(
                transferId,
                doc.documentId(),
                doc.sha256Hash()
        );

        auditLogService.log(
                "TRANSFER_DOCUMENT_ATTACHED",
                registrarActor,
                updated.getPropertyId(),
                "Document " + documentId + " attached to transfer " + transferId,
                "SUCCESS"
        );

        return ResponseEntity.ok(updated);
    }

    /**
     * Sub-Registrar final execution: commits title conveyance on Hyperledger Fabric.
     * Both parties must have accepted before the Registrar can approve.
     */
    @PostMapping("/{transferId}/approve")
    @PreAuthorize("hasAnyRole('REGISTRAR', 'GOVERNMENT', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> approveTransfer(
            @PathVariable String transferId,
            @RequestBody(required = false) ApproveTransferRequest request,
            Authentication authentication
    ) {
        String registrarActor = authentication != null ? authentication.getName() : "registrar1";
        String mspId = "RegistrarMSP";
        if (authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_GOVERNMENT"))) {
            mspId = "GovernmentMSP";
        }

        String deedDocId = request != null ? request.deedDocumentId() : null;

        // Step 1: Submit transaction to Fabric blockchain
        BlockchainTransaction tx = transferContractService.approveTransfer(transferId, registrarActor, mspId, deedDocId);

        // Step 2: Fetch authoritative record from Fabric to get the new owner
        BlockchainTransferRecord transfer = transferContractService.getTransfer(transferId);
        BlockchainPropertyRecord onChainProperty = propertyContractService.getProperty(transfer.getPropertyId());

        // Step 3: Reconcile H2 metadata with authoritative blockchain ownership
        propertyRepository.findByPropertyId(transfer.getPropertyId()).ifPresent(p -> {
            p.setOwnerUsername(onChainProperty.getCurrentOwner());
            p.setStatus(PropertyStatus.ACTIVE);
            propertyRepository.save(p);
        });

        // Step 4: Anchor and append the Official Conveyance Deed (Sale Deed) if not already done
        DocumentDTO conveyanceDeed = null;
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
            log.error("Failed to generate conveyance deed certificate", e);
        }

        auditLogService.log(
                "TRANSFER_APPROVED",
                registrarActor,
                transfer.getPropertyId(),
                "Title conveyance executed on blockchain by Sub-Registrar @" + registrarActor +
                        ". Authoritative new owner: @" + onChainProperty.getCurrentOwner() + " | Tx: " + tx.getTxId(),
                "SUCCESS"
        );

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Title conveyance executed and committed to Hyperledger Fabric. Official Sale Deed recorded.",
                "transfer", transfer,
                "blockchainTx", tx,
                "newOwner", onChainProperty.getCurrentOwner(),
                "conveyanceDeedId", conveyanceDeed != null ? conveyanceDeed.documentId() : (transfer.getDeedDocumentId() != null ? transfer.getDeedDocumentId() : "N/A")
        ));
    }

    /**
     * Cancel or reject a transfer transaction.
     * Can be invoked by:
     * - The Registrar (if documents are unsatisfactory or issues found)
     * - The Owner or Buyer (before final execution)
     */
    @PostMapping(value = {"/{transferId}/cancel", "/{transferId}/reject"})
    @PreAuthorize("hasAnyRole('OWNER', 'REGISTRAR', 'GOVERNMENT', 'ADMIN')")
    public ResponseEntity<BlockchainTransferRecord> cancelTransfer(
            @PathVariable String transferId,
            @RequestBody(required = false) CancelTransferRequest request,
            Authentication authentication
    ) {
        String actor = authentication != null ? authentication.getName() : "user1";
        String mspId = "Org1MSP";
        if (authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_REGISTRAR"))) {
            mspId = "RegistrarMSP";
        } else if (authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_GOVERNMENT"))) {
            mspId = "GovernmentMSP";
        }

        String reason = request != null && request.reason() != null && !request.reason().isBlank()
                ? request.reason()
                : "Cancelled by @" + actor;

        BlockchainTransferRecord record = transferContractService.cancelTransfer(transferId, reason, actor, mspId);

        // Reconcile H2 metadata: unlock property back to ACTIVE
        propertyRepository.findByPropertyId(record.getPropertyId()).ifPresent(p -> {
            p.setStatus(PropertyStatus.ACTIVE);
            propertyRepository.save(p);
        });

        auditLogService.log(
                "TRANSFER_CANCELLED",
                actor,
                record.getPropertyId(),
                "Transfer " + transferId + " cancelled by @" + actor + ". Reason: " + reason + " (Property restored to ACTIVE)",
                "SUCCESS"
        );

        return ResponseEntity.ok(record);
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

    /**
     * Get all transfer records for a specific property parcel.
     */
    @GetMapping("/property/{propertyId}")
    @PreAuthorize("hasAnyRole('OWNER', 'GOVERNMENT', 'REGISTRAR', 'BANK', 'AUDITOR', 'ADMIN')")
    public ResponseEntity<List<BlockchainTransferRecord>> getTransfersForProperty(@PathVariable String propertyId) {
        return ResponseEntity.ok(transferContractService.getTransfersByProperty(propertyId));
    }
}
