package com.collegetracker.dto;

import com.collegetracker.model.College;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CollegeDto {
    private Long id;
    private String name;
    private String city;
    private String state;
    private String website;
    private BigDecimal applicationFee;
    private BigDecimal costOfAttendanceInState;
    private BigDecimal costOfAttendanceOutState;
    private BigDecimal acceptanceRate;
    private Integer satMidpoint;
    private Integer actMidpoint;
    private String funFact;
    private String prompt1;
    private String prompt2;
    private LocalDate eaDeadline;
    private LocalDate edDeadline;
    private LocalDate rdDeadline;

    public static CollegeDto from(College c) {
        CollegeDto dto = new CollegeDto();
        dto.setId(c.getId());
        dto.setName(c.getName());
        dto.setCity(c.getCity());
        dto.setState(c.getState());
        dto.setWebsite(c.getWebsite());
        dto.setApplicationFee(c.getApplicationFee());
        dto.setCostOfAttendanceInState(c.getCostOfAttendanceInState());
        dto.setCostOfAttendanceOutState(c.getCostOfAttendanceOutState());
        dto.setAcceptanceRate(c.getAcceptanceRate());
        dto.setSatMidpoint(c.getSatMidpoint());
        dto.setActMidpoint(c.getActMidpoint());
        dto.setFunFact(c.getFunFact());
        dto.setPrompt1(c.getPrompt1());
        dto.setPrompt2(c.getPrompt2());
        dto.setEaDeadline(c.getEaDeadline());
        dto.setEdDeadline(c.getEdDeadline());
        dto.setRdDeadline(c.getRdDeadline());
        return dto;
    }
}
