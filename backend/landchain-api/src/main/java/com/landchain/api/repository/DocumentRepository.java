package com.landchain.api.repository;

import com.landchain.api.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    Optional<Document> findByDocumentId(String documentId);

    List<Document> findByPropertyIdOrderByUploadedAtDesc(String propertyId);

    boolean existsByDocumentId(String documentId);
}
