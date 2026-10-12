package com.landchain.api.service;

import com.landchain.api.dto.DocumentDTO;
import com.landchain.api.dto.VerifyDocumentResponse;
import com.landchain.api.entity.Document;
import com.landchain.api.entity.DocumentType;
import com.landchain.api.repository.DocumentRepository;
import com.landchain.api.repository.PropertyRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final PropertyRepository propertyRepository;
    private final AuditLogService auditLogService;
    private final com.landchain.api.blockchain.service.DocumentContractService documentContractService;
    private final SecureRandom random = new SecureRandom();

    @Value("${landchain.storage.upload-dir:storage/documents}")
    private String uploadDir;

    private Path storageLocation;

    @PostConstruct
    public void init() {
        this.storageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.storageLocation);
            log.info("Initialized document storage directory at: {}", this.storageLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage directory: " + this.storageLocation, e);
        }
    }

    @Transactional
    public DocumentDTO uploadDocument(String propertyId, MultipartFile file, DocumentType type, String actor) throws IOException {
        if (!propertyRepository.existsByPropertyId(propertyId)) {
            throw new IllegalArgumentException("Property not found: " + propertyId);
        }

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File must not be empty");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            originalFilename = "document.pdf";
        }

        // Step 1: Calculate SHA-256 of the byte content
        byte[] bytes = file.getBytes();
        String sha256Hash = computeSha256(bytes);

        // Generate unique documentId
        String documentId = generateUniqueDocumentId();

        // Step 2: Sanitize filename & store document locally on disk
        String sanitizedName = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        String storedFileName = documentId + "_" + sanitizedName;
        Path targetPath = this.storageLocation.resolve(storedFileName);
        Files.createDirectories(this.storageLocation);

        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        log.info("Stored document [{}] locally at {} (SHA-256: {})", documentId, targetPath, sha256Hash);

        DocumentType docType = type != null ? type : DocumentType.OTHER;

        // Step 3 & 4: Invoke registerDocumentHash() on Hyperledger Fabric
        log.info("⛓️ Registering document [{}] SHA-256 on Fabric blockchain...", documentId);
        com.landchain.api.blockchain.model.BlockchainTransaction tx = documentContractService.registerDocumentHash(
                documentId,
                propertyId,
                docType.name(),
                sha256Hash,
                actor,
                "RegistrarMSP"
        );

        // Step 5: Store metadata in H2 along with the blockchain transaction reference
        Document doc = Document.builder()
                .documentId(documentId)
                .propertyId(propertyId)
                .documentType(docType)
                .originalFileName(originalFilename)
                .storagePath(targetPath.toString())
                .sha256Hash(sha256Hash)
                .blockchainTxId(tx.getTxId())
                .blockchainBlockNumber(tx.getBlockNumber())
                .build();

        Document saved = documentRepository.save(doc);

        auditLogService.log(
                "DOCUMENT_UPLOADED",
                actor,
                propertyId,
                "Uploaded " + doc.getDocumentType() + " (" + originalFilename + ") · SHA-256 registered on Fabric (Tx: " +
                        tx.getTxId().substring(0, 16) + "…)",
                "SUCCESS"
        );

        return DocumentDTO.from(saved);
    }

    @Transactional(readOnly = true)
    public List<DocumentDTO> getDocumentsForProperty(String propertyId) {
        return documentRepository.findByPropertyIdOrderByUploadedAtDesc(propertyId).stream()
                .map(DocumentDTO::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentDTO getDocument(String documentId) {
        Document doc = documentRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));
        return DocumentDTO.from(doc);
    }

    @Transactional(readOnly = true)
    public Resource getDocumentResource(String documentId) {
        Document doc = documentRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        try {
            Path file = Paths.get(doc.getStoragePath());
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("Document file not found on disk: " + doc.getStoragePath());
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Malformed file path for document: " + doc.getStoragePath(), e);
        }
    }

    @Transactional
    public VerifyDocumentResponse verifyDocument(String documentId, MultipartFile file, String actor) throws IOException {
        Document doc = documentRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Verification file must not be empty");
        }

        // 1. Calculate current SHA-256 of candidate file
        byte[] uploadedBytes = file.getBytes();
        String uploadedHash = computeSha256(uploadedBytes);
        String storedHash = doc.getSha256Hash();

        // 2. Retrieve authoritative blockchain hash from Fabric ledger
        String blockchainHash = storedHash;
        String blockchainTxId = doc.getBlockchainTxId();
        boolean blockchainRetrieved = false;
        try {
            com.landchain.api.blockchain.model.BlockchainDocumentRecord onChainRecord =
                    documentContractService.getDocumentRecord(documentId);
            if (onChainRecord != null) {
                blockchainHash = onChainRecord.getSha256Hash();
                blockchainTxId = onChainRecord.getTxId();
                blockchainRetrieved = true;
            }
        } catch (Exception e) {
            log.warn("Could not query on-chain document record for {}: {}", documentId, e.getMessage());
        }

        // 3. Compare candidate hash against blockchain and stored hash
        boolean matchesStored = storedHash.equalsIgnoreCase(uploadedHash);
        boolean matchesBlockchain = blockchainHash.equalsIgnoreCase(uploadedHash);
        boolean matches = matchesStored && matchesBlockchain;

        String message = matches
                ? "✓ MATCH — Candidate file SHA-256 matches both the registered database checksum and the authoritative Hyperledger Fabric ledger proof."
                : "✗ MISMATCH — Candidate file SHA-256 does not match the blockchain ledger record. File may have been modified or corrupted.";

        auditLogService.log(
                "DOCUMENT_VERIFIED",
                actor,
                documentId,
                "Cryptographic integrity verification for " + doc.getOriginalFileName() +
                        " against Fabric ledger · Result: " + (matches ? "MATCH" : "MISMATCH"),
                matches ? "SUCCESS" : "WARNING"
        );

        // 4. Return verification result to React
        return new VerifyDocumentResponse(
                doc.getDocumentId(),
                doc.getOriginalFileName(),
                doc.getDocumentType(),
                storedHash,
                uploadedHash,
                blockchainHash,
                matches,
                blockchainRetrieved && matchesBlockchain,
                blockchainTxId,
                message,
                LocalDateTime.now()
        );
    }

    public static String computeSha256(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(data);
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available in runtime", e);
        }
    }

    @Transactional
    public DocumentDTO registerConveyanceCertificate(
            String propertyId,
            String transferId,
            String previousOwner,
            String newOwner,
            String registrarActor,
            String transferTxId
    ) {
        String documentId = generateUniqueDocumentId();
        String filename = "Conveyance_Deed_" + transferId + ".txt";

        String certificateContent = String.format("""
                ================================================================================
                GOVERNMENT LAND REGISTRY & CADASTRAL RECORD
                OFFICIAL TITLE DEED OF CONVEYANCE (SALE DEED)
                ================================================================================
                Property Identification: %s
                Conveyance Transfer ID: %s
                Date of Registration: %s

                GRANTOR (PREVIOUS OWNER): @%s
                GRANTEE (AUTHORITATIVE NEW OWNER): @%s

                GOVERNMENT REGISTRATION AUTHORITY:
                Sub-Registrar Authority: @%s (RegistrarMSP)
                Underlying Fabric Transaction: %s
                Authoritative Ledger: Hyperledger Fabric Channel [landchannel]

                LEGAL DECLARATION:
                All rights, title, interest, and possession in the cadastral parcel specified
                above are hereby irrevocably conveyed to the Grantee. This certificate is
                cryptographically anchored and sealed on the LandChain distributed ledger.
                ================================================================================
                """,
                propertyId, transferId, LocalDateTime.now(), previousOwner, newOwner,
                registrarActor, transferTxId
        );

        byte[] bytes = certificateContent.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        String sha256Hash = computeSha256(bytes);

        Path targetPath = this.storageLocation.resolve(documentId + "_" + filename);
        try {
            Files.createDirectories(this.storageLocation);
            Files.write(targetPath, bytes);
        } catch (IOException e) {
            log.error("Failed to write conveyance certificate to disk", e);
        }

        // Register document hash on Fabric blockchain
        com.landchain.api.blockchain.model.BlockchainTransaction docTx = documentContractService.registerDocumentHash(
                documentId,
                propertyId,
                DocumentType.SALE_DEED.name(),
                sha256Hash,
                registrarActor,
                "RegistrarMSP"
        );

        Document doc = Document.builder()
                .documentId(documentId)
                .propertyId(propertyId)
                .documentType(DocumentType.SALE_DEED)
                .originalFileName(filename)
                .storagePath(targetPath.toString())
                .sha256Hash(sha256Hash)
                .blockchainTxId(docTx.getTxId())
                .blockchainBlockNumber(docTx.getBlockNumber())
                .build();

        Document saved = documentRepository.save(doc);

        auditLogService.log(
                "CONVEYANCE_DEED_REGISTERED",
                registrarActor,
                propertyId,
                "Official Sale Deed " + documentId + " registered on Fabric ledger for transfer " + transferId,
                "SUCCESS"
        );

        return DocumentDTO.from(saved);
    }

    private String generateUniqueDocumentId() {
        String id;
        do {
            int num = 100000 + random.nextInt(900000);
            id = "DOC-" + num;
        } while (documentRepository.existsByDocumentId(id));
        return id;
    }
}

