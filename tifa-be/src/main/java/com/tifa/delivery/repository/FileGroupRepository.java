package com.tifa.delivery.repository;

import com.tifa.delivery.entity.FileGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FileGroupRepository extends JpaRepository<FileGroup, Long> {
}
