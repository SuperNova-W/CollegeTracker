package com.collegetracker.repository;

import com.collegetracker.model.UserCollege;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserCollegeRepository extends JpaRepository<UserCollege, Long> {

    List<UserCollege> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<UserCollege> findByUserIdAndCollegeId(String userId, Long collegeId);

    boolean existsByUserIdAndCollegeId(String userId, Long collegeId);
}
