package com.smartcampus.backend.controller;

import com.smartcampus.backend.model.entity.CampusResource;
import com.smartcampus.backend.service.ResourceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
public class ResourceController {

    private final ResourceService resourceService;

    @GetMapping
    public ResponseEntity<List<CampusResource>> getAllResources(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String location) {
        return ResponseEntity.ok(resourceService.getAllResources(type, location));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CampusResource> getResourceById(@PathVariable Long id) {
        return ResponseEntity.ok(resourceService.getResourceById(id));
    }

    @PostMapping("/admin")
    public ResponseEntity<CampusResource> createResource(@RequestBody CampusResource resource) {
        return new ResponseEntity<>(resourceService.createResource(resource), HttpStatus.CREATED);
    }

    @PutMapping("/admin/{id}")
    public ResponseEntity<CampusResource> updateResource(
            @PathVariable Long id, 
            @RequestBody CampusResource resource) {
        return ResponseEntity.ok(resourceService.updateResource(id, resource));
    }

    @DeleteMapping("/admin/{id}")
    public ResponseEntity<Void> deleteResource(@PathVariable Long id) {
        resourceService.deleteResource(id);
        return ResponseEntity.noContent().build();
    }
}
