package com.landchain.api.service;

import com.landchain.api.blockchain.model.BlockchainPropertyRecord;
import com.landchain.api.blockchain.model.BlockchainTransaction;
import com.landchain.api.blockchain.service.PropertyContractService;
import com.landchain.api.dto.CreatePropertyRequest;
import com.landchain.api.dto.DocumentDTO;
import com.landchain.api.dto.PropertyDTO;
import com.landchain.api.dto.UpdatePropertyRequest;
import com.landchain.api.entity.Property;
import com.landchain.api.entity.PropertyStatus;
import com.landchain.api.repository.DocumentRepository;
import com.landchain.api.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final DocumentRepository documentRepository;
    private final AuditLogService auditLogService;
    private final PropertyContractService propertyContractService;
    private final SecureRandom random = new SecureRandom();

    @Transactional
    public PropertyDTO createProperty(CreatePropertyRequest request, String actor) {
        // Step 1: Validate request in Spring Boot & Determine Property ID
        String propertyId;
        if (request.propertyId() != null && !request.propertyId().isBlank()) {
            propertyId = request.propertyId().trim().toUpperCase(Locale.ROOT);
            if (propertyRepository.existsByPropertyId(propertyId)) {
                throw new IllegalArgumentException("Property with ID [" + propertyId + "] already exists in registry.");
            }
        } else {
            propertyId = generateUniquePropertyId();
        }

        String ownerUsername = (request.ownerUsername() != null && !request.ownerUsername().isBlank())
                ? request.ownerUsername().trim()
                : "owner1";

        String propertyType = request.propertyType().trim().toUpperCase(Locale.ROOT);

        // Step 2 & 3: Invoke Fabric registerProperty() on chaincode and wait for transaction result
        log.info("⛓️ Invoking Fabric Gateway to register property [{}]...", propertyId);
        BlockchainTransaction tx = propertyContractService.registerProperty(
                propertyId,
                request.surveyNumber().trim(),
                request.address().trim(),
                request.village().trim(),
                request.taluk().trim(),
                request.district().trim(),
                request.area().trim(),
                propertyType,
                ownerUsername,
                actor,
                "GovernmentMSP"
        );

        // Step 4 & 5: Store and reference resulting blockchain transaction ID in H2 metadata
        Property property = Property.builder()
                .propertyId(propertyId)
                .surveyNumber(request.surveyNumber().trim())
                .address(request.address().trim())
                .village(request.village().trim())
                .taluk(request.taluk().trim())
                .district(request.district().trim())
                .area(request.area().trim())
                .propertyType(propertyType)
                .ownerUsername(ownerUsername)
                .status(PropertyStatus.ACTIVE)
                .blockchainTxId(tx.getTxId())
                .blockchainBlockNumber(tx.getBlockNumber())
                .build();

        Property saved = propertyRepository.save(property);
        log.info("Registered property [{}] on Fabric (TxID: {}, Block: {}) titled to {} by {}",
                propertyId, tx.getTxId(), tx.getBlockNumber(), ownerUsername, actor);

        auditLogService.log(
                "PROPERTY_REGISTERED",
                actor,
                propertyId,
                "Property registered on blockchain ledger (Tx: " + tx.getTxId().substring(0, 16) + "…) under Survey " +
                        request.surveyNumber() + " titled to @" + ownerUsername,
                "SUCCESS"
        );

        // Step 6: Return the authoritative result to React
        return PropertyDTO.from(saved, 0);
    }

    @Transactional(readOnly = true)
    public PropertyDTO getProperty(String propertyId) {
        Property property = propertyRepository.findByPropertyId(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("Property not found: " + propertyId));

        // The blockchain is authoritative for current ownership and status
        try {
            BlockchainPropertyRecord onChain = propertyContractService.getProperty(propertyId);
            if (onChain != null) {
                property.setOwnerUsername(onChain.getCurrentOwner());
                if (onChain.getStatus() != null) {
                    try {
                        property.setStatus(PropertyStatus.valueOf(onChain.getStatus()));
                    } catch (Exception ignored) {}
                }
                if (onChain.getLastTxId() != null) {
                    property.setBlockchainTxId(onChain.getLastTxId());
                }
                if (onChain.getLastBlockNumber() > 0) {
                    property.setBlockchainBlockNumber(onChain.getLastBlockNumber());
                }
            }
        } catch (Exception e) {
            log.debug("Could not sync with on-chain property state for {}: {}", propertyId, e.getMessage());
        }

        List<DocumentDTO> docs = documentRepository.findByPropertyIdOrderByUploadedAtDesc(propertyId).stream()
                .map(DocumentDTO::from)
                .toList();
        return PropertyDTO.from(property, docs.size(), docs);
    }

    @Transactional(readOnly = true)
    public List<PropertyDTO> searchProperties(String query, PropertyStatus status, String ownerUsername) {
        List<Property> properties = propertyRepository.searchProperties(query, status, ownerUsername);
        return properties.stream()
                .map(p -> {
                    int docCount = documentRepository.findByPropertyIdOrderByUploadedAtDesc(p.getPropertyId()).size();
                    return PropertyDTO.from(p, docCount);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PropertyDTO> searchProperties(String query, PropertyStatus status) {
        return searchProperties(query, status, null);
    }

    @Transactional
    public PropertyDTO updateProperty(String propertyId, UpdatePropertyRequest request, String actor) {
        Property property = propertyRepository.findByPropertyId(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("Property not found: " + propertyId));

        if (request.surveyNumber() != null && !request.surveyNumber().isBlank()) property.setSurveyNumber(request.surveyNumber().trim());
        if (request.address() != null && !request.address().isBlank()) property.setAddress(request.address().trim());
        if (request.village() != null && !request.village().isBlank()) property.setVillage(request.village().trim());
        if (request.taluk() != null && !request.taluk().isBlank()) property.setTaluk(request.taluk().trim());
        if (request.district() != null && !request.district().isBlank()) property.setDistrict(request.district().trim());
        if (request.area() != null && !request.area().isBlank()) property.setArea(request.area().trim());
        if (request.propertyType() != null && !request.propertyType().isBlank()) property.setPropertyType(request.propertyType().trim().toUpperCase(Locale.ROOT));
        if (request.ownerUsername() != null && !request.ownerUsername().isBlank()) property.setOwnerUsername(request.ownerUsername().trim());
        if (request.status() != null) property.setStatus(request.status());

        Property updated = propertyRepository.save(property);
        List<DocumentDTO> docs = documentRepository.findByPropertyIdOrderByUploadedAtDesc(propertyId).stream()
                .map(DocumentDTO::from)
                .toList();

        auditLogService.log(
                "PROPERTY_UPDATED",
                actor,
                propertyId,
                "Property details updated (Status: " + updated.getStatus() + ")",
                "SUCCESS"
        );

        return PropertyDTO.from(updated, docs.size(), docs);
    }

    private String generateUniquePropertyId() {
        String id;
        do {
            int num = 100000 + random.nextInt(900000);
            id = "PROP-" + num;
        } while (propertyRepository.existsByPropertyId(id));
        return id;
    }
}
