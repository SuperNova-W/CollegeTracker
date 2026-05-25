package com.collegetracker.controller;

import com.collegetracker.dto.CollegeDto;
import com.collegetracker.service.CollegeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/colleges")
@RequiredArgsConstructor
public class CollegeController {

    private final CollegeService collegeService;

    @GetMapping
    public List<CollegeDto> listColleges(@RequestParam(required = false) String search) {
        if (search != null && !search.isBlank()) {
            return collegeService.searchColleges(search).stream()
                    .map(CollegeDto::from).toList();
        }
        return collegeService.getAllColleges().stream()
                .map(CollegeDto::from).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<CollegeDto> getCollege(@PathVariable Long id) {
        return collegeService.getCollege(id)
                .map(CollegeDto::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
