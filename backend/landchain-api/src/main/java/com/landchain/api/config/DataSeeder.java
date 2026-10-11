package com.landchain.api.config;

import com.landchain.api.entity.Role;
import com.landchain.api.entity.User;
import com.landchain.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

/**
 * DataSeeder — runs once on startup (after schema creation).
 *
 * Seeds every role with realistic sample accounts so the app
 * is immediately usable for demo and testing without any manual
 * API calls.
 *
 * All seed users have the same password pattern:
 *   <username>@landchain123
 * e.g. admin1@landchain123, owner1@landchain123
 *
 * Idempotent — skips any user that already exists by username.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataSeeder {

    record SeedUser(
            String username,
            String fullName,
            String email,
            Role role,
            String organization
    ) {}

    @Bean
    CommandLineRunner seedDatabase(UserRepository userRepo, PasswordEncoder encoder) {
        return args -> {
            List<SeedUser> seeds = List.of(

                // ── ADMIN ────────────────────────────────────────────────────────
                new SeedUser("admin1",
                        "Admin Operator 01",
                        "admin1@demo.landchain.local",
                        Role.ADMIN,
                        "LandChain Demo Auth"),

                // ── GOVERNMENT ───────────────────────────────────────────────────
                new SeedUser("government1",
                        "Gov Officer Demo 1",
                        "gov1@demo.landchain.local",
                        Role.GOVERNMENT,
                        "Demo Land Authority"),

                new SeedUser("government2",
                        "Gov Officer Demo 2",
                        "gov2@demo.landchain.local",
                        Role.GOVERNMENT,
                        "Demo Revenue Office"),

                // ── REGISTRAR ────────────────────────────────────────────────────
                new SeedUser("registrar1",
                        "Registrar Desk 01",
                        "registrar1@demo.landchain.local",
                        Role.REGISTRAR,
                        "Sub-Registrar Unit A"),

                new SeedUser("registrar2",
                        "Registrar Desk 02",
                        "registrar2@demo.landchain.local",
                        Role.REGISTRAR,
                        "Sub-Registrar Unit B"),

                // ── OWNER ────────────────────────────────────────────────────────
                new SeedUser("owner1",
                        "Demo Owner Alpha",
                        "owner1@demo.landchain.local",
                        Role.OWNER,
                        null),

                new SeedUser("owner2",
                        "Demo Owner Beta",
                        "owner2@demo.landchain.local",
                        Role.OWNER,
                        null),

                new SeedUser("owner3",
                        "Demo Owner Gamma",
                        "owner3@demo.landchain.local",
                        Role.OWNER,
                        null),

                // ── BUYER ────────────────────────────────────────────────────────
                new SeedUser("buyer1",
                        "Demo Buyer Alpha",
                        "buyer1@demo.landchain.local",
                        Role.BUYER,
                        null),

                new SeedUser("buyer2",
                        "Demo Buyer Beta",
                        "buyer2@demo.landchain.local",
                        Role.BUYER,
                        null),

                // ── BANK ─────────────────────────────────────────────────────────
                new SeedUser("bank1",
                        "Bank Agent Demo 1",
                        "bank1@demo.landchain.local",
                        Role.BANK,
                        "Demo Commercial Bank"),

                new SeedUser("bank2",
                        "Bank Agent Demo 2",
                        "bank2@demo.landchain.local",
                        Role.BANK,
                        "Demo Apex Bank"),

                // ── AUDITOR ──────────────────────────────────────────────────────
                new SeedUser("auditor1",
                        "Auditor Desk Demo 1",
                        "auditor1@demo.landchain.local",
                        Role.AUDITOR,
                        "Demo Oversight Bureau"),

                new SeedUser("auditor2",
                        "Auditor Desk Demo 2",
                        "auditor2@demo.landchain.local",
                        Role.AUDITOR,
                        "Demo Compliance Unit")
            );

            int created = 0;
            for (SeedUser s : seeds) {
                if (userRepo.existsByUsername(s.username())) {
                    log.debug("Skipping existing seed user: {}", s.username());
                    continue;
                }
                User user = User.builder()
                        .username(s.username())
                        .passwordHash(encoder.encode(s.username() + "@landchain123"))
                        .fullName(s.fullName())
                        .email(s.email())
                        .role(s.role())
                        .organization(s.organization())
                        .build();
                userRepo.save(user);
                created++;
                log.info("✓ Seeded [{}/{}] {} — {}", s.role(), s.username(), s.fullName(), s.email());
            }

            if (created > 0) {
                log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                log.info("  LandChain seed complete: {} users created", created);
                log.info("  Password pattern: <username>@landchain123");
                log.info("  e.g. login: owner1 / owner1@landchain123");
                log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            } else {
                log.info("All seed users already exist — skipping seed.");
            }
        };
    }
}
