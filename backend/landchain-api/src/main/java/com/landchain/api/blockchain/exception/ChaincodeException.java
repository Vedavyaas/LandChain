package com.landchain.api.blockchain.exception;

public class ChaincodeException extends RuntimeException {
    public ChaincodeException(String message) {
        super(message);
    }

    public ChaincodeException(String message, Throwable cause) {
        super(message, cause);
    }
}
