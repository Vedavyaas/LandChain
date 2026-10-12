package com.landchain.api.controller;

import com.landchain.api.blockchain.model.BlockchainTransferRecord;
import com.landchain.api.blockchain.service.TransferContractService;
import com.landchain.api.dto.BuyRequestDTO;
import com.landchain.api.dto.CreateBuyRequest;
import com.landchain.api.entity.BuyRequest;
import com.landchain.api.entity.Property;
import com.landchain.api.entity.PropertyStatus;
import com.landchain.api.repository.BuyRequestRepository;
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
@RequestMapping("/api/buy-requests")
@RequiredArgsConstructor
public class BuyRequestController {

    private final BuyRequestRepository buyRequestRepository;
    private final PropertyRepository propertyRepository;
    private final TransferContractService transferContractService;
    private final AuditLogService auditLogService;
    private final SecureRandom random = new SecureRandom();

    /**
     * Submit a buy request / purchase offer on a property parcel.
     * Accessible by citizen accounts (OWNER role).
     */
    @PostMapping
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<BuyRequestDTO> createBuyRequest(
            @Valid @RequestBody CreateBuyRequest request,
            Authentication authentication
    ) {
        String buyer = authentication != null ? authentication.getName() : "buyer1";

        Property prop = propertyRepository.findByPropertyId(request.propertyId())
                .orElseThrow(() -> new IllegalArgumentException("Property not found: " + request.propertyId()));

        if (buyer.equalsIgnoreCase(prop.getOwnerUsername())) {
            throw new IllegalArgumentException("You cannot submit a purchase offer on a property you already own.");
        }

        if (prop.getStatus() != PropertyStatus.ACTIVE) {
            throw new IllegalStateException("Property is currently " + prop.getStatus() + " and not open for purchase offers.");
        }

        String requestId = "BUY-" + (100000 + random.nextInt(900000));

        BuyRequest entity = BuyRequest.builder()
                .requestId(requestId)
                .propertyId(request.propertyId())
                .buyerUsername(buyer)
                .offeredPrice(request.offeredPrice())
                .message(request.message())
                .status("PENDING")
                .build();

        BuyRequest saved = buyRequestRepository.save(entity);

        auditLogService.log(
                "BUY_REQUEST_SUBMITTED",
                buyer,
                request.propertyId(),
                "Purchase offer " + requestId + " submitted for ₹" + request.offeredPrice() + " to owner @" + prop.getOwnerUsername(),
                "SUCCESS"
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(BuyRequestDTO.from(saved));
    }

    /**
     * Get all purchase offers for a specific property parcel.
     */
    @GetMapping("/property/{propertyId}")
    @PreAuthorize("hasAnyRole('OWNER', 'GOVERNMENT', 'REGISTRAR', 'BANK', 'AUDITOR', 'ADMIN')")
    public ResponseEntity<List<BuyRequestDTO>> getOffersForProperty(@PathVariable String propertyId) {
        List<BuyRequestDTO> offers = buyRequestRepository.findByPropertyIdOrderByCreatedAtDesc(propertyId)
                .stream()
                .map(BuyRequestDTO::from)
                .toList();
        return ResponseEntity.ok(offers);
    }

    /**
     * Get all purchase offers submitted by the authenticated buyer.
     */
    @GetMapping("/my")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<List<BuyRequestDTO>> getMyOffers(Authentication authentication) {
        String buyer = authentication != null ? authentication.getName() : "buyer1";
        List<BuyRequestDTO> offers = buyRequestRepository.findByBuyerUsernameOrderByCreatedAtDesc(buyer)
                .stream()
                .map(BuyRequestDTO::from)
                .toList();
        return ResponseEntity.ok(offers);
    }

    /**
     * Accept a purchase offer:
     * Authoritative property owner accepts the buyer's offer.
     * This automatically initiates the title conveyance proposal on Hyperledger Fabric!
     */
    @PostMapping("/{requestId}/accept")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Map<String, Object>> acceptOffer(
            @PathVariable String requestId,
            Authentication authentication
    ) {
        String actor = authentication != null ? authentication.getName() : "owner1";

        BuyRequest offer = buyRequestRepository.findByRequestId(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Buy offer not found: " + requestId));

        Property prop = propertyRepository.findByPropertyId(offer.getPropertyId())
                .orElseThrow(() -> new IllegalArgumentException("Property not found: " + offer.getPropertyId()));

        if (!actor.equalsIgnoreCase(prop.getOwnerUsername())) {
            throw new IllegalArgumentException("Only the authoritative deed owner @" + prop.getOwnerUsername() + " can accept purchase offers.");
        }

        offer.setStatus("ACCEPTED");
        buyRequestRepository.save(offer);

        // Initiate transfer proposal on Hyperledger Fabric
        String transferId = "TRF-" + (100000 + random.nextInt(900000));
        BlockchainTransferRecord transfer = transferContractService.initiateTransfer(
                transferId,
                prop.getPropertyId(),
                offer.getBuyerUsername(),
                null,
                actor,
                "OwnerMSP"
        );

        prop.setStatus(PropertyStatus.PENDING_TRANSFER);
        propertyRepository.save(prop);

        auditLogService.log(
                "BUY_REQUEST_ACCEPTED",
                actor,
                prop.getPropertyId(),
                "Purchase offer " + requestId + " accepted. Fabric title conveyance proposal " + transferId + " initiated to buyer @" + offer.getBuyerUsername(),
                "SUCCESS"
        );

        return ResponseEntity.ok(Map.of(
                "status", "ACCEPTED",
                "message", "Offer accepted! Transfer proposal registered on Fabric awaiting Sub-Registrar deed review.",
                "transfer", transfer
        ));
    }

    /**
     * Reject a purchase offer.
     */
    @PostMapping("/{requestId}/reject")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Map<String, Object>> rejectOffer(
            @PathVariable String requestId,
            Authentication authentication
    ) {
        String actor = authentication != null ? authentication.getName() : "owner1";

        BuyRequest offer = buyRequestRepository.findByRequestId(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Buy offer not found: " + requestId));

        Property prop = propertyRepository.findByPropertyId(offer.getPropertyId())
                .orElseThrow(() -> new IllegalArgumentException("Property not found: " + offer.getPropertyId()));

        if (!actor.equalsIgnoreCase(prop.getOwnerUsername())) {
            throw new IllegalArgumentException("Only the deed owner can reject offers.");
        }

        offer.setStatus("REJECTED");
        buyRequestRepository.save(offer);

        auditLogService.log(
                "BUY_REQUEST_REJECTED",
                actor,
                prop.getPropertyId(),
                "Purchase offer " + requestId + " declined by owner @" + actor,
                "SUCCESS"
        );

        return ResponseEntity.ok(Map.of(
                "status", "REJECTED",
                "message", "Purchase offer declined"
        ));
    }
}
