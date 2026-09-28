package org.example.json.portal;

import org.example.json.Universities;
import org.example.json.auth.UserAccount;
import org.example.json.auth.UserAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/bookmarks")
@PreAuthorize("isAuthenticated()")
public class BookmarkController {
    private final BookmarkRepository bookmarks;
    private final UserAccountRepository accounts;
    private final UniversityLockRepository universityLocks;

    public BookmarkController(BookmarkRepository bookmarks, UserAccountRepository accounts,
                              UniversityLockRepository universityLocks) {
        this.bookmarks = bookmarks;
        this.accounts = accounts;
        this.universityLocks = universityLocks;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<Universities> list(Authentication authentication) {
        return bookmarks.findUniversitiesByAccountId(currentAccount(authentication).getId());
    }

    @PostMapping("/{universityId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void save(@PathVariable Integer universityId, Authentication authentication) {
        Universities university = universityLocks.findForUpdate(universityId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Университет не найден."));
        UserAccount account = currentAccount(authentication);
        if (!bookmarks.existsByAccount_IdAndUniversity_Id(account.getId(), universityId)) {
            bookmarks.save(new Bookmark(account, university));
        }
    }

    @DeleteMapping("/{universityId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void remove(@PathVariable Integer universityId, Authentication authentication) {
        // Use the same lock as save/deletion to keep concurrent requests in a consistent order.
        universityLocks.findForUpdate(universityId);
        bookmarks.deleteForAccountAndUniversity(currentAccount(authentication).getId(), universityId);
    }

    private UserAccount currentAccount(Authentication authentication) {
        return accounts.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Войдите в аккаунт заново."));
    }
}
