package org.example.json.auth;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
public class AccountService {
    private final UserAccountRepository accounts;
    private final PasswordEncoder passwords;

    public AccountService(UserAccountRepository accounts, PasswordEncoder passwords) {
        this.accounts = accounts;
        this.passwords = passwords;
    }

    public static String normalizeEmail(String email) {
        return email == null ? "" : email.strip().toLowerCase(Locale.ROOT);
    }

    public static void validatePassword(String password) {
        if (password == null || password.length() < 8 || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Пароль должен содержать минимум 8 символов и не превышать 72 байта UTF-8.");
        }
    }

    public UserAccount create(String name, String email, String password, Role role) {
        validatePassword(password);
        String normalizedEmail = normalizeEmail(email);
        if (accounts.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Этот email уже зарегистрирован.");
        }
        UserAccount account = new UserAccount();
        account.setName(name.strip());
        account.setEmail(normalizedEmail);
        account.setPasswordHash(passwords.encode(password));
        account.setRole(role);
        try {
            return accounts.saveAndFlush(account);
        } catch (DataIntegrityViolationException duplicate) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Этот email уже зарегистрирован.");
        }
    }
}
