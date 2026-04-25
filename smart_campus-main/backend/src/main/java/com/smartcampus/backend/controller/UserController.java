package com.smartcampus.backend.controller;

import com.smartcampus.backend.model.entity.User;
import com.smartcampus.backend.model.enums.Role;
import com.smartcampus.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/admin")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PatchMapping("/admin/{id}/role")
    public ResponseEntity<User> updateUserRole(
            @PathVariable Long id, 
            @RequestBody Map<String, String> payload) {
        String roleStr = payload.get("role");
        if (roleStr == null) {
            return ResponseEntity.badRequest().build();
        }
        Role newRole = Role.valueOf(roleStr.toUpperCase());
        return ResponseEntity.ok(userService.updateUserRole(id, newRole));
    }
}
