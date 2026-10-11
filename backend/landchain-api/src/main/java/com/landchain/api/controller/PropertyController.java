package com.landchain.api.controller;

import com.landchain.api.dto.CreatePropertyRequest;
import com.landchain.api.dto.PropertyDTO;
import com.landchain.api.dto.UpdatePropertyRequest;
import com.landchain.api.dto.UserDTO;
import com.landchain.api.entity.PropertyStatus;
import com.landchain.api.entity.Role;
import com.landchain.api.repository.UserRepository;
import com.landchain.api.service.PropertyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/properties")
@RequiredArgsConstructor
public class PropertyController {

    private final PropertyService propertyService;
    private final UserRepository userRepository;

    /**
     * Get list of registered citizen property owners (for Government onboarding dropdown).
     */
    @GetMapping("/owners")
    @PreAuthorize("hasAnyRole('GOVERNMENT', 'REGISTRAR')")
    public ResponseEntity<List<UserDTO>> getRegisteredOwners() {
        List<UserDTO> owners = userRepository.findByRole(Role.OWNER).stream()
                .map(UserDTO::from)
                .toList();
        return ResponseEntity.ok(owners);
    }

    /**
     * Register a new property.
     * Restricted strictly to GOVERNMENT role.
     */
    @PostMapping
    @PreAuthorize("hasRole('GOVERNMENT')")
    public ResponseEntity<PropertyDTO> createProperty(
            @Valid @RequestBody CreatePropertyRequest request,
            Authentication authentication
    ) {
        String actor = authentication != null ? authentication.getName() : "government";
        PropertyDTO created = propertyService.createProperty(request, actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Search and list registered properties.
     * Restricted to operational registry participants (Admin excluded).
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'GOVERNMENT', 'REGISTRAR', 'BANK', 'AUDITOR')")
    public ResponseEntity<List<PropertyDTO>> getProperties(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) PropertyStatus status,
            @RequestParam(required = false) String owner,
            @RequestParam(required = false) Boolean myPropertiesOnly,
            Authentication authentication
    ) {
        String ownerFilter = owner;
        if (Boolean.TRUE.equals(myPropertiesOnly) && authentication != null) {
            ownerFilter = authentication.getName();
        }
        List<PropertyDTO> properties = propertyService.searchProperties(query, status, ownerFilter);
        return ResponseEntity.ok(properties);
    }

    /**
     * Get property details by unique business propertyId.
     * Restricted to operational registry participants (Admin excluded).
     */
    @GetMapping("/{propertyId}")
    @PreAuthorize("hasAnyRole('OWNER', 'GOVERNMENT', 'REGISTRAR', 'BANK', 'AUDITOR')")
    public ResponseEntity<PropertyDTO> getProperty(@PathVariable String propertyId) {
        PropertyDTO property = propertyService.getProperty(propertyId);
        return ResponseEntity.ok(property);
    }

    /**
     * Update property details.
     * Restricted strictly to GOVERNMENT role.
     */
    @PutMapping("/{propertyId}")
    @PreAuthorize("hasRole('GOVERNMENT')")
    public ResponseEntity<PropertyDTO> updateProperty(
            @PathVariable String propertyId,
            @RequestBody UpdatePropertyRequest request,
            Authentication authentication
    ) {
        String actor = authentication != null ? authentication.getName() : "government";
        PropertyDTO updated = propertyService.updateProperty(propertyId, request, actor);
        return ResponseEntity.ok(updated);
    }
}
