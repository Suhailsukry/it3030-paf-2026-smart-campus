package com.smartcampus.backend.config;

import java.util.Arrays;
import java.util.Collections;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.smartcampus.backend.repository.UserRepository;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final UserRepository userRepository;
    private final SessionStore sessionStore;

    public SecurityConfig(UserRepository userRepository, SessionStore sessionStore) {
        this.userRepository = userRepository;
        this.sessionStore = sessionStore;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationConverter jwtAuthenticationConverter) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(authz -> authz
                // Public access
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/resources/**").permitAll()

                // Admin only
                .requestMatchers("/api/bookings/admin/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers("/api/resources/admin/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers("/api/tickets/admin/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers("/api/users/admin/**").hasAuthority("ROLE_ADMIN")

                // Technician / Admin status updates - also allow users to close their own resolved tickets
                .requestMatchers(HttpMethod.PATCH, "/api/tickets/*/status")
                    .hasAnyAuthority("ROLE_ADMIN", "ROLE_TECHNICIAN", "ROLE_USER")
                .requestMatchers(HttpMethod.PATCH, "/api/tickets/*/close")
                    .hasAnyAuthority("ROLE_ADMIN", "ROLE_USER")

                // Technician actions (accept / reject)
                .requestMatchers(HttpMethod.PATCH, "/api/tickets/*/technician-action")
                    .hasAnyAuthority("ROLE_ADMIN", "ROLE_TECHNICIAN")

                // Users can create tickets and view their own
                .requestMatchers(HttpMethod.POST, "/api/tickets")
                    .hasAnyAuthority("ROLE_USER", "ROLE_ADMIN", "ROLE_TECHNICIAN")
                .requestMatchers(HttpMethod.GET, "/api/tickets/user/*")
                    .hasAnyAuthority("ROLE_USER", "ROLE_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/tickets/technician/*")
                    .hasAnyAuthority("ROLE_TECHNICIAN", "ROLE_ADMIN")

                // Everything else needs login
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter))
            )
            // 1. SessionAuthFilter runs FIRST to handle UUID tokens BEFORE OAuth2 JWT filter
            .addFilterBefore(new SessionAuthFilter(sessionStore, userRepository),
    UsernamePasswordAuthenticationFilter.class)
            // 2. DevAuthFilter handles MOCKED_JWT_TOKEN (dev bypass)
            .addFilterBefore(new DevAuthFilter(),
                org.springframework.security.web.context.request.async.WebAsyncManagerIntegrationFilter.class);

        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            String email = jwt.getClaimAsString("email");
            String role = "USER"; // Default fallback
            
            if (email != null) {
                // We use the field directly here. Spring handles the initialization.
                try {
                    var userOpt = userRepository.findByEmail(email);
                    if (userOpt.isPresent()) {
                        role = userOpt.get().getRole().name();
                    }
                } catch (Exception e) {
                    // Fallback to USER if DB is not ready or has issues during auth
                }
            }
            
            return Collections.singleton(
                new SimpleGrantedAuthority("ROLE_" + role.toUpperCase())
            );
        });
        return converter;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
            "http://localhost:5176",
            "http://localhost:5177",
            "http://localhost:5178",
            "http://localhost:5179",
            "http://localhost:5180"
        ));
        configuration.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
        ));
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization", "Content-Type", "x-auth-token", "x-mock-role"
        ));
        configuration.setExposedHeaders(Arrays.asList("x-auth-token"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}