package com.landchain.api.dto;

import com.landchain.api.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Payload sent by the client to create a new account. */
public record RegisterRequest(

        @NotBlank @Size(min = 3, max = 50)
        String username,

        @NotBlank @Size(min = 8, max = 100)
        String password,

        @NotBlank @Size(max = 100)
        String fullName,

        @NotBlank @Email
        String email,

        @NotNull
        Role role,

        /** Optional for OWNER / BUYER; required for GOVERNMENT / REGISTRAR / BANK */
        String organization
) {}
