package com.example.banking.controller;

import com.example.banking.config.JwtService;
import com.example.banking.model.User;
import com.example.banking.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
        String name = request.get("name");
        String email = request.get("email");
        String password = request.get("password");
        String roleStr = request.get("role");

        logger.info("Received registration request for email: {} with role: {}", email, roleStr);

        if (name == null || email == null || password == null) {
            logger.warn("Registration failed: missing required fields");
            return ResponseEntity.badRequest().body(Map.of("message", "Missing required fields"));
        }

        if (userRepository.existsByEmail(email)) {
            logger.warn("Registration failed: email {} already exists", email);
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Email already exists"));
        }

        User.Role role = User.Role.STANDARD_USER;
        if ("ADMINISTRATOR".equalsIgnoreCase(roleStr)) {
            role = User.Role.ADMINISTRATOR;
        }

        User user = new User(name, email, passwordEncoder.encode(password), role);
        userRepository.save(user);

        logger.info("User registration successful for email: {}", email);
        return ResponseEntity.ok(Map.of("message", "Registration successful"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        logger.info("Received login request for email: {}", email);

        if (email == null || password == null) {
            logger.warn("Login failed: missing email or password");
            return ResponseEntity.badRequest().body(Map.of("message", "Missing required fields"));
        }

        User user = userRepository.findByEmail(email)
                .orElse(null);

        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            logger.warn("Login failed: invalid credentials for email: {}", email);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid email or password"));
        }

        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("role", user.getRole().name());

        logger.info("User login successful for email: {} with role: {}", email, user.getRole().name());
        return ResponseEntity.ok(response);
    }
}
