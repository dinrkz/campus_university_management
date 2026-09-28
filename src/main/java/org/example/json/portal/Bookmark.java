package org.example.json.portal;

import jakarta.persistence.*;
import org.example.json.Universities;
import org.example.json.auth.UserAccount;

@Entity
@Table(name = "university_bookmarks", uniqueConstraints =
        @UniqueConstraint(name = "uq_bookmark_account_university", columnNames = {"account_id", "university_id"}))
public class Bookmark {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private UserAccount account;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "university_id", nullable = false)
    private Universities university;

    protected Bookmark() {
    }

    public Bookmark(UserAccount account, Universities university) {
        this.account = account;
        this.university = university;
    }
}
