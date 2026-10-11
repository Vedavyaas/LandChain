package com.landchain.api.dto;

import com.landchain.api.entity.Role;

/**
 * JWT response returned after a successful login or registration.
 * The token field is used as a Bearer token in subsequent requests.
 */
public record AuthResponse(
        String token,
        String tokenType,   // always "Bearer"
        UserDTO user
) {
    public static AuthResponse of(String token, UserDTO user) {
        return new AuthResponse(token, "Bearer", user);
    }
}
