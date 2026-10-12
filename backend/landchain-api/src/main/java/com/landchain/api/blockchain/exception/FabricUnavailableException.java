package com.landchain.api.blockchain.exception;

public class FabricUnavailableException extends RuntimeException {
    public FabricUnavailableException(String message) {
        super(message);
    }

    public FabricUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
