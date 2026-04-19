package com.smartcampus.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.smartcampus.backend.model.entity.Comment;
import com.smartcampus.backend.model.entity.Ticket;
import com.smartcampus.backend.model.entity.TicketAttachment;
import com.smartcampus.backend.model.enums.TicketStatus;
import com.smartcampus.backend.service.TicketService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<Ticket> createTicket(
            @RequestPart("ticket") Ticket ticket,
            @RequestPart(value = "files", required = false) MultipartFile[] files) {
        return new ResponseEntity<>(ticketService.createTicket(ticket, files), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Ticket>> getAllTickets() {
        return ResponseEntity.ok(ticketService.getAllTickets());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Ticket>> getUserTickets(@PathVariable Long userId) {
        return ResponseEntity.ok(ticketService.getUserTickets(userId));
    }

    @GetMapping("/technician/{technicianId}")
    public ResponseEntity<List<Ticket>> getTechnicianTickets(@PathVariable Long technicianId) {
        return ResponseEntity.ok(ticketService.getTechnicianTickets(technicianId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Ticket> getTicketById(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getTicketById(id));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Ticket> updateTicketStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        
        TicketStatus status = TicketStatus.valueOf(body.get("status"));
        String resolutionNotes = body.get("resolutionNotes");
        return ResponseEntity.ok(ticketService.updateTicketStatus(id, status, resolutionNotes));
    }

    @PatchMapping("/{id}/close")
    public ResponseEntity<Ticket> closeTicket(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        
        Long userId = Long.valueOf(body.get("userId").toString());
        Boolean isAdmin = Boolean.valueOf(body.get("isAdmin").toString());
        
        return ResponseEntity.ok(ticketService.closeTicket(id, userId, isAdmin));
    }

    @PatchMapping("/admin/{id}/assign")
    public ResponseEntity<Ticket> assignTicket(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body) {
        Long assigneeId = body.get("assigneeId");
        return ResponseEntity.ok(ticketService.assignTicket(id, assigneeId));
    }

    // Comments Endpoints
    @PostMapping("/{id}/comments")
    public ResponseEntity<Comment> addComment(
            @PathVariable Long id, 
            @RequestBody Comment comment) {
        return new ResponseEntity<>(ticketService.addComment(id, comment), HttpStatus.CREATED);
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<Comment>> getTicketComments(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getTicketComments(id));
    }

    @PutMapping("/comments/{commentId}")
    public ResponseEntity<Comment> updateComment(
            @PathVariable Long commentId,
            @RequestBody Map<String, String> body) {
        Long userId = Long.parseLong(body.get("userId"));
        String content = body.get("content");
        return ResponseEntity.ok(ticketService.updateComment(commentId, userId, content));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long commentId,
            @RequestParam Long userId) {
        ticketService.deleteComment(commentId, userId);
        return ResponseEntity.noContent().build();
    }
    
    @GetMapping("/{id}/attachments")
    public ResponseEntity<List<TicketAttachment>> getTicketAttachments(@PathVariable Long id) {
         return ResponseEntity.ok(ticketService.getTicketAttachments(id));
    }

    @PatchMapping("/{id}/technician-action")
    public ResponseEntity<Ticket> technicianAction(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String action = body.get("action");
        String description = body.get("description");
        return ResponseEntity.ok(ticketService.handleTechnicianAction(id, action, description));
    }
}
