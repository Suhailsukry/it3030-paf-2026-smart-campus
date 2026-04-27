package com.smartcampus.backend.repository;

import com.smartcampus.backend.model.entity.Booking;
import com.smartcampus.backend.model.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByUserId(Long userId);

    @Query("SELECT b FROM Booking b WHERE b.resource.id = :resourceId AND b.status IN :statuses " +
           "AND ((b.startDateTime < :endTime AND b.endDateTime > :startTime))")
    List<Booking> findConflictingBookings(
            @Param("resourceId") Long resourceId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            @Param("statuses") List<BookingStatus> statuses);
}
