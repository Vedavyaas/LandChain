package com.landchain.api.blockchain.exception;

public class TransactionRejectedException extends RuntimeException {
    public TransactionRejectedException(String message) {
        super(message);
    }

    public TransactionRejectedException(String message, Throwable cause) {
        super(message, cause);
    }
}
