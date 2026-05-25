package com.collegetracker.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.security.dev-mode:false}")
    private boolean devMode;

    @Value("${app.dev-user-id:local-user-1}")
    private String devUserId;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().permitAll()
            )
            .addFilterBefore(userIdFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public OncePerRequestFilter userIdFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request,
                                            HttpServletResponse response,
                                            FilterChain chain) throws ServletException, IOException {
                String userId;
                if (devMode) {
                    // In local dev, use the X-User-Id header or fall back to devUserId
                    String header = request.getHeader("X-User-Id");
                    userId = (header != null && !header.isBlank()) ? header : devUserId;
                } else {
                    // TODO: validate Cognito JWT and extract sub claim
                    String authHeader = request.getHeader("Authorization");
                    userId = extractUserIdFromJwt(authHeader);
                }
                request.setAttribute("userId", userId);
                chain.doFilter(request, response);
            }
        };
    }

    private String extractUserIdFromJwt(String authHeader) {
        // Placeholder: implement Cognito JWT validation in production
        // Use spring-security-oauth2-resource-server for full implementation
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return "anonymous";
        }
        return "cognito-user";
    }
}
