package com.landchain.api.entity;

/**
 * Defines every actor that can interact with LandChain.
 * Additional roles can be added in later stages without breaking existing code.
 */
public enum Role {
    ADMIN,
    GOVERNMENT,
    REGISTRAR,
    OWNER,
    BUYER,
    BANK,
    AUDITOR
}
