package com.tifa.delivery.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordHashTest {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        
        String plainPassword = "admin123";
        
        // Test existing hashes
        String[] hashes = {
            "$2a$10$N9qo8uLOickgx2ZMRZoMye3dT8J0r3XfkMNhxSdQRKPx6pP6CU9Hm",
            "$2a$10$rMOXEYRG7u6DHcPaLTqGJ.Fc0e9HJ4pjZJqZAz2qrqq2qO2RGrGN."
        };
        
        System.out.println("=".repeat(60));
        System.out.println("BCrypt Password Hash Verification");
        System.out.println("=".repeat(60));
        System.out.println("Plain Password: " + plainPassword);
        System.out.println("");
        
        for (int i = 0; i < hashes.length; i++) {
            System.out.println("Hash " + (i+1) + ":");
            System.out.println(hashes[i]);
            boolean matches = encoder.matches(plainPassword, hashes[i]);
            System.out.println("Match: " + (matches ? "✅ YES" : "❌ NO"));
            System.out.println("");
        }
        
        // Generate new hash
        System.out.println("=".repeat(60));
        System.out.println("Generating NEW hash for: " + plainPassword);
        String newHash = encoder.encode(plainPassword);
        System.out.println("New Hash:");
        System.out.println(newHash);
        System.out.println("Length: " + newHash.length());
        
        // Verify new hash
        boolean matchesNew = encoder.matches(plainPassword, newHash);
        System.out.println("Verification: " + (matchesNew ? "✅ MATCH" : "❌ NO MATCH"));
        System.out.println("=".repeat(60));
    }
}
