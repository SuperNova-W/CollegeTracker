package com.collegetracker.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Entity
@Table(
    name = "major_rankings",
    uniqueConstraints = @UniqueConstraint(columnNames = {"major_slug", "rank"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MajorRanking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "major_slug", nullable = false)
    private String majorSlug;

    @Column(name = "major_name", nullable = false)
    private String majorName;

    @Column(nullable = false)
    private Integer rank;

    @Column(nullable = false)
    private String collegeName;

    // College Scorecard unit ID — matched during load, may be null for unmatched schools
    private String unitId;
}
