package com.landchain.api.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "properties", uniqueConstraints = {
        @UniqueConstraint(columnNames = "propertyId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String propertyId;

    @Column(nullable = false, length = 100)
    private String surveyNumber;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(nullable = false, length = 100)
    private String village;

    @Column(nullable = false, length = 100)
    private String taluk;

    @Column(nullable = false, length = 100)
    private String district;

    @Column(nullable = false, length = 50)
    private String area;

    @Column(nullable = false, length = 50)
    private String propertyType;

    @Column(length = 64)
    private String ownerUsername;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private PropertyStatus status = PropertyStatus.ACTIVE;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = PropertyStatus.ACTIVE;
        }
    }
}
