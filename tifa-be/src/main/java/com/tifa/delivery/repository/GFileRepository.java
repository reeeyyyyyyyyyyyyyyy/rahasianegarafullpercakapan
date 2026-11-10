package com.tifa.delivery.repository;

import com.tifa.delivery.entity.GFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GFileRepository extends JpaRepository<GFile, Long> {
    List<GFile> findByFileGroupId(Long fileGroupId);
}
