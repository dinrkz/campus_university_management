package org.example.json.config;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import org.example.json.auth.AccountService;
import org.example.json.auth.CampusPrincipal;
import org.example.json.auth.UserAccountRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    UserDetailsService userDetailsService(UserAccountRepository accounts) {
        return username -> accounts.findByEmail(AccountService.normalizeEmail(username)).map(CampusPrincipal::new)
                .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, UserAccountRepository accounts,
                                            UserDetailsService users, PasswordEncoder passwords) throws Exception {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(users);
        provider.setPasswordEncoder(passwords);
        http.authenticationProvider(provider)
                .authorizeHttpRequests(access -> access
                        .dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD).permitAll()
                        .requestMatchers(HttpMethod.GET, "/", "/*.html", "/*.css", "/*.js", "/*.svg", "/assets/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/session").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login").permitAll()
                        .requestMatchers("/api/users", "/api/users/**").hasRole("ADMIN")
                        .requestMatchers("/professors", "/professors/**").hasAnyRole("ADMIN", "HR")
                        .requestMatchers(HttpMethod.GET, "/universities", "/universities/**").authenticated()
                        .requestMatchers("/universities", "/universities/**").hasRole("ADMIN")
                        .requestMatchers("/api/bookmarks", "/api/bookmarks/**").authenticated()
                        .anyRequest().denyAll())
                .formLogin(login -> login
                        .loginPage("/login.html")
                        .loginProcessingUrl("/api/auth/login")
                        .successHandler((request, response, authentication) -> response.setStatus(204))
                        .failureHandler((request, response, exception) -> json(response, 401, "Неверный email или пароль.")))
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID")
                        .logoutSuccessHandler((request, response, authentication) -> response.setStatus(204)))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, exception) -> json(response, 401, "Войдите в аккаунт."))
                        .accessDeniedHandler((request, response, exception) -> json(response, 403, "Нет доступа или сессия формы устарела. Обновите страницу.")))
                .requestCache(cache -> cache.disable())
                .httpBasic(basic -> basic.disable())
                .addFilterBefore(new RoleRefreshFilter(accounts), AuthorizationFilter.class);
        // Keep Spring Security's session CSRF protection and session fixation protection enabled.
        return http.build();
    }

    private static void json(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }
}
