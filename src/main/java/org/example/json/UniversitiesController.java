package org.example.json;

import jakarta.validation.Valid;
import org.example.json.portal.BookmarkRepository;
import org.example.json.portal.UniversityInput;
import org.example.json.portal.UniversityLockRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
public class UniversitiesController {

    private final UniversitiesRepository repository;
    private final BookmarkRepository bookmarks;
    private final UniversityLockRepository universityLocks;

    public UniversitiesController(UniversitiesRepository repository,
                                  BookmarkRepository bookmarks,
                                  UniversityLockRepository universityLocks) {
        this.repository = repository;
        this.bookmarks = bookmarks;
        this.universityLocks = universityLocks;
    }

    @GetMapping("/universities")
    @PreAuthorize("isAuthenticated()")
    public List<Universities> getAll() {
        return repository.findAll(Sort.by("id"));
    }

    @PostMapping("/universities")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public Universities create(@Valid @RequestBody UniversityInput input) {
        Universities university = new Universities();
        input.applyTo(university);
        return repository.save(university);
    }

    @PutMapping("/universities/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public Universities update(@PathVariable Integer id, @Valid @RequestBody UniversityInput input) {
        Universities university = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Университет не найден."));
        input.applyTo(university);
        return repository.save(university);
    }

    @DeleteMapping("/universities/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public void delete(@PathVariable Integer id) {
        Universities university = universityLocks.findForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Университет не найден."));
        bookmarks.deleteForUniversity(id);
        repository.delete(university);
    }
}
