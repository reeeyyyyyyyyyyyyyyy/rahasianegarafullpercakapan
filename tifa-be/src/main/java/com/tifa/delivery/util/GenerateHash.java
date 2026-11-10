import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class GenerateHash {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String password = "admin123";
        String hash = encoder.encode(password);
        
        System.out.println("Password: " + password);
        System.out.println("BCrypt Hash (60 chars):");
        System.out.println(hash);
        System.out.println("Length: " + hash.length());
        
        // Verify
        boolean matches = encoder.matches(password, hash);
        System.out.println("Verification: " + (matches ? "MATCH" : "NO MATCH"));
        
        // SQL Update
        System.out.println("");
        System.out.println("SQL Update Command:");
        System.out.println("UPDATE t_user SET password_hash = '" + hash + "' WHERE username = 'admin';");
    }
}
