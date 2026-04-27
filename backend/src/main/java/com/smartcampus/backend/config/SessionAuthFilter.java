package com.smartcampus.backend.config;

import com.smartcampus.backend.model.entity.User;
import com.smartcampus.backend.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Validates UUID session tokens issued by the backend after Google login.
 * Runs AFTER DevAuthFilter (mock tokens) but BEFORE the OAuth2 JWT filter.
 * If the bearer token is a valid UUID session, it sets up authentication and
 * masks the Authorization header so the JWT filter doesn't try to parse it.
 */
@RequiredArgsConstructor
public class SessionAuthFilter extends OncePerRequestFilter {

    private static final Pattern UUID_PATTERN = Pattern.compile(
            "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
            Pattern.CASE_INSENSITIVE
    );

    private final SessionStore sessionStore;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.toLowerCase().startsWith("bearer ")) {
            String token = authHeader.substring(7).trim();

            if (UUID_PATTERN.matcher(token).matches()) {
                System.out.println(">>> SessionAuthFilter: UUID session token detected for " + request.getRequestURI());

                Optional<Long> userIdOpt = sessionStore.getUserId(token);
                if (userIdOpt.isPresent()) {
                    Optional<User> userOpt = userRepository.findById(userIdOpt.get());
                    if (userOpt.isPresent()) {
                        User user = userOpt.get();
                        String authority = "ROLE_" + user.getRole().name();

                        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                user.getEmail(), null,
                                Collections.singletonList(new SimpleGrantedAuthority(authority))
                        );

                        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
                        ctx.setAuthentication(auth);
                        SecurityContextHolder.setContext(ctx);

                        System.out.println(">>> SessionAuthFilter: Authenticated " + user.getEmail() + " as " + authority);

                        // Mask the Authorization header so the JWT filter doesn't try to parse the UUID
                        chain.doFilter(new HeaderMaskingRequestWrapper(request), response);
                        return;
                    }
                }

                // UUID not found in session store — session expired or invalid
                System.out.println(">>> SessionAuthFilter: UUID session not found, returning 401");
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Session expired. Please log in again.\"}");
                return;
            }
        }

        chain.doFilter(request, response);
    }

    /** Hides the Authorization header from downstream filters. */
    private static class HeaderMaskingRequestWrapper extends jakarta.servlet.http.HttpServletRequestWrapper {
        public HeaderMaskingRequestWrapper(jakarta.servlet.http.HttpServletRequest request) {
            super(request);
        }

        @Override
        public String getHeader(String name) {
            if ("Authorization".equalsIgnoreCase(name)) return null;
            return super.getHeader(name);
        }

        @Override
        public java.util.Enumeration<String> getHeaders(String name) {
            if ("Authorization".equalsIgnoreCase(name)) return java.util.Collections.emptyEnumeration();
            return super.getHeaders(name);
        }

        @Override
        public java.util.Enumeration<String> getHeaderNames() {
            java.util.List<String> names = java.util.Collections.list(super.getHeaderNames());
            names.removeIf(n -> "Authorization".equalsIgnoreCase(n));
            return java.util.Collections.enumeration(names);
        }
    }
}
