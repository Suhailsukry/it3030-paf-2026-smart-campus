package com.smartcampus.backend.service;

import com.smartcampus.backend.exception.BadRequestException;
import com.smartcampus.backend.exception.ResourceNotFoundException;
import com.smartcampus.backend.model.entity.Booking;
import com.smartcampus.backend.model.enums.BookingStatus;
import com.smartcampus.backend.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import com.smartcampus.backend.model.entity.CampusResource;
import com.smartcampus.backend.model.entity.User;
import com.smartcampus.backend.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;
    private final ResourceService resourceService; // To validate resource
    private final UserRepository userRepository;

    public Booking createBooking(Booking booking) {
        // Fetch managed entities to prevent TransientObjectException
        CampusResource resource = resourceService.getResourceById(booking.getResource().getId());
        User user = userRepository.findById(booking.getUser().getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + booking.getUser().getId()));

        booking.setResource(resource);
        booking.setUser(user);

        if (booking.getStartDateTime().isAfter(booking.getEndDateTime())) {
            throw new BadRequestException("Start time must be before end time");
        }

        // Check for conflicts
        List<BookingStatus> blockingStatuses = Arrays.asList(BookingStatus.PENDING, BookingStatus.APPROVED);
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                booking.getResource().getId(),
                booking.getStartDateTime(),
                booking.getEndDateTime(),
                blockingStatuses
        );

        if (!conflicts.isEmpty()) {
            throw new BadRequestException("this time is booked in this place book another time");
        }

        booking.setStatus(BookingStatus.PENDING);
        Booking savedBooking = bookingRepository.save(booking);

        // Notify user
        notificationService.createNotification(
                savedBooking.getUser(), 
                "Your booking request for resource ID " + savedBooking.getResource().getId() + " has been submitted and is pending approval."
        );

        return savedBooking;
    }

    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    public List<Booking> getUserBookings(Long userId) {
        return bookingRepository.findByUserId(userId);
    }

    public Booking getBookingById(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + id));
    }

    public Booking updateBookingStatus(Long id, BookingStatus newStatus, String reason) {
        Booking booking = getBookingById(id);
        booking.setStatus(newStatus);
        
        if (reason != null && !reason.isEmpty()) {
            booking.setReviewReason(reason);
        }
        
        Booking updated = bookingRepository.save(booking);

        // Notify user about status change
        notificationService.createNotification(
                updated.getUser(),
                "Your booking (ID: " + updated.getId() + ") status has been updated to: " + newStatus + 
                (reason != null ? ". Reason: " + reason : "")
        );

        return updated;
    }
}
