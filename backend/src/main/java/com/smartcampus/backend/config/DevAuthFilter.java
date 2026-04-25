package com.smartcampus.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * DEVELOPER BYPASS FILTER
 * This filter allows testing with the 'MOCKED_JWT_TOKEN' without needing real Google JWTs.
 * In a real production environment, this filter should be disabled or protected by a conditional.
 */
public class DevAuthFilter extends OncePerRequestFilter {

    private final RequestAttributeSecurityContextRepository securityContextRepository = new RequestAttributeSecurityContextRepository();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader != null && authHeader.toLowerCase().startsWith("bearer mocked_jwt_token")) {
            System.out.println(">>> DevAuthFilter: Bypass triggered for " + request.getRequestURI());
            String mockRole = request.getHeader("X-Mock-Role");
            String authority = (mockRole != null) ? "ROLE_" + mockRole.toUpperCase() : "ROLE_USER";

            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    "mock-user", null, Collections.singletonList(new SimpleGrantedAuthority(authority)));
            
            // In Spring Security 6, we must explicitly save the context to the repository
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(auth);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, request, response);
            
            // Wrap the request to hide the mock token from subsequent filters (like Google JWT filter)
            HeaderMaskingRequestWrapper wrappedRequest = new HeaderMaskingRequestWrapper(request);
            filterChain.doFilter(wrappedRequest, response);
            return;
        } 

        filterChain.doFilter(request, response);
    }

    /**
     * Specialized wrapper to "hide" the Authorization header from subsequent filters
     */
    private static class HeaderMaskingRequestWrapper extends jakarta.servlet.http.HttpServletRequestWrapper {
        public HeaderMaskingRequestWrapper(jakarta.servlet.http.HttpServletRequest request) {
            super(request);
        }

        @Override
        public String getHeader(String name) {
            if ("Authorization".equalsIgnoreCase(name)) {
                return null;
            }
            return super.getHeader(name);
        }

        @Override
        public java.util.Enumeration<String> getHeaders(String name) {
            if ("Authorization".equalsIgnoreCase(name)) {
                return java.util.Collections.emptyEnumeration();
            }
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
