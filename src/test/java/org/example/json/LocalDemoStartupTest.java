package org.example.json;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.env.MockEnvironment;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class LocalDemoStartupTest {
    private static final String CAMPUS_SESSION = """
            {"user":null,"demo":true,"csrfToken":"test-token","csrfHeader":"X-CSRF-TOKEN"}
            """;

    private HttpServer server;
    private String responseBody;
    private final AtomicInteger requests = new AtomicInteger();
    private final ByteArrayOutputStream output = new ByteArrayOutputStream();
    private MockEnvironment environment;

    @BeforeEach
    void startLocalService() throws Exception {
        responseBody = CAMPUS_SESSION;
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/auth/session", exchange -> {
            requests.incrementAndGet();
            byte[] body = responseBody.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            try (var stream = exchange.getResponseBody()) {
                stream.write(body);
            }
        });
        server.start();
        environment = new MockEnvironment().withProperty("server.port", Integer.toString(server.getAddress().getPort()));
    }

    @AfterEach
    void stopLocalService() {
        server.stop(0);
    }

    @Test
    void defaultDemoReportsExistingCampusWithoutStartingSpring() {
        assertTrue(check());
        String message = output.toString(StandardCharsets.UTF_8);
        assertTrue(message.contains("Campus is already running at http://127.0.0.1:" + server.getAddress().getPort()));
        assertTrue(message.contains("Stop the current instance before restarting to apply changes."));
        assertEquals(1, requests.get());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "<html>Another application</html>",
            "{}",
            "{\"demo\":true}",
            "{\"user\":null,\"demo\":false,\"csrfToken\":\"token\",\"csrfHeader\":\"X-CSRF-TOKEN\"}",
            "{\"user\":null,\"demo\":true,\"csrfToken\":true,\"csrfHeader\":\"X-CSRF-TOKEN\"}",
            "{\"user\":null,\"demo\":true,\"csrfToken\":\"token\",\"csrfHeader\":\"Other\"}"
    })
    void unrelatedServicesDoNotSuppressStartup(String body) {
        responseBody = body;
        assertFalse(check());
        assertEquals("", output.toString(StandardCharsets.UTF_8));
    }

    @ParameterizedTest
    @ValueSource(strings = {"postgres", "test", "demo,postgres"})
    void explicitNonDemoProfilesDoNotProbeOtherServices(String profile) {
        environment.withProperty("spring.profiles.active", profile);
        assertFalse(check());
        assertEquals(0, requests.get());
    }

    @Test
    void nonDemoDefaultDoesNotProbeOtherServices() {
        environment.withProperty("spring.profiles.default", "postgres");
        assertFalse(check());
        assertEquals(0, requests.get());
    }

    @Test
    void includedProfilesDoNotTriggerDemoGuard() {
        environment.withProperty("spring.profiles.include", "test");
        assertFalse(check());
        assertEquals(0, requests.get());
    }

    @Test
    void commandLineProfilesAndPortOverrideEnvironmentProperties() {
        environment.withProperty("spring.profiles.active", "postgres").withProperty("server.port", "0");
        assertTrue(check("--spring.profiles.active=demo", "--server.port=" + server.getAddress().getPort()));
        assertEquals(1, requests.get());
    }

    @Test
    void commandLineCanDisableDemoGuard() {
        environment.withProperty("spring.profiles.active", "demo");
        assertFalse(check("--spring.profiles.active=postgres"));
        assertEquals(0, requests.get());
    }

    @Test
    void randomPortDoesNotProbeOtherServices() {
        assertFalse(check("--server.port=0"));
        assertEquals(0, requests.get());
    }

    @ParameterizedTest
    @ValueSource(strings = {"spring.config.location", "spring.config.additional-location", "spring.config.import",
            "spring.config.name", "spring.datasource.url", "spring.application.json"})
    void customConfigurationLeavesStartupToSpring(String property) {
        environment.withProperty(property, "custom-setting");
        assertFalse(check());
        assertEquals(0, requests.get());
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.0.0.0", "192.0.2.1", "::1"})
    void customServerAddressDoesNotProbeOtherServices(String host) {
        environment.withProperty("server.address", host);
        assertFalse(check());
        assertEquals(0, requests.get());
    }

    @Test
    void unavailableServiceAllowsNormalStartup() {
        server.stop(0);
        assertFalse(check());
        assertEquals("", output.toString(StandardCharsets.UTF_8));
    }

    private boolean check(String... args) {
        return LocalDemoStartup.showExistingInstance(args, environment, new PrintStream(output));
    }
}
