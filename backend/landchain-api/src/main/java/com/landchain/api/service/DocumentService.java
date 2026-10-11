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

        // Calculate SHA-256 of the byte content
        byte[] bytes = file.getBytes();
        String sha256Hash = computeSha256(bytes);

        // Generate unique documentId
        String documentId = generateUniqueDocumentId();

        // Sanitize filename & store on disk
        String sanitizedName = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        String storedFileName = documentId + "_" + sanitizedName;
        Path targetPath = this.storageLocation.resolve(storedFileName);
        Files.createDirectories(this.storageLocation);

        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        log.info("Stored document [{}] at {} (SHA-256: {})", documentId, targetPath, sha256Hash);

        Document doc = Document.builder()
                .documentId(documentId)
                .propertyId(propertyId)
                .documentType(type != null ? type : DocumentType.OTHER)
                .originalFileName(originalFilename)
                .storagePath(targetPath.toString())
                .sha256Hash(sha256Hash)
                .build();

        Document saved = documentRepository.save(doc);

        auditLogService.log(
                "DOCUMENT_UPLOADED",
                actor,
                propertyId,
                "Uploaded " + doc.getDocumentType() + " (" + originalFilename + ") · SHA-256: " + sha256Hash.substring(0, 12) + "…",
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

        byte[] uploadedBytes = file.getBytes();
        String uploadedHash = computeSha256(uploadedBytes);
        String storedHash = doc.getSha256Hash();

        boolean matches = storedHash.equalsIgnoreCase(uploadedHash);
        String message = matches
                ? "✓ MATCH — SHA-256 checksum is identical. Document integrity verified against the registry."
                : "✗ MISMATCH — SHA-256 checksum does not match. The uploaded file has been altered or is different from the registered document.";

        auditLogService.log(
                "DOCUMENT_VERIFIED",
                actor,
                documentId,
                "Integrity check for " + doc.getOriginalFileName() + " · Result: " + (matches ? "MATCH" : "MISMATCH"),
                matches ? "SUCCESS" : "WARNING"
        );

        return new VerifyDocumentResponse(
                doc.getDocumentId(),
                doc.getOriginalFileName(),
                doc.getDocumentType(),
                storedHash,
                uploadedHash,
                matches,
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

    private String generateUniqueDocumentId() {
        String id;
        do {
            int num = 100000 + random.nextInt(900000);
            id = "DOC-" + num;
        } while (documentRepository.existsByDocumentId(id));
        return id;
    }
}
