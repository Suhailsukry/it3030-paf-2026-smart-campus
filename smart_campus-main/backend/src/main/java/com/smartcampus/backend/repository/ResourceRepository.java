package com.smartcampus.backend.repository;

import com.smartcampus.backend.model.entity.CampusResource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResourceRepository extends JpaRepository<CampusResource, Long> {
    List<CampusResource> findByTypeContainingIgnoreCaseAndLocationContainingIgnoreCase(String type, String location);
}
