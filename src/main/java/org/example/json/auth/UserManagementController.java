package org.example.json.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserManagementController {
    private final UserAccountRepository accounts;

    public UserManagementController(UserAccountRepository accounts) { this.accounts = accounts; }

    @GetMapping
    public List<PublicUser> list() {
        return accounts.findAll(Sort.by("id")).stream().map(PublicUser::from).toList();
    }

    @PatchMapping("/{id}/role")
    public PublicUser changeRole(@PathVariable Long id, @Valid @RequestBody RoleChange request,
                                 Authentication authentication) {
        UserAccount account = accounts.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден."));
        if (account.getEmail().equals(authentication.getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Нельзя изменить собственную роль.");
        }
        account.setRole(request.role());
        return PublicUser.from(accounts.saveAndFlush(account));
    }

    public record RoleChange(@NotNull(message = "Выберите роль.") Role role) {}
}
