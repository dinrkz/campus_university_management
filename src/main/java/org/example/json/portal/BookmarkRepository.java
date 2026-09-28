package org.example.json.portal;

import org.example.json.Universities;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {
    boolean existsByAccount_IdAndUniversity_Id(Long accountId, Integer universityId);

    @Query("select b.university from Bookmark b where b.account.id = :accountId order by b.id desc")
    List<Universities> findUniversitiesByAccountId(@Param("accountId") Long accountId);

    @Modifying
    @Query("delete from Bookmark b where b.account.id = :accountId and b.university.id = :universityId")
    void deleteForAccountAndUniversity(@Param("accountId") Long accountId,
                                       @Param("universityId") Integer universityId);

    @Modifying
    @Query("delete from Bookmark b where b.university.id = :universityId")
    void deleteForUniversity(@Param("universityId") Integer universityId);
}
