package com.collegetracker.controller;

import com.collegetracker.dto.AddCollegeRequest;
import com.collegetracker.dto.UserCollegeDto;
import com.collegetracker.model.UserCollege.ApplicationType;
import com.collegetracker.service.CollegeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user/colleges")
@RequiredArgsConstructor
public class UserCollegeController {

    private final CollegeService collegeService;

    @GetMapping
    public List<UserCollegeDto> getUserColleges(@RequestAttribute("userId") String userId) {
        return collegeService.getUserColleges(userId).stream()
                .map(UserCollegeDto::from).toList();
    }

    @PostMapping
    public ResponseEntity<?> addCollege(
            @RequestAttribute("userId") String userId,
            @Valid @RequestBody AddCollegeRequest req) {
        try {
            ApplicationType type = ApplicationType.valueOf(req.getApplicationType());
            var result = collegeService.addUserCollege(userId, req.getCollegeId(), type, req.getNotes());
            return ResponseEntity.status(HttpStatus.CREATED).body(UserCollegeDto.from(result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCollege(
            @RequestAttribute("userId") String userId,
            @PathVariable Long id,
            @Valid @RequestBody AddCollegeRequest req) {
        try {
            ApplicationType type = ApplicationType.valueOf(req.getApplicationType());
            var result = collegeService.updateUserCollege(userId, id, type, req.getNotes());
            return ResponseEntity.ok(UserCollegeDto.from(result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removeCollege(
            @RequestAttribute("userId") String userId,
            @PathVariable Long id) {
        try {
            collegeService.removeUserCollege(userId, id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
