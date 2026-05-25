package com.collegetracker.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "colleges")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class College {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String unitId;
    private String city;
    private String state;
    private String website;

    private BigDecimal applicationFee;
    private BigDecimal costOfAttendanceInState;
    private BigDecimal costOfAttendanceOutState;

    @Column(precision = 5, scale = 4)
    private BigDecimal acceptanceRate;

    private Integer satMidpoint;
    private Integer actMidpoint;

    @Column(columnDefinition = "TEXT")
    private String funFact;

    @Column(columnDefinition = "TEXT")
    private String prompt1;

    @Column(columnDefinition = "TEXT")
    private String prompt2;

    private LocalDate eaDeadline;
    private LocalDate edDeadline;
    private LocalDate rdDeadline;
}
