package com.smartcampus.backend.service;

import com.smartcampus.backend.exception.ResourceNotFoundException;
import com.smartcampus.backend.model.entity.CampusResource;
import com.smartcampus.backend.model.enums.ResourceStatus;
import com.smartcampus.backend.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ResourceService {
    
    private final ResourceRepository resourceRepository;

    public List<CampusResource> getAllResources(String type, String location) {
        if ((type != null && !type.isEmpty()) || (location != null && !location.isEmpty())) {
            return resourceRepository.findByTypeContainingIgnoreCaseAndLocationContainingIgnoreCase(
                    type != null ? type : "", 
                    location != null ? location : "");
        }
        return resourceRepository.findAll();
    }

    public CampusResource getResourceById(Long id) {
        return resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));
    }

    public CampusResource createResource(CampusResource resource) {
        return resourceRepository.save(resource);
    }

    public CampusResource updateResource(Long id, CampusResource resourceDetails) {
        CampusResource resource = getResourceById(id);
        
        resource.setName(resourceDetails.getName());
        resource.setType(resourceDetails.getType());
        resource.setCapacity(resourceDetails.getCapacity());
        resource.setLocation(resourceDetails.getLocation());
        resource.setStatus(resourceDetails.getStatus());
        resource.setAvailabilityWindows(resourceDetails.getAvailabilityWindows());
        
        return resourceRepository.save(resource);
    }

    public void deleteResource(Long id) {
        CampusResource resource = getResourceById(id);
        // Soft delete or status change
        resource.setStatus(ResourceStatus.OUT_OF_SERVICE);
        resourceRepository.save(resource);
    }
}
