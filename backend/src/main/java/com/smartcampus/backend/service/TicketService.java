package com.smartcampus.backend.service;

import com.smartcampus.backend.exception.BadRequestException;
import com.smartcampus.backend.exception.ResourceNotFoundException;
import com.smartcampus.backend.model.entity.Comment;
import com.smartcampus.backend.model.entity.Ticket;
import com.smartcampus.backend.model.entity.TicketAttachment;
import com.smartcampus.backend.model.entity.User;
import com.smartcampus.backend.model.enums.TicketStatus;
import com.smartcampus.backend.repository.CommentRepository;
import com.smartcampus.backend.repository.TicketAttachmentRepository;
import com.smartcampus.backend.repository.TicketRepository;
import com.smartcampus.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final CommentRepository commentRepository;
    private final TicketAttachmentRepository ticketAttachmentRepository;
    private final NotificationService notificationService;
    private final FileStorageService fileStorageService;
    private final UserRepository userRepository;
    private final com.smartcampus.backend.repository.ResourceRepository resourceRepository;

    @org.springframework.transaction.annotation.Transactional
    public Ticket createTicket(Ticket ticket, MultipartFile[] files) {
        System.out.println("Processing ticket creation for creator ID: " + 
            (ticket.getCreator() != null ? ticket.getCreator().getId() : "NULL"));

        // Resolve managed user entity
        if (ticket.getCreator() != null && ticket.getCreator().getId() != null) {
            User creator = userRepository.findById(ticket.getCreator().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + ticket.getCreator().getId()));
            ticket.setCreator(creator);
        } else {
            throw new BadRequestException("Ticket must have a creator with a valid ID.");
        }

        // Resolve managed resource entity if provided
        if (ticket.getResource() != null && ticket.getResource().getId() != null) {
            com.smartcampus.backend.model.entity.CampusResource resource = resourceRepository.findById(ticket.getResource().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
            ticket.setResource(resource);
        }

        // Initialize status
        if (ticket.getStatus() == null) {
            ticket.setStatus(TicketStatus.OPEN);
        }
        
        Ticket savedTicket = ticketRepository.save(ticket);
        System.out.println("Ticket saved to DB with ID: " + savedTicket.getId());

        // Handle up to 3 image attachments
        if (files != null && files.length > 0) {
            for (int i = 0; i < Math.min(files.length, 3); i++) {
                if (!files[i].isEmpty()) {
                    try {
                        String fileUrl = fileStorageService.storeFile(files[i]);
                        TicketAttachment attachment = TicketAttachment.builder()
                                .ticket(savedTicket)
                                .imageUrl(fileUrl)
                                .build();
                        ticketAttachmentRepository.save(attachment);
                    } catch (Exception e) {
                        System.err.println("Failed to save attachment " + i + ": " + e.getMessage());
                    }
                }
            }
        }

        return savedTicket;
    }

    public List<Ticket> getAllTickets() {
        return ticketRepository.findAll();
    }

    public List<Ticket> getUserTickets(Long userId) {
        return ticketRepository.findByCreatorId(userId);
    }

    public List<Ticket> getTechnicianTickets(Long technicianId) {
        return ticketRepository.findByAssigneeId(technicianId);
    }

    public Ticket getTicketById(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));
    }

    public Ticket updateTicketStatus(Long id, TicketStatus status, String resolutionNotes) {
        Ticket ticket = getTicketById(id);
        ticket.setStatus(status);
        if (resolutionNotes != null && !resolutionNotes.isEmpty()) {
            ticket.setResolutionNotes(resolutionNotes);
        }
        
        Ticket updated = ticketRepository.save(ticket);
        
        notificationService.createNotification(
                updated.getCreator(),
                "Your ticket (ID: " + updated.getId() + ") status has changed to " + status.name()
        );

        return updated;
    }

    public Ticket closeTicket(Long ticketId, Long userId, boolean isAdmin) {
        Ticket ticket = getTicketById(ticketId);
        
        if (!isAdmin && !ticket.getCreator().getId().equals(userId)) {
            throw new BadRequestException("Only the ticket creator or admin can close this ticket");
        }
        
        if (ticket.getStatus() != TicketStatus.RESOLVED) {
            throw new BadRequestException("Only resolved tickets can be closed");
        }
        
        ticket.setStatus(TicketStatus.CLOSED);
        Ticket updated = ticketRepository.save(ticket);
        
        notificationService.createNotification(
                ticket.getAssignee(),
                "Ticket #" + ticketId + " has been closed by the user."
        );
        
        return updated;
    }

    public Ticket assignTicket(Long ticketId, Long assigneeId) {
        Ticket ticket = getTicketById(ticketId);
        User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignee not found"));

        ticket.setAssignee(assignee);
        // Keep status OPEN so the technician must explicitly Accept or Reject.
        // Status will change to IN_PROGRESS when the technician clicks "Accept".
        Ticket updated = ticketRepository.save(ticket);

        // Notify the assigned technician – prompt them to accept/reject
        notificationService.createNotification(
                assignee,
                "You have been assigned ticket #" + ticket.getId() +
                " (" + ticket.getCategory() + " – " + ticket.getLocation() + ")." +
                " Please accept or reject it in your dashboard."
        );

        // Notify the ticket creator that a technician has been assigned
        notificationService.createNotification(
                ticket.getCreator(),
                "Your ticket #" + ticket.getId() + " has been assigned to " +
                assignee.getName() + " and is awaiting their confirmation."
        );

        return updated;
    }

    public Comment addComment(Long ticketId, Comment comment) {
        Ticket ticket = getTicketById(ticketId);
        comment.setTicket(ticket);

        // Resolve user entity
        if (comment.getUser() != null && comment.getUser().getId() != null) {
            User user = userRepository.findById(comment.getUser().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            comment.setUser(user);
        }

        Comment savedComment = commentRepository.save(comment);

        // Notify Ticket Creator if the comment is from someone else
        if (!ticket.getCreator().getId().equals(comment.getUser().getId())) {
             notificationService.createNotification(
                     ticket.getCreator(),
                     comment.getUser().getName() + " commented on your ticket #" + ticket.getId()
             );
        }
        
        return savedComment;
    }

    public Comment updateComment(Long commentId, Long userId, String newContent) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        
        // Ownership check: only the author can edit their comment
        if (!comment.getUser().getId().equals(userId)) {
            throw new BadRequestException("You can only edit your own comments");
        }

        comment.setContent(newContent);
        return commentRepository.save(comment);
    }

    public void deleteComment(Long commentId, Long userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        
        // Ownership check: only the author or admin can delete
        if (!comment.getUser().getId().equals(userId)) {
            throw new BadRequestException("You can only delete your own comments");
        }

        commentRepository.delete(comment);
    }

    public List<Comment> getTicketComments(Long ticketId) {
        return commentRepository.findByTicketId(ticketId);
    }
    
    public List<TicketAttachment> getTicketAttachments(Long ticketId) {
        return ticketAttachmentRepository.findByTicketId(ticketId);
    }

    public Ticket handleTechnicianAction(Long ticketId, String action, String description) {
        Ticket ticket = getTicketById(ticketId);

        if ("ACCEPT".equalsIgnoreCase(action)) {
            ticket.setStatus(TicketStatus.IN_PROGRESS);
        } else if ("REJECT".equalsIgnoreCase(action)) {
            ticket.setStatus(TicketStatus.REJECTED);
        } else {
            throw new BadRequestException("Invalid action. Must be ACCEPT or REJECT");
        }

        if (description != null && !description.isEmpty()) {
            ticket.setResolutionNotes(description);
        }

        Ticket updated = ticketRepository.save(ticket);

        // Notify the ticket creator – include the technician's note so they see it
        String techName = updated.getAssignee() != null ? updated.getAssignee().getName() : "A technician";
        String actionVerb = "ACCEPT".equalsIgnoreCase(action) ? "accepted" : "rejected";
        String notesPart = (description != null && !description.isEmpty())
                ? " Note: \"" + description + "\""
                : "";

        notificationService.createNotification(
                updated.getCreator(),
                techName + " has " + actionVerb + " your ticket #" + updated.getId() +
                " (" + updated.getCategory() + " – " + updated.getLocation() + ")." + notesPart
        );

        return updated;
    }
}
