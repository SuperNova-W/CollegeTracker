package com.collegetracker.dto;

import com.collegetracker.model.UserCollege;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class UserCollegeDto {
    private Long id;
    private CollegeDto college;
    private String applicationType;
    private String notes;
    private LocalDate deadline;
    private LocalDateTime createdAt;

    public static UserCollegeDto from(UserCollege uc) {
        UserCollegeDto dto = new UserCollegeDto();
        dto.setId(uc.getId());
        dto.setCollege(CollegeDto.from(uc.getCollege()));
        dto.setApplicationType(uc.getApplicationType().name());
        dto.setNotes(uc.getNotes());
        dto.setCreatedAt(uc.getCreatedAt());

        // Resolve the specific deadline based on application type
        dto.setDeadline(switch (uc.getApplicationType()) {
            case EA -> uc.getCollege().getEaDeadline();
            case ED -> uc.getCollege().getEdDeadline();
            case RD -> uc.getCollege().getRdDeadline();
        });

        return dto;
    }
}
