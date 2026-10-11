package com.landchain.api.repository;

import com.landchain.api.entity.Property;
import com.landchain.api.entity.PropertyStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PropertyRepository extends JpaRepository<Property, Long> {

    Optional<Property> findByPropertyId(String propertyId);

    boolean existsByPropertyId(String propertyId);

    @Query("SELECT p FROM Property p WHERE " +
           "(:ownerUsername IS NULL OR p.ownerUsername = :ownerUsername) AND " +
           "(:query IS NULL OR :query = '' OR " +
           "LOWER(p.propertyId) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.surveyNumber) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.village) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.taluk) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.district) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.address) LIKE LOWER(CONCAT('%', :query, '%'))) AND " +
           "(:status IS NULL OR p.status = :status) " +
           "ORDER BY p.createdAt DESC")
    List<Property> searchProperties(
            @Param("query") String query,
            @Param("status") PropertyStatus status,
            @Param("ownerUsername") String ownerUsername
    );
}
