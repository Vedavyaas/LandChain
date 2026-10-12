package com.landchain.api.blockchain.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class BlockchainExceptionHandler {

    @ExceptionHandler(FabricUnavailableException.class)
    public ResponseEntity<Map<String, Object>> handleFabricUnavailable(FabricUnavailableException ex) {
        log.error("Blockchain error [503 Service Unavailable]: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(buildErrorBody(
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                "FABRIC_UNAVAILABLE",
                ex.getMessage()
        ));
    }

    @ExceptionHandler(UnauthorizedOrganizationException.class)
    public ResponseEntity<Map<String, Object>> handleUnauthorizedOrg(UnauthorizedOrganizationException ex) {
        log.warn("Blockchain error [403 Forbidden]: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(buildErrorBody(
                HttpStatus.FORBIDDEN.value(),
                "UNAUTHORIZED_ORGANIZATION",
                ex.getMessage()
        ));
    }

    @ExceptionHandler(InvalidPropertyException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidProperty(InvalidPropertyException ex) {
        log.warn("Blockchain error [404 Not Found]: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(buildErrorBody(
                HttpStatus.NOT_FOUND.value(),
                "INVALID_PROPERTY",
                ex.getMessage()
        ));
    }

    @ExceptionHandler(InvalidOwnerException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidOwner(InvalidOwnerException ex) {
        log.warn("Blockchain error [400 Bad Request]: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(buildErrorBody(
                HttpStatus.BAD_REQUEST.value(),
                "INVALID_OWNER",
                ex.getMessage()
        ));
    }

    @ExceptionHandler(PropertyFrozenException.class)
    public ResponseEntity<Map<String, Object>> handlePropertyFrozen(PropertyFrozenException ex) {
        log.warn("Blockchain error [409 Conflict]: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(buildErrorBody(
                HttpStatus.CONFLICT.value(),
                "PROPERTY_FROZEN",
                ex.getMessage()
        ));
    }

    @ExceptionHandler(PropertyMortgagedException.class)
    public ResponseEntity<Map<String, Object>> handlePropertyMortgaged(PropertyMortgagedException ex) {
        log.warn("Blockchain error [409 Conflict]: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(buildErrorBody(
                HttpStatus.CONFLICT.value(),
                "PROPERTY_MORTGAGED",
                ex.getMessage()
        ));
    }

    @ExceptionHandler(ChaincodeException.class)
    public ResponseEntity<Map<String, Object>> handleChaincodeException(ChaincodeException ex) {
        log.warn("Blockchain error [400 Bad Request]: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(buildErrorBody(
                HttpStatus.BAD_REQUEST.value(),
                "CHAINCODE_VALIDATION_FAILURE",
                ex.getMessage()
        ));
    }

    @ExceptionHandler(TransactionRejectedException.class)
    public ResponseEntity<Map<String, Object>> handleTransactionRejected(TransactionRejectedException ex) {
        log.error("Blockchain error [400 Transaction Rejected]: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(buildErrorBody(
                HttpStatus.BAD_REQUEST.value(),
                "TRANSACTION_REJECTED",
                ex.getMessage()
        ));
    }

    private Map<String, Object> buildErrorBody(int status, String errorCode, String message) {
        return Map.of(
                "status", status,
                "error", errorCode,
                "message", message,
                "timestamp", LocalDateTime.now().toString()
        );
    }
}
