package org.example.json.auth;

/** Only this projection crosses the HTTP boundary; password hashes never do. */
public record PublicUser(Long id, String name, String email, Role role) {
    public static PublicUser from(UserAccount account) {
        return new PublicUser(account.getId(), account.getName(), account.getEmail(), account.getRole());
    }
}
