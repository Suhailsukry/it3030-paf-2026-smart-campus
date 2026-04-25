package com.smartcampus.backend.config;

import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple in-memory session store.
 * After Google login, a UUID session token is issued to the frontend.
 * All subsequent API requests use this UUID instead of the raw Google JWT.
 */
@Component
public class SessionStore {

    private final ConcurrentHashMap<String, Long> sessions = new ConcurrentHashMap<>();

    /** Create a new session for the given DB user ID and return the UUID token. */
    public String createSession(Long userId) {
        String token = UUID.randomUUID().toString();
        sessions.put(token, userId);
        return token;
    }

    /** Return the user ID for a valid session token, or empty if not found. */
    public Optional<Long> getUserId(String token) {
        return Optional.ofNullable(sessions.get(token));
    }

    /** Remove a session (on logout). */
    public void invalidate(String token) {
        sessions.remove(token);
    }
}
