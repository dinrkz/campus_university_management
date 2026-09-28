package org.example.json.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.example.json.auth.CampusPrincipal;
import org.example.json.auth.UserAccountRepository;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

/** Session roles are refreshed before authorization, so demotion applies immediately. */
final class RoleRefreshFilter extends OncePerRequestFilter {
    private final UserAccountRepository accounts;

    RoleRefreshFilter(UserAccountRepository accounts) { this.accounts = accounts; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication current = SecurityContextHolder.getContext().getAuthentication();
        if (current != null && current.isAuthenticated() && !(current instanceof AnonymousAuthenticationToken)) {
            var account = accounts.findByEmail(current.getName());
            if (account.isEmpty()) {
                SecurityContextHolder.clearContext();
                if (request.getSession(false) != null) request.getSession(false).invalidate();
            } else {
                CampusPrincipal principal = new CampusPrincipal(account.get());
                var refreshed = UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities());
                refreshed.setDetails(current.getDetails());
                SecurityContext context = SecurityContextHolder.createEmptyContext();
                context.setAuthentication(refreshed);
                SecurityContextHolder.setContext(context);
            }
        }
        chain.doFilter(request, response);
    }
}
