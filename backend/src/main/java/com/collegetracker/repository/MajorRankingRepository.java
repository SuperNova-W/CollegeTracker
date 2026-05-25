package com.collegetracker.repository;

import com.collegetracker.model.MajorRanking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MajorRankingRepository extends JpaRepository<MajorRanking, Long> {

    List<MajorRanking> findByMajorSlugOrderByRankAsc(String majorSlug);

    List<MajorRanking> findDistinctMajorSlugBy();

    boolean existsByMajorSlug(String majorSlug);
}
