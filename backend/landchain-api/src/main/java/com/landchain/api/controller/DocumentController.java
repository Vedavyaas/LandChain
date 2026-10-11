package com.landchain.api.controller;

import com.landchain.api.dto.DocumentDTO;
import com.landchain.api.dto.VerifyDocumentResponse;
import com.landchain.api.entity.DocumentType;
import com.landchain.api.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    /**
     * Upload and store a PDF document associated with a property.
     * Computes SHA-256 and records metadata in H2.
     */
    @PostMapping(value = "/api/properties/{propertyId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('REGISTRAR')")
    public ResponseEntity<DocumentDTO> uploadDocument(
            @PathVariable String propertyId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "documentType", required = false) DocumentType documentType,
            Authentication authentication
    ) throws IOException {
        String actor = authentication != null ? authentication.getName() : "user";
        DocumentDTO uploaded = documentService.uploadDocument(propertyId, file, documentType, actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(uploaded);
    }

    /**
     * List all documents registered under a property.
     */
    @GetMapping("/api/properties/{propertyId}/documents")
    @PreAuthorize("hasAnyRole('OWNER', 'GOVERNMENT', 'REGISTRAR', 'BANK', 'AUDITOR')")
    public ResponseEntity<List<DocumentDTO>> getDocumentsForProperty(@PathVariable String propertyId) {
        List<DocumentDTO> documents = documentService.getDocumentsForProperty(propertyId);
        return ResponseEntity.ok(documents);
    }

    /**
     * Download / view the stored physical document by documentId.
     */
    @GetMapping("/api/documents/{documentId}")
    @PreAuthorize("hasAnyRole('OWNER', 'GOVERNMENT', 'REGISTRAR', 'BANK', 'AUDITOR')")
    public ResponseEntity<Resource> downloadDocument(@PathVariable String documentId) {
        Resource resource = documentService.getDocumentResource(documentId);
        DocumentDTO info = documentService.getDocument(documentId);

        String contentType = "application/pdf";
        if (!info.originalFileName().toLowerCase().endsWith(".pdf")) {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + info.originalFileName() + "\"")
                .body(resource);
    }

    /**
     * Fetch document metadata.
     */
    @GetMapping("/api/documents/{documentId}/info")
    @PreAuthorize("hasAnyRole('OWNER', 'GOVERNMENT', 'REGISTRAR', 'BANK', 'AUDITOR')")
    public ResponseEntity<DocumentDTO> getDocumentInfo(@PathVariable String documentId) {
        DocumentDTO info = documentService.getDocument(documentId);
        return ResponseEntity.ok(info);
    }

    /**
     * Verify a candidate file against the registered document's SHA-256 checksum.
     */
    @PostMapping(value = "/api/documents/{documentId}/verify", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('OWNER', 'GOVERNMENT', 'REGISTRAR', 'BANK', 'AUDITOR')")
    public ResponseEntity<VerifyDocumentResponse> verifyDocument(
            @PathVariable String documentId,
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) throws IOException {
        String actor = authentication != null ? authentication.getName() : "verifier";
        VerifyDocumentResponse response = documentService.verifyDocument(documentId, file, actor);
        return ResponseEntity.ok(response);
    }
}
