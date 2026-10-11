package com.landchain.api.controller;

import com.landchain.api.dto.AuthResponse;
import com.landchain.api.dto.LoginRequest;
import com.landchain.api.dto.RegisterRequest;
import com.landchain.api.dto.UserDTO;
import com.landchain.api.entity.User;
import com.landchain.api.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller exposing the three auth endpoints.
 *
 *  POST /api/auth/register   → public
 *  POST /api/auth/login      → public
 *  GET  /api/auth/me         → requires valid JWT
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Returns the currently authenticated user.
     * Spring Security injects the User entity because User implements UserDetails.
     */
    @GetMapping("/me")
    public ResponseEntity<UserDTO> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(UserDTO.from(user));
    }

    /** Global exception handler for this controller — returns a clean JSON error body. */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }
}
