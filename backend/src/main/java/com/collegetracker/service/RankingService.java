package com.collegetracker.service;

import com.collegetracker.model.MajorRanking;
import com.collegetracker.repository.MajorRankingRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RankingService {

    private final MajorRankingRepository rankingRepository;
    private final ObjectMapper objectMapper;

    @PostConstruct
    @Transactional
    public void loadRankingsFromJson() {
        ClassPathResource resource = new ClassPathResource("rankings.json");
        if (!resource.exists()) {
            log.info("rankings.json not found in classpath — skipping ranking load. " +
                     "Run the scraper with --sync to copy data into backend resources.");
            return;
        }

        try (InputStream in = resource.getInputStream()) {
            List<Map<String, Object>> majors = objectMapper.readValue(
                in, new TypeReference<>() {}
            );

            int loaded = 0;
            for (Map<String, Object> major : majors) {
                String slug = (String) major.get("slug");
                String name = (String) major.get("name");

                if (rankingRepository.existsByMajorSlug(slug)) {
                    log.debug("Rankings for '{}' already loaded, skipping.", slug);
                    continue;
                }

                @SuppressWarnings("unchecked")
                List<Map<String, Object>> rankings =
                    (List<Map<String, Object>>) major.get("rankings");

                if (rankings == null || rankings.isEmpty()) continue;

                List<MajorRanking> entities = rankings.stream()
                    .filter(r -> r.get("rank") != null && r.get("name") != null)
                    .map(r -> MajorRanking.builder()
                        .majorSlug(slug)
                        .majorName(name)
                        .rank(((Number) r.get("rank")).intValue())
                        .collegeName((String) r.get("name"))
                        .unitId((String) r.get("unitId"))
                        .build())
                    .collect(Collectors.toList());

                rankingRepository.saveAll(entities);
                loaded += entities.size();
                log.info("Loaded {} rankings for '{}'", entities.size(), name);
            }

            log.info("Ranking load complete — {} total entries across {} majors.", loaded, majors.size());
        } catch (Exception e) {
            log.error("Failed to load rankings.json: {}", e.getMessage(), e);
        }
    }

    /** Returns ranked list for a given major slug. */
    public List<MajorRanking> getRankingsForMajor(String majorSlug) {
        return rankingRepository.findByMajorSlugOrderByRankAsc(majorSlug);
    }

    /** Returns all available major slugs + names (for the frontend dropdown). */
    public List<Map<String, String>> getAvailableMajors() {
        return rankingRepository.findAll().stream()
            .collect(Collectors.groupingBy(MajorRanking::getMajorSlug))
            .entrySet().stream()
            .map(e -> Map.of(
                "slug", e.getKey(),
                "name", e.getValue().get(0).getMajorName()
            ))
            .collect(Collectors.toList());
    }
}

