package org.example.json;

import jakarta.validation.Valid;
import org.example.json.portal.ProfessorInput;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@PreAuthorize("hasAnyRole('ADMIN', 'HR')")
public class ProfessorController {

    private final ProfessorRepository repository;

    public ProfessorController(ProfessorRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/professors")
    public List<Professor> getAllProfessors() {
        return repository.findAll(Sort.by("id"));
    }

    @PostMapping("/professors")
    @ResponseStatus(HttpStatus.CREATED)
    public Professor create(@Valid @RequestBody ProfessorInput input) {
        Professor professor = new Professor();
        input.applyTo(professor);
        return repository.save(professor);
    }

    @PutMapping("/professors/{id}")
    @Transactional
    public Professor update(@PathVariable Integer id, @Valid @RequestBody ProfessorInput input) {
        Professor professor = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Преподаватель не найден."));
        input.applyTo(professor);
        return repository.save(professor);
    }

    @DeleteMapping("/professors/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable Integer id) {
        Professor professor = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Преподаватель не найден."));
        repository.delete(professor);
    }
}
