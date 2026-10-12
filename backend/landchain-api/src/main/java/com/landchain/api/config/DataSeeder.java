package com.landchain.api.config;

import com.landchain.api.entity.Document;
import com.landchain.api.entity.DocumentType;
import com.landchain.api.entity.Property;
import com.landchain.api.entity.PropertyStatus;
import com.landchain.api.entity.Role;
import com.landchain.api.entity.User;
import com.landchain.api.repository.DocumentRepository;
import com.landchain.api.repository.PropertyRepository;
import com.landchain.api.repository.UserRepository;
import com.landchain.api.service.DocumentService;
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
    CommandLineRunner seedDatabase(
            UserRepository userRepo,
            PasswordEncoder encoder,
            PropertyRepository propertyRepo,
            DocumentRepository documentRepo,
            com.landchain.api.blockchain.service.PropertyContractService propertyContractService,
            com.landchain.api.blockchain.service.DocumentContractService documentContractService
    ) {
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

                // ── CITIZEN PARTICIPANTS (OWNER / BUYER) ────────────────────────
                new SeedUser("buyer1",
                        "Demo Citizen Buyer Alpha",
                        "buyer1@demo.landchain.local",
                        Role.OWNER,
                        null),

                new SeedUser("buyer2",
                        "Demo Citizen Buyer Beta",
                        "buyer2@demo.landchain.local",
                        Role.OWNER,
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
                log.info("All seed users already exist — skipping user seed.");
            }

            // ── SEED PROPERTIES & REGISTER ON BLOCKCHAIN (Step 2 & 4) ────────
            if (!propertyRepo.existsByPropertyId("PROP-100201")) {
                var tx1 = propertyContractService.registerProperty(
                        "PROP-100201", "142/3A", "Plot 45, Green Meadows Avenue",
                        "Kengeri", "Bengaluru South", "Bengaluru Urban", "2,400 sq.ft",
                        "RESIDENTIAL", "owner1", "government1", "GovernmentMSP"
                );
                Property p1 = Property.builder()
                        .propertyId("PROP-100201")
                        .surveyNumber("142/3A")
                        .address("Plot 45, Green Meadows Avenue")
                        .village("Kengeri")
                        .taluk("Bengaluru South")
                        .district("Bengaluru Urban")
                        .area("2,400 sq.ft")
                        .propertyType("RESIDENTIAL")
                        .ownerUsername("owner1")
                        .status(PropertyStatus.ACTIVE)
                        .blockchainTxId(tx1.getTxId())
                        .blockchainBlockNumber(tx1.getBlockNumber())
                        .build();
                propertyRepo.save(p1);

                var tx2 = propertyContractService.registerProperty(
                        "PROP-100202", "88/1B", "Tech Zone Block 4, EPIP",
                        "Whitefield", "Bengaluru East", "Bengaluru Urban", "15,000 sq.ft",
                        "COMMERCIAL", "owner2", "government1", "GovernmentMSP"
                );
                Property p2 = Property.builder()
                        .propertyId("PROP-100202")
                        .surveyNumber("88/1B")
                        .address("Tech Zone Block 4, EPIP")
                        .village("Whitefield")
                        .taluk("Bengaluru East")
                        .district("Bengaluru Urban")
                        .area("15,000 sq.ft")
                        .propertyType("COMMERCIAL")
                        .ownerUsername("owner2")
                        .status(PropertyStatus.ACTIVE)
                        .blockchainTxId(tx2.getTxId())
                        .blockchainBlockNumber(tx2.getBlockNumber())
                        .build();
                propertyRepo.save(p2);

                var tx3 = propertyContractService.registerProperty(
                        "PROP-100203", "314/7", "Greenfield Agricultural Sector",
                        "Nelamangala", "Nelamangala", "Bengaluru Rural", "2.5 Acres",
                        "AGRICULTURAL", "owner1", "government1", "GovernmentMSP"
                );
                Property p3 = Property.builder()
                        .propertyId("PROP-100203")
                        .surveyNumber("314/7")
                        .address("Greenfield Agricultural Sector")
                        .village("Nelamangala")
                        .taluk("Nelamangala")
                        .district("Bengaluru Rural")
                        .area("2.5 Acres")
                        .propertyType("AGRICULTURAL")
                        .ownerUsername("owner1")
                        .status(PropertyStatus.ACTIVE)
                        .blockchainTxId(tx3.getTxId())
                        .blockchainBlockNumber(tx3.getBlockNumber())
                        .build();
                propertyRepo.save(p3);

                log.info("✓ Seeded and committed 3 Properties to Hyperledger Fabric: PROP-100201, PROP-100202, PROP-100203");

                // Seed sample deed document on disk with real SHA-256 and register on Fabric
                try {
                    java.nio.file.Path storageDir = java.nio.file.Paths.get("storage/documents").toAbsolutePath().normalize();
                    java.nio.file.Files.createDirectories(storageDir);

                    String docId = "DOC-501101";
                    String fileName = "sale-deed.pdf";
                    java.nio.file.Path filePath = storageDir.resolve(docId + "_" + fileName);

                    byte[] samplePdfBytes = (
                            "%PDF-1.4\n" +
                            "1 0 obj << /Title (LandChain Registered Sale Deed) /Author (Sub-Registrar Unit) >> endobj\n" +
                            "2 0 obj << /PropertyId (PROP-100201) /SurveyNumber (142/3A) >> endobj\n" +
                            "trailer << /Root 1 0 R >>\n%%EOF"
                    ).getBytes(java.nio.charset.StandardCharsets.UTF_8);

                    java.nio.file.Files.write(filePath, samplePdfBytes, java.nio.file.StandardOpenOption.CREATE, java.nio.file.StandardOpenOption.TRUNCATE_EXISTING);

                    String sha256 = DocumentService.computeSha256(samplePdfBytes);

                    var docTx = documentContractService.registerDocumentHash(
                            docId, "PROP-100201", "SALE_DEED", sha256, "registrar1", "RegistrarMSP"
                    );

                    Document deedDoc = Document.builder()
                            .documentId(docId)
                            .propertyId("PROP-100201")
                            .documentType(DocumentType.SALE_DEED)
                            .originalFileName(fileName)
                            .storagePath(filePath.toString())
                            .sha256Hash(sha256)
                            .blockchainTxId(docTx.getTxId())
                            .blockchainBlockNumber(docTx.getBlockNumber())
                            .build();

                    documentRepo.save(deedDoc);
                    log.info("✓ Seeded Document [{}] on Fabric for PROP-100201 (Tx: {}, SHA-256: {})",
                            docId, docTx.getTxId(), sha256);
                } catch (Exception e) {
                    log.warn("Could not seed physical sample deed file: {}", e.getMessage());
                }
            }
        };
    }
}
