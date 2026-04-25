package com.smartcampus.backend.repository;

import com.smartcampus.backend.model.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    List<Ticket> findByCreatorId(Long creatorId);
    List<Ticket> findByAssigneeId(Long assigneeId);
}
