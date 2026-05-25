# 1. Base Runtime Image - Use alpine-based JRE for smallest footprint
FROM eclipse-temurin:25-jre-alpine

# 2. Security - Create a dedicated non-root user/group to prevent container escape
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# 3. Code Injection - Only copy the pre-built single JAR to keep context size < 100MB
COPY *.jar app.jar

# 4. Ownership & Permissions
RUN chown -R appuser:appgroup /app

# 5. Least Privilege Execution - Switch away from root
USER appuser

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
