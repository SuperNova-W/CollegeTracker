package com.collegetracker.service;

import com.collegetracker.model.College;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class CollegeScorecardService {

    @Value("${college.scorecard.api-key}")
    private String apiKey;

    @Value("${college.scorecard.base-url}")
    private String baseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String FIELDS =
            "id,school.name,school.city,school.state,school.school_url," +
            "latest.cost.avg_net_price.overall," +
            "latest.cost.tuition.in_state,latest.cost.tuition.out_of_state," +
            "latest.admissions.admission_rate.overall," +
            "latest.admissions.sat_scores.midpoint.critical_reading," +
            "latest.admissions.act_scores.midpoint.cumulative";

    @SuppressWarnings("unchecked")
    public List<College> searchColleges(String query, int page, int perPage) {
        String url = UriComponentsBuilder.fromHttpUrl(baseUrl)
                .queryParam("api_key", apiKey)
                .queryParam("school.name", query)
                .queryParam("fields", FIELDS)
                .queryParam("per_page", perPage)
                .queryParam("page", page)
                .queryParam("school.degrees_awarded.predominant", 3) // Bachelor's
                .build()
                .toUriString();

        try {
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response == null) return List.of();

            List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
            if (results == null) return List.of();

            List<College> colleges = new ArrayList<>();
            for (Map<String, Object> result : results) {
                colleges.add(mapToCollege(result));
            }
            return colleges;
        } catch (Exception e) {
            log.error("College Scorecard API error: {}", e.getMessage());
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private College mapToCollege(Map<String, Object> data) {
        Map<String, Object> school = (Map<String, Object>) data.getOrDefault("school", Map.of());
        Map<String, Object> latest = (Map<String, Object>) data.getOrDefault("latest", Map.of());
        Map<String, Object> cost = (Map<String, Object>) latest.getOrDefault("cost", Map.of());
        Map<String, Object> tuition = (Map<String, Object>) cost.getOrDefault("tuition", Map.of());
        Map<String, Object> admissions = (Map<String, Object>) latest.getOrDefault("admissions", Map.of());
        Map<String, Object> admissionRate = (Map<String, Object>) admissions.getOrDefault("admission_rate", Map.of());
        Map<String, Object> avgNetPrice = (Map<String, Object>) cost.getOrDefault("avg_net_price", Map.of());

        return College.builder()
                .unitId(String.valueOf(data.get("id")))
                .name(String.valueOf(school.getOrDefault("name", "Unknown")))
                .city(String.valueOf(school.getOrDefault("city", "")))
                .state(String.valueOf(school.getOrDefault("state", "")))
                .website(String.valueOf(school.getOrDefault("school_url", "")))
                .costOfAttendanceInState(toBigDecimal(tuition.get("in_state")))
                .costOfAttendanceOutState(toBigDecimal(tuition.get("out_of_state")))
                .acceptanceRate(toBigDecimal(admissionRate.get("overall")))
                .applicationFee(new BigDecimal("75"))
                .build();
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) return null;
        try {
            return new BigDecimal(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
