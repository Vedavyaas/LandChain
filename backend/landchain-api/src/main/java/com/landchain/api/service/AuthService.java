package com.landchain.api.service;

import com.landchain.api.dto.AuthResponse;
import com.landchain.api.dto.LoginRequest;
import com.landchain.api.dto.RegisterRequest;
import com.landchain.api.dto.UserDTO;
import com.landchain.api.entity.User;
import com.landchain.api.repository.UserRepository;
import com.landchain.api.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handles user registration and login.
 *
 * Controller → AuthService → UserRepository
 *
 * This service deliberately has no business-domain logic (properties,
 * documents) — those will be separate services in later stages.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;

    /**
     * Register a new user.
     *
     * @throws IllegalArgumentException if the username or email is already taken.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("Username already taken: " + request.username());
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already registered: " + request.email());
        }

        User user = User.builder()
                .username(request.username())
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .email(request.email())
                .role(request.role())
                .organization(request.organization())
                .build();

        userRepository.save(user);
        log.info("Registered new user: {} with role: {}", user.getUsername(), user.getRole());

        String token = jwtTokenProvider.generateToken(user);
        return AuthResponse.of(token, UserDTO.from(user));
    }

    /**
     * Authenticate an existing user and return a JWT.
     *
     * Spring Security's AuthenticationManager handles the
     * BCrypt comparison internally via DaoAuthenticationProvider.
     */
    public AuthResponse login(LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        User user = (User) auth.getPrincipal();
        log.info("User logged in: {}", user.getUsername());

        String token = jwtTokenProvider.generateToken(user);
        return AuthResponse.of(token, UserDTO.from(user));
    }
}
