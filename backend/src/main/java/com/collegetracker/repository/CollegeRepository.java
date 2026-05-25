package com.collegetracker.repository;

import com.collegetracker.model.College;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CollegeRepository extends JpaRepository<College, Long> {

    @Query("SELECT c FROM College c WHERE LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<College> searchByName(@Param("query") String query);

    boolean existsByUnitId(String unitId);
}
