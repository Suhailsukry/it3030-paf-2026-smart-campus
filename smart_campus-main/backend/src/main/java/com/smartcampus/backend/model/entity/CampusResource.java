package com.smartcampus.backend.model.entity;

import com.smartcampus.backend.model.enums.ResourceStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "resources")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampusResource {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type;

    private Integer capacity;

    @Column(nullable = false)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ResourceStatus status = ResourceStatus.ACTIVE;

    @Column(name = "availability_windows")
    private String availabilityWindows; // e.g., "Mon-Fri 8AM-5PM"
}
