package com.landchain.api.dto;

import com.landchain.api.entity.Role;
import com.landchain.api.entity.User;

import java.time.LocalDateTime;

/**
 * Safe user projection — never exposes passwordHash.
 * Used by /me and embedded inside AuthResponse.
 */
public record UserDTO(
        Long id,
        String username,
        String fullName,
        String email,
        Role role,
        String organization,
        boolean enabled,
        LocalDateTime createdAt
) {
    /** Factory method to convert a User entity → UserDTO cleanly. */
    public static UserDTO from(User user) {
        return new UserDTO(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                user.getOrganization(),
                user.isEnabled(),
                user.getCreatedAt()
        );
    }
}
