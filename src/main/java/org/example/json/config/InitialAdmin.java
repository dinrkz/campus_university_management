package org.example.json.config;

import org.example.json.auth.AccountService;
import org.example.json.auth.Role;
import org.example.json.auth.UserAccountRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** One-time explicit bootstrap for a fresh PostgreSQL deployment. */
@Component
@Profile("!demo")
public class InitialAdmin implements ApplicationRunner {
    private final AccountService service;
    private final UserAccountRepository accounts;
    private final String email;
    private final String password;

    public InitialAdmin(AccountService service, UserAccountRepository accounts,
                        @Value("${campus.admin.email:}") String email,
                        @Value("${campus.admin.password:}") String password) {
        this.service = service;
        this.accounts = accounts;
        this.email = email;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (email.isBlank() && password.isBlank()) return;
        if (email.isBlank() || password.isBlank()) {
            throw new IllegalStateException("Set both CAMPUS_ADMIN_EMAIL and CAMPUS_ADMIN_PASSWORD to create the first administrator.");
        }
        String normalized = AccountService.normalizeEmail(email);
        if (!normalized.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") || normalized.length() > 254) {
            throw new IllegalStateException("CAMPUS_ADMIN_EMAIL must be a valid email address.");
        }
        // Never promote an existing public account or overwrite an existing password.
        if (!accounts.existsByRole(Role.ADMIN) && !accounts.existsByEmail(normalized)) {
            service.create("Администратор", normalized, password, Role.ADMIN);
        }
    }
}
