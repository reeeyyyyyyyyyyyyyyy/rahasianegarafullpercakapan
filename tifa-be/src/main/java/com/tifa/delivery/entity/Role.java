package com.tifa.delivery.entity;

import javax.persistence.*;
import java.util.List;

@Entity
@Table(name = "m_role")
public class Role {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "role_id")
    private Long roleId;
    
    @Column(name = "role_code", nullable = false, unique = true, length = 64)
    private String roleCode;
    
    @Column(name = "role_name", nullable = false, length = 128)
    private String roleName;
    
    // Relationships
    @OneToMany(mappedBy = "role", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<UserRole> userRoles;
    
    @OneToMany(mappedBy = "role", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<RolePermission> rolePermissions;
    
    // Constructors
    public Role() {}
    
    public Role(String roleCode, String roleName) {
        this.roleCode = roleCode;
        this.roleName = roleName;
    }
    
    // Getters and Setters
    public Long getRoleId() {
        return roleId;
    }
    
    public void setRoleId(Long roleId) {
        this.roleId = roleId;
    }
    
    public String getRoleCode() {
        return roleCode;
    }
    
    public void setRoleCode(String roleCode) {
        this.roleCode = roleCode;
    }
    
    public String getRoleName() {
        return roleName;
    }
    
    public void setRoleName(String roleName) {
        this.roleName = roleName;
    }
    
    public List<UserRole> getUserRoles() {
        return userRoles;
    }
    
    public void setUserRoles(List<UserRole> userRoles) {
        this.userRoles = userRoles;
    }
    
    public List<RolePermission> getRolePermissions() {
        return rolePermissions;
    }
    
    public void setRolePermissions(List<RolePermission> rolePermissions) {
        this.rolePermissions = rolePermissions;
    }
}
