package org.example.json.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserAccountRepository accounts;
    private final AccountService service;
    private final Environment environment;

    public AuthController(UserAccountRepository accounts, AccountService service, Environment environment) {
        this.accounts = accounts;
        this.service = service;
        this.environment = environment;
    }

    @GetMapping("/session")
    public SessionView session(Authentication authentication, CsrfToken csrf) {
        PublicUser user = authentication == null ? null : accounts.findByEmail(authentication.getName())
                .map(PublicUser::from).orElse(null);
        return new SessionView(user, csrf.getToken(), csrf.getHeaderName(), environment.acceptsProfiles(Profiles.of("demo")));
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public PublicUser register(@Valid @RequestBody Registration request) {
        return PublicUser.from(service.create(request.name(), request.email(), request.password(), Role.STUDENT));
    }

    public record Registration(
            @NotBlank(message = "Введите имя.") @Size(min = 2, max = 100, message = "Имя: от 2 до 100 символов.") String name,
            @NotBlank(message = "Введите email.") @Email(message = "Введите корректный email.")
            @Size(max = 254, message = "Email слишком длинный.") String email,
            @NotBlank(message = "Введите пароль.") @Size(min = 8, max = 72, message = "Пароль: от 8 до 72 символов.") String password) {
        public Registration {
            name = name == null ? null : name.strip();
            email = AccountService.normalizeEmail(email);
        }
    }

    public record SessionView(PublicUser user, String csrfToken, String csrfHeader, boolean demo) {}
}
