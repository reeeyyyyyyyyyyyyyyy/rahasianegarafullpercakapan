package com.tifa.delivery.service;

import com.tifa.delivery.dto.*;
import com.tifa.delivery.entity.User;
import com.tifa.delivery.entity.UserRole;
import com.tifa.delivery.entity.Role;
import com.tifa.delivery.repository.UserRepository;
import com.tifa.delivery.security.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityManager;
import java.time.Instant;

/**
 * Authentication Service for JWT v3
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final EntityManager entityManager;

    /**
     * Login user and generate JWT token with role
     */
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid username or password"));

        log.info("Attempting login for user: {}", request.getUsername());
        log.info("User found: {}", user.getUsername());
        if (!user.getIsActive()) {
            throw new RuntimeException("User account is disabled");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Invalid username or password");
        }

        // Resolve role from UserRole -> Role relationship
        String roleCode = "OPERATOR";
        if (user.getUserRoles() != null && !user.getUserRoles().isEmpty()) {
            roleCode = user.getUserRoles().get(0).getRole().getRoleCode().toUpperCase();
        }

        Long companyId = user.getCompanyId();

        String token = jwtTokenProvider.generateToken(
                user.getUsername(),
                user.getUserId(),
                user.getDisplayName(),
                roleCode,
                companyId
        );

        log.info("User logged in: {} (role: {}, company: {})", user.getUsername(), roleCode, companyId);

        return LoginResponse.builder()
                .token(token)
                .type("Bearer")
                .userId(user.getUserId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .email(user.getEmail())
                .roleCode(roleCode)
                .build();
    }

    /**
     * Register new user with BCrypt password
     */
    @Transactional
    public String registerUser(String username, String password, String email, String displayName) {
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username '" + username + "' already exists");
        }

        String hashedPassword = passwordEncoder.encode(password);

        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(hashedPassword);
        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setIsActive(true);
        user.setCompanyId(1L);
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);

        // Assign OPERATOR role
        Role role = entityManager.createQuery("SELECT r FROM Role r WHERE r.roleCode = 'OPERATOR'", Role.class)
                .getSingleResult();
        UserRole userRole = new UserRole(user, role);
        entityManager.persist(userRole);

        log.info("User registered: {} (role: OPERATOR)", username);
        return "User '" + username + "' registered successfully";
    }

    /**
     * Validate JWT token (called by WS Cloud Router)
     */
    public TokenValidationResponse validateToken(TokenValidationRequest request) {
        try {
            String token = request.getToken();
            
            // Remove "Bearer " prefix if present
            if (token.startsWith("Bearer ")) {
                token = token.substring(7);
            }

            boolean isValid = jwtTokenProvider.validateToken(token);

            if (!isValid) {
                return TokenValidationResponse.builder()
                        .valid(false)
                        .build();
            }

            Claims claims = jwtTokenProvider.getClaims(token);
            String username = claims.getSubject();
            Long userId = claims.get("userId", Long.class);
            String displayName = claims.get("displayName", String.class);
            String roleCode = claims.get("roleCode", String.class);
            Long companyId = claims.get("companyId", Long.class);

            TokenValidationResponse.UserInfo userInfo = TokenValidationResponse.UserInfo.builder()
                    .userId(userId)
                    .username(username)
                    .displayName(displayName)
                    .email(claims.get("email", String.class))
                    .role(roleCode)
                    .build();

            return TokenValidationResponse.builder()
                    .valid(true)
                    .user(userInfo)
                    .build();

        } catch (Exception e) {
            log.error("Token validation failed: {}", e.getMessage());
            return TokenValidationResponse.builder()
                    .valid(false)
                    .build();
        }
    }
}
