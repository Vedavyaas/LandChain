package com.landchain.api.config;

import com.landchain.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Extracted into its own configuration class so that
 * UserDetailsService and PasswordEncoder are created before
 * SecurityConfig, breaking the circular dependency:
 *
 *   JwtAuthenticationFilter
 *       → SecurityConfig (for UserDetailsService)
 *       → JwtAuthenticationFilter          ← cycle!
 *
 * By moving them here, the filter depends only on this class.
 */
@Configuration
@RequiredArgsConstructor
public class UserDetailsConfig {

    private final UserRepository userRepository;

    @Bean
    public UserDetailsService userDetailsService() {
        return username -> userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
