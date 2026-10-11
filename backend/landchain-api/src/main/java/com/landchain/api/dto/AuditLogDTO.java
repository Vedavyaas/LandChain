package com.landchain.api.dto;

import java.time.LocalDateTime;

public record AuditLogDTO(
        String id,
        LocalDateTime timestamp,
        String eventType,
        String actor,
        String target,
        String details,
        String status
) {}
