package com.tifa.delivery.repository;

import com.tifa.delivery.entity.GoalCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GoalCategoryRepository extends JpaRepository<GoalCategory, Long> {

    List<GoalCategory> findByIsActive(Integer isActive);

    List<GoalCategory> findByCategoryIdIn(List<Long> categoryIds);
}
