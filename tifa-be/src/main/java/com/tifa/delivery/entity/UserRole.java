package com.tifa.delivery.entity;

import javax.persistence.*;

@Entity
@Table(name = "t_user_role")
public class UserRole {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_role_id")
    private Long userRoleId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;
    
    // Constructors
    public UserRole() {}
    
    public UserRole(User user, Role role) {
        this.user = user;
        this.role = role;
    }
    
    // Getters and Setters
    public Long getUserRoleId() {
        return userRoleId;
    }
    
    public void setUserRoleId(Long userRoleId) {
        this.userRoleId = userRoleId;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
    public Role getRole() {
        return role;
    }
    
    public void setRole(Role role) {
        this.role = role;
    }
}
