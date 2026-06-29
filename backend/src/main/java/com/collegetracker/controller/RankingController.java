package com.collegetracker.controller;

import com.collegetracker.model.MajorRanking;
import com.collegetracker.service.RankingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rankings")
@RequiredArgsConstructor
public class RankingController {

    private final RankingService rankingService;

    /** GET /api/rankings/majors â€” list of available major slugs + display names */
    @GetMapping("/majors")
    public List<Map<String, String>> availableMajors() {
        return rankingService.getAvailableMajors();
    }

    /**
     * GET /api/rankings?major=computer-science
     * Returns ranked colleges for the given major.
     * Each entry: { rank, collegeName, unitId, majorSlug, majorName }
     */
    @GetMapping
    public ResponseEntity<List<MajorRanking>> rankingsForMajor(
            @RequestParam String major) {
        List<MajorRanking> rankings = rankingService.getRankingsForMajor(major);
        if (rankings.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(rankings);
    }
}

