package com.smartcampus.backend.controller;

import com.smartcampus.backend.model.entity.Booking;
import com.smartcampus.backend.model.enums.BookingStatus;
import com.smartcampus.backend.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PostMapping
    public ResponseEntity<Booking> createBooking(@RequestBody Booking booking) {
        return new ResponseEntity<>(bookingService.createBooking(booking), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Booking>> getAllBookings() {
        return ResponseEntity.ok(bookingService.getAllBookings());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Booking>> getUserBookings(@PathVariable Long userId) {
        return ResponseEntity.ok(bookingService.getUserBookings(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Booking> getBookingById(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.getBookingById(id));
    }

    @PatchMapping("/admin/{id}/status")
    public ResponseEntity<Booking> updateBookingStatus(
            @PathVariable Long id, 
            @RequestBody Map<String, String> body) {
        
        BookingStatus status = BookingStatus.valueOf(body.get("status"));
        String reason = body.get("reason");
        
        return ResponseEntity.ok(bookingService.updateBookingStatus(id, status, reason));
    }
}
