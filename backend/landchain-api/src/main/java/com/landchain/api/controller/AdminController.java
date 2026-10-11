package com.landchain.api.controller;

import com.landchain.api.dto.AuditLogDTO;
import com.landchain.api.dto.UserDTO;
import com.landchain.api.entity.User;
import com.landchain.api.repository.UserRepository;
import com.landchain.api.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @GetMapping("/users")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        List<UserDTO> users = userRepository.findAll().stream()
                .map(UserDTO::from)
                .toList();
        return ResponseEntity.ok(users);
    }

    @PatchMapping("/users/{id}/toggle-status")
    public ResponseEntity<?> toggleUserStatus(@PathVariable Long id, Authentication authentication) {
        User user = userRepository.findById(id)
                .orElse(null);

        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        String currentAdminUsername = authentication != null ? authentication.getName() : "admin";
        if (user.getUsername().equalsIgnoreCase(currentAdminUsername)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Cannot disable your own administrator account."));
        }

        boolean newStatus = !user.isEnabled();
        user.setEnabled(newStatus);
        userRepository.save(user);

        String action = newStatus ? "USER_ENABLED" : "USER_DISABLED";
        String statusText = newStatus ? "activated" : "disabled";
        auditLogService.log(
                action,
                currentAdminUsername,
                "@" + user.getUsername(),
                "Account " + statusText + " by administrator",
                newStatus ? "SUCCESS" : "WARNING"
        );

        return ResponseEntity.ok(UserDTO.from(user));
    }

    @GetMapping("/logs")
    public ResponseEntity<List<AuditLogDTO>> getAuditLogs() {
        return ResponseEntity.ok(auditLogService.getLogs());
    }
}
