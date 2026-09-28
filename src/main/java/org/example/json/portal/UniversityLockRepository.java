package org.example.json.portal;

import jakarta.persistence.LockModeType;
import org.example.json.Universities;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/** Serializes saving/deleting a university so concurrent saves stay idempotent. */
public interface UniversityLockRepository extends Repository<Universities, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from Universities u where u.id = :id")
    Optional<Universities> findForUpdate(@Param("id") Integer id);
}
