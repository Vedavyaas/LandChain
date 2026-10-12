package com.landchain.api.repository;

import com.landchain.api.entity.BuyRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BuyRequestRepository extends JpaRepository<BuyRequest, Long> {
    List<BuyRequest> findByPropertyIdOrderByCreatedAtDesc(String propertyId);
    List<BuyRequest> findByBuyerUsernameOrderByCreatedAtDesc(String buyerUsername);
    Optional<BuyRequest> findByRequestId(String requestId);
}
