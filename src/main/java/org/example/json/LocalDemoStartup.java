package org.example.json;

import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.SimpleCommandLinePropertySource;
import org.springframework.core.env.StandardEnvironment;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.PrintStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/** Avoid opening the same local demo database when the website is already running. */
final class LocalDemoStartup {
    private static final Duration TIMEOUT = Duration.ofSeconds(1);

    private LocalDemoStartup() {}

    static boolean showExistingInstance(String[] args) {
        return showExistingInstance(args, new StandardEnvironment(), System.out);
    }

    static boolean showExistingInstance(String[] args, ConfigurableEnvironment environment, PrintStream output) {
        try {
            // Match Boot's command line > JVM properties > environment variable precedence.
            environment.getPropertySources().addFirst(new SimpleCommandLinePropertySource(args));
            // Boot has not loaded external configuration yet; leave those launches to Boot.
            for (String property : new String[]{"spring.config.location", "spring.config.additional-location",
                    "spring.config.import", "spring.config.name", "spring.datasource.url", "spring.application.json"}) {
                if (!environment.getProperty(property, "").isBlank()) {
                    return false;
                }
            }
            String host = environment.getProperty("server.address", "127.0.0.1").trim();
            if (!"127.0.0.1".equals(host) && !"localhost".equalsIgnoreCase(host)) {
                return false;
            }
            String profiles = environment.getProperty("spring.profiles.active");
            if (profiles == null || profiles.isBlank()) {
                profiles = environment.getProperty("spring.profiles.default", "demo");
            }
            if (!"demo".equals(profiles.trim())
                    || !environment.getProperty("spring.profiles.include", "").isBlank()) {
                return false;
            }
            int port = environment.getProperty("server.port", Integer.class, 8080);
            if (port < 1 || port > 65535) {
                return false;
            }

            String address = "http://127.0.0.1:" + port;
            HttpClient client = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();
            HttpRequest request = HttpRequest.newBuilder(URI.create(address + "/api/auth/session"))
                    .timeout(TIMEOUT).header("Accept", "application/json").GET().build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                return false;
            }
            JsonNode session = JsonMapper.builder().build().readTree(response.body());
            if (session == null || !session.isObject()
                    || !session.path("demo").isBoolean() || !session.path("demo").asBoolean()
                    || !session.path("csrfToken").isString() || session.path("csrfToken").asString().isBlank()
                    || !"X-CSRF-TOKEN".equals(session.path("csrfHeader").asString())
                    || !session.has("user")) {
                return false;
            }
            output.println("Campus is already running at " + address + "/");
            output.println("Open " + address + "/ in your browser.");
            output.println("Stop the current instance before restarting to apply changes.");
            return true;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return false;
        } catch (IOException | RuntimeException exception) {
            // Unavailable services and invalid settings must retain normal Spring Boot diagnostics.
            return false;
        }
    }
}
