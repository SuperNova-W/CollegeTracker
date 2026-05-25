package com.collegetracker.service;

import com.collegetracker.model.College;
import com.collegetracker.model.UserCollege;
import com.collegetracker.model.UserCollege.ApplicationType;
import com.collegetracker.repository.CollegeRepository;
import com.collegetracker.repository.UserCollegeRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CollegeService {

    private final CollegeRepository collegeRepository;
    private final UserCollegeRepository userCollegeRepository;
    private final CollegeScorecardService scorecardService;

    @PostConstruct
    public void seedColleges() {
        if (collegeRepository.count() > 0) return;
        log.info("Seeding colleges from College Scorecard API...");

        String[] popularColleges = {
            "Massachusetts Institute of Technology",
            "Stanford University",
            "Harvard University",
            "University of California Berkeley",
            "Carnegie Mellon University",
            "University of Michigan",
            "Georgia Institute of Technology",
            "University of Texas Austin",
            "Princeton University",
            "Columbia University"
        };

        for (String name : popularColleges) {
            List<College> results = scorecardService.searchColleges(name, 0, 1);
            if (!results.isEmpty()) {
                College college = results.get(0);
                enrichWithStaticData(college, name);
                collegeRepository.save(college);
                log.info("Seeded: {}", college.getName());
            }
        }

        log.info("Seeding complete. {} colleges saved.", collegeRepository.count());
    }

    private void enrichWithStaticData(College college, String searchName) {
        // Deadlines and prompts that aren't in the Scorecard API
        switch (searchName) {
            case "Massachusetts Institute of Technology" -> {
                college.setEaDeadline(LocalDate.of(2025, 11, 1));
                college.setRdDeadline(LocalDate.of(2026, 1, 1));
                college.setFunFact("MIT's mascot is Tim the Beaver, chosen because beavers are nature's engineers.");
                college.setPrompt1("We know you lead a busy life, full of activities, many of which are required of you. Tell us about something you do simply for the pleasure of it.");
                college.setPrompt2("Describe the world you come from—for example, your family, community, or school—and tell us how it has shaped your dreams and aspirations.");
            }
            case "Stanford University" -> {
                college.setEaDeadline(LocalDate.of(2025, 11, 1));
                college.setRdDeadline(LocalDate.of(2026, 1, 2));
                college.setFunFact("Stanford's founders were inspired by Cornell University and wanted to create a university to serve the Pacific Coast.");
                college.setPrompt1("The Stanford community is deeply curious and driven to learn in and out of the classroom. Reflect on an idea or experience that makes you genuinely excited about learning.");
                college.setPrompt2("Virtually all of Stanford's undergraduates live on campus. Write a note to your future roommate that reveals something about who you are or what you hope your experience at Stanford will be like.");
            }
            case "Harvard University" -> {
                college.setEaDeadline(LocalDate.of(2025, 11, 1));
                college.setRdDeadline(LocalDate.of(2026, 1, 1));
                college.setFunFact("Harvard's library system is the largest academic library in the world, with over 20 million items.");
                college.setPrompt1("Describe a challenge you have faced and what you have learned from it.");
                college.setPrompt2("How has your background influenced your perspective on the world?");
            }
            default -> {
                college.setRdDeadline(LocalDate.of(2026, 1, 15));
                college.setFunFact("One of the top universities in the United States.");
                college.setPrompt1("Describe a meaningful experience and what you learned from it.");
                college.setPrompt2("What makes you a unique addition to our campus community?");
            }
        }
    }

    public List<College> getAllColleges() {
        return collegeRepository.findAll();
    }

    public List<College> searchColleges(String query) {
        return collegeRepository.searchByName(query);
    }

    public Optional<College> getCollege(Long id) {
        return collegeRepository.findById(id);
    }

    public List<UserCollege> getUserColleges(String userId) {
        return userCollegeRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public UserCollege addUserCollege(String userId, Long collegeId, ApplicationType type, String notes) {
        if (userCollegeRepository.existsByUserIdAndCollegeId(userId, collegeId)) {
            throw new IllegalStateException("College already in your list");
        }
        College college = collegeRepository.findById(collegeId)
                .orElseThrow(() -> new IllegalArgumentException("College not found"));

        return userCollegeRepository.save(UserCollege.builder()
                .userId(userId)
                .college(college)
                .applicationType(type)
                .notes(notes)
                .build());
    }

    @Transactional
    public UserCollege updateUserCollege(String userId, Long userCollegeId, ApplicationType type, String notes) {
        UserCollege uc = userCollegeRepository.findById(userCollegeId)
                .filter(u -> u.getUserId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("Not found"));
        uc.setApplicationType(type);
        uc.setNotes(notes);
        return userCollegeRepository.save(uc);
    }

    @Transactional
    public void removeUserCollege(String userId, Long userCollegeId) {
        UserCollege uc = userCollegeRepository.findById(userCollegeId)
                .filter(u -> u.getUserId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("Not found"));
        userCollegeRepository.delete(uc);
    }
}
