package com.smartcampus.backend.controller;

import com.smartcampus.backend.config.SessionStore;
import com.smartcampus.backend.model.entity.User;
import com.smartcampus.backend.model.enums.Role;
import com.smartcampus.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import jakarta.servlet.http.HttpServletRequest;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final SessionStore sessionStore;
    private final JwtDecoder jwtDecoder;

    /**
     * Called once after Google Sign-In.
     * Verifies the Google JWT (or mock token), finds/creates the DB user,
     * then returns the user profile + a UUID session token.
     * All subsequent API calls use the UUID session token, NOT the Google JWT.
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal Object principal, HttpServletRequest request) {
        String email;
        String name;
        Role role = Role.USER;

        Jwt successfulJwt = null;

        if (principal instanceof Jwt jwt) {
            successfulJwt = jwt;
        } else if (principal == null) {
            // Spring Security filter chain rejected the token or didn't run. Let's try manually:
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.toLowerCase().startsWith("bearer ")) {
                String token = authHeader.substring(7).trim();
                System.out.println(">>> /auth/me: Principal is null, but Bearer token found. Attempting manual decode...");
                try {
                    successfulJwt = jwtDecoder.decode(token);
                } catch (Exception e) {
                    System.err.println(">>> /auth/me manual JWT decode failed: " + e.getMessage());
                    e.printStackTrace();
                    return ResponseEntity.status(401).body(Map.of("error", "Invalid or expired Google token"));
                }
            } else {
                return ResponseEntity.status(401).body(Map.of("error", "No valid authentication found"));
            }
        }

        if (successfulJwt != null) {
            // Real Google login (from either auto or manual decode)
            email = successfulJwt.getClaimAsString("email");
            name  = successfulJwt.getClaimAsString("name");
            // Google JWTs don't have a 'role' claim — role comes from DB only
        } else {
            // Mock user from DevAuthFilter (dev bypass)
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            // For mock users, email is stored as the principal name
            Object principalName = (auth != null) ? auth.getPrincipal() : null;
            email = (principalName instanceof String s) ? s : "mock@smartcampus.com";
            name  = "Mock Developer";

            if (auth != null) {
                for (GrantedAuthority ga : auth.getAuthorities()) {
                    if (ga.getAuthority().startsWith("ROLE_")) {
                        try { role = Role.valueOf(ga.getAuthority().substring(5)); }
                        catch (Exception ignored) {}
                    }
                }
            }
        }

        // Find existing user by email (DB is the source of truth for role)
        Optional<User> optionalUser = userRepository.findByEmail(email);
        User user;
        if (optionalUser.isPresent()) {
            user = optionalUser.get();
        } else {
            // Provision new user on first login — role defaults to USER (admin sets it later)
            user = userRepository.save(User.builder()
                    .email(email)
                    .name(name != null ? name : "Unknown User")
                    .role(role)
                    .build());
        }

        // Issue a UUID session token for all subsequent API calls
        String sessionToken = sessionStore.createSession(user.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("id",    user.getId());
        response.put("email", user.getEmail());
        response.put("name",  user.getName());
        response.put("role",  user.getRole());
        response.put("token", sessionToken);   // <-- UUID session token

        System.out.println(">>> /auth/me: Issued session for " + user.getEmail() + " [" + user.getRole() + "]");
        return ResponseEntity.ok(response);
    }

    /** Invalidates the current session on logout. */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.toLowerCase().startsWith("bearer ")) {
            String token = authHeader.substring(7).trim();
            sessionStore.invalidate(token);
        }
        return ResponseEntity.ok().build();
    }
}
