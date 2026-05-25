package com.collegetracker.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AddCollegeRequest {
    @NotNull
    private Long collegeId;

    @NotNull
    private String applicationType;

    private String notes;
}
