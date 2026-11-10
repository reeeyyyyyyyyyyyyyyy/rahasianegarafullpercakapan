package com.tifa.delivery.entity;

import javax.persistence.*;
import java.util.List;

@Entity
@Table(name = "m_permission")
public class Permission {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "permission_id")
    private Long permissionId;
    
    @Column(name = "permission_code", nullable = false, unique = true, length = 128)
    private String permissionCode;
    
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    // Relationships
    @OneToMany(mappedBy = "permission", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<RolePermission> rolePermissions;
    
    // Constructors
    public Permission() {}
    
    public Permission(String permissionCode, String description) {
        this.permissionCode = permissionCode;
        this.description = description;
    }
    
    // Getters and Setters
    public Long getPermissionId() {
        return permissionId;
    }
    
    public void setPermissionId(Long permissionId) {
        this.permissionId = permissionId;
    }
    
    public String getPermissionCode() {
        return permissionCode;
    }
    
    public void setPermissionCode(String permissionCode) {
        this.permissionCode = permissionCode;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public List<RolePermission> getRolePermissions() {
        return rolePermissions;
    }
    
    public void setRolePermissions(List<RolePermission> rolePermissions) {
        this.rolePermissions = rolePermissions;
    }
}
