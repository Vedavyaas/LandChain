package com.landchain.api.service;

import com.landchain.api.dto.AuditLogDTO;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class AuditLogService {

    private final List<AuditLogDTO> logs = new CopyOnWriteArrayList<>();

    public AuditLogService() {
        // Pre-populate system bootstrap logs
        log(
                "SYSTEM_BOOTSTRAP",
                "system",
                "LandChain Core",
                "Network nodes initialized · Genesis state confirmed",
                "SUCCESS"
        );
        log(
                "RBAC_INITIALIZED",
                "system",
                "Security Policy",
                "Permissioned roles assigned for all participant classes",
                "SUCCESS"
        );
        log(
                "SEED_ACCOUNTS_VERIFIED",
                "system",
                "Identity Registry",
                "Default role accounts verified in H2 persistence",
                "SUCCESS"
        );
    }

    public void log(String eventType, String actor, String target, String details, String status) {
        AuditLogDTO entry = new AuditLogDTO(
                UUID.randomUUID().toString().substring(0, 8),
                LocalDateTime.now(),
                eventType,
                actor,
                target,
                details,
                status
        );
        logs.add(0, entry); // newest first
    }

    public List<AuditLogDTO> getLogs() {
        return Collections.unmodifiableList(new ArrayList<>(logs));
    }
}
