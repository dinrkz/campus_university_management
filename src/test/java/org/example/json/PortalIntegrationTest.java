package org.example.json;

import org.example.json.auth.Role;
import org.example.json.auth.UserAccount;
import org.example.json.auth.UserAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Real HTTP sessions and the complete security filter chain; no mocked identities. */
@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:campus-http-tests;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "server.address=127.0.0.1",
        "campus.admin.email=",
        "campus.admin.password="
})
class PortalIntegrationTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String PASSWORD = "StudentTest2026!";
    private static final String UNIVERSITY = """
            {"name":"Test University","location":"Almaty","education_direction":"Data science",
             "creation_year":1996,"course":"Data Engineering"}
            """;
    private static final String PROFESSOR = """
            {"name":"Ada Teacher","age":42,"department":"Computer science","experience":15,
             "knowledge":"Databases","personal_qualities":"Mentoring","city":"Almaty"}
            """;

    @LocalServerPort
    private int port;
    @Autowired
    private UserAccountRepository accounts;
    @Autowired
    private UniversitiesRepository universities;
    @Autowired
    private PasswordEncoder passwords;

    @Test
    void publicSessionAndProtectedApisRespectAuthentication() throws Exception {
        Browser visitor = new Browser();
        JsonNode session = visitor.refreshSession();
        assertTrue(session.get("user").isNull());
        assertFalse(session.get("demo").asBoolean());
        assertFalse(session.get("csrfToken").asString().isBlank());
        assertEquals("X-CSRF-TOKEN", session.get("csrfHeader").asString());
        for (String endpoint : new String[]{"/universities", "/professors", "/api/users", "/api/bookmarks"}) {
            assertStatus(401, visitor.get(endpoint));
        }
        assertStatus(200, visitor.get("/"));
        assertStatus(200, visitor.get("/login.html"));
        assertStatus(200, visitor.get("/register.html"));
    }

    @Test
    void registrationNormalizesEmailHashesPasswordAndCannotGrantAdmin() throws Exception {
        Browser visitor = new Browser();
        visitor.refreshSession();
        String email = uniqueEmail();
        String registration = JSON.writeValueAsString(Map.of("name", "New Student", "email",
                "  " + email.toUpperCase() + "  ", "password", PASSWORD, "role", "ADMIN"));
        HttpResponse<String> response = visitor.json("POST", "/api/auth/register", registration);
        assertStatus(201, response);
        JsonNode registered = body(response);
        assertEquals(email, registered.get("email").asString());
        assertEquals("STUDENT", registered.get("role").asString());
        assertFalse(registered.has("password"));
        assertFalse(registered.has("passwordHash"));
        UserAccount stored = accounts.findByEmail(email).orElseThrow();
        assertEquals(Role.STUDENT, stored.getRole());
        assertNotEquals(PASSWORD, stored.getPasswordHash());
        assertTrue(passwords.matches(PASSWORD, stored.getPasswordHash()));
        assertTrue(visitor.refreshSession().get("user").isNull());

        assertStatus(409, visitor.json("POST", "/api/auth/register", registration));
        visitor.login(email.toUpperCase(), PASSWORD);
        assertEquals(email, visitor.refreshSession().get("user").get("email").asString());
        assertStatus(403, visitor.get("/api/users"));
    }

    @Test
    void registrationRejectsInvalidFieldsAndMissingCsrf() throws Exception {
        Browser visitor = new Browser();
        String valid = JSON.writeValueAsString(Map.of("name", "Student", "email", uniqueEmail(), "password", PASSWORD));
        assertStatus(403, visitor.request("POST", "/api/auth/register", valid, "application/json", false));
        visitor.refreshSession();
        for (String invalid : new String[]{
                "{\"name\":\"\",\"email\":\"valid@example.com\",\"password\":\"StudentTest2026!\"}",
                "{\"name\":\"Student\",\"email\":\"invalid\",\"password\":\"StudentTest2026!\"}",
                "{\"name\":\"Student\",\"email\":\"valid@example.com\",\"password\":\"short\"}"}) {
            assertStatus(400, visitor.json("POST", "/api/auth/register", invalid));
        }
    }

    @Test
    void loginAndLogoutUseRealSessionAndCsrfProtection() throws Exception {
        UserAccount student = seedAccount(Role.STUDENT);
        Browser browser = new Browser();
        browser.refreshSession();
        assertStatus(401, browser.form("/api/auth/login", credentials(student.getEmail(), "wrong-password")));
        browser.login(student.getEmail(), PASSWORD);
        assertStatus(200, browser.get("/universities"));
        assertStatus(403, browser.request("POST", "/api/auth/logout", "", "application/json", false));
        assertStatus(200, browser.get("/universities"));
        assertStatus(204, browser.json("POST", "/api/auth/logout", ""));
        assertStatus(401, browser.get("/universities"));
        assertTrue(browser.refreshSession().get("user").isNull());
    }

    @Test
    void roleRestrictionsApplyToDirectApiCalls() throws Exception {
        Browser student = loggedIn(Role.STUDENT);
        Browser hr = loggedIn(Role.HR);
        Browser admin = loggedIn(Role.ADMIN);
        assertStatus(200, student.get("/universities"));
        assertStatus(403, student.get("/professors"));
        assertStatus(403, student.get("/api/users"));
        assertStatus(403, student.json("POST", "/universities", UNIVERSITY));
        assertStatus(403, student.json("POST", "/professors", PROFESSOR));
        assertStatus(200, hr.get("/professors"));
        assertStatus(403, hr.get("/api/users"));
        assertStatus(403, hr.json("POST", "/universities", UNIVERSITY));
        assertStatus(200, admin.get("/api/users"));
        assertStatus(200, admin.get("/professors"));
        assertFalse(admin.get("/api/users").body().contains("passwordHash"));
    }

    @Test
    void administratorCanCreateEditDeleteUniversityAndReceivesValidationErrors() throws Exception {
        Browser admin = loggedIn(Role.ADMIN);
        assertStatus(403, admin.request("POST", "/universities", UNIVERSITY, "application/json", false));
        HttpResponse<String> created = admin.json("POST", "/universities", UNIVERSITY);
        assertStatus(201, created);
        int id = body(created).get("id").asInt();
        assertTrue(universities.existsById(id));
        HttpResponse<String> updated = admin.json("PUT", "/universities/" + id,
                UNIVERSITY.replace("Test University", "Updated University"));
        assertStatus(200, updated);
        assertEquals("Updated University", body(updated).get("name").asString());
        assertStatus(400, admin.json("PUT", "/universities/" + id, UNIVERSITY.replace("1996", "9999")));
        assertStatus(400, admin.json("POST", "/universities", UNIVERSITY.replace("Test University", "")));
        assertStatus(404, admin.json("PUT", "/universities/2147483647", UNIVERSITY));
        assertStatus(404, admin.json("DELETE", "/universities/2147483647", ""));
        assertStatus(204, admin.json("DELETE", "/universities/" + id, ""));
        assertFalse(universities.existsById(id));
    }

    @Test
    void hrCanManageProfessorsWithValidationAndMissingIdResponses() throws Exception {
        Browser hr = loggedIn(Role.HR);
        HttpResponse<String> created = hr.json("POST", "/professors", PROFESSOR);
        assertStatus(201, created);
        int id = body(created).get("id").asInt();
        HttpResponse<String> edited = hr.json("PUT", "/professors/" + id,
                PROFESSOR.replace("Databases", "Data engineering"));
        assertStatus(200, edited);
        assertEquals("Data engineering", body(edited).get("knowledge").asString());
        assertStatus(400, hr.json("POST", "/professors", PROFESSOR.replace("\"age\":42", "\"age\":16")));
        assertStatus(400, hr.json("PUT", "/professors/" + id, PROFESSOR.replace("\"experience\":15", "\"experience\":40")));
        assertStatus(400, hr.json("POST", "/professors", PROFESSOR.replace("Ada Teacher", "")));
        assertStatus(404, hr.json("PUT", "/professors/2147483647", PROFESSOR));
        assertStatus(404, hr.json("DELETE", "/professors/2147483647", ""));
        assertStatus(204, hr.json("DELETE", "/professors/" + id, ""));
        assertStatus(404, hr.json("DELETE", "/professors/" + id, ""));
    }

    @Test
    void bookmarksAreIdempotentPrivateAndRemovedWithUniversity() throws Exception {
        Browser admin = loggedIn(Role.ADMIN);
        HttpResponse<String> created = admin.json("POST", "/universities", UNIVERSITY);
        assertStatus(201, created);
        int universityId = body(created).get("id").asInt();
        Browser first = loggedIn(Role.STUDENT);
        Browser second = loggedIn(Role.STUDENT);
        String endpoint = "/api/bookmarks/" + universityId;
        assertStatus(204, first.json("POST", endpoint, ""));
        assertStatus(204, first.json("POST", endpoint, ""));
        assertEquals(1, body(first.get("/api/bookmarks")).size());
        assertEquals(universityId, body(first.get("/api/bookmarks")).get(0).get("id").asInt());
        assertEquals(0, body(second.get("/api/bookmarks")).size());
        assertStatus(204, second.json("DELETE", endpoint, ""));
        assertEquals(1, body(first.get("/api/bookmarks")).size());
        assertStatus(204, second.json("POST", endpoint, ""));
        assertEquals(1, body(second.get("/api/bookmarks")).size());
        assertStatus(404, first.json("POST", "/api/bookmarks/2147483647", ""));
        assertStatus(204, first.json("DELETE", endpoint, ""));
        assertEquals(0, body(first.get("/api/bookmarks")).size());
        assertStatus(204, admin.json("DELETE", "/universities/" + universityId, ""));
        assertEquals(0, body(second.get("/api/bookmarks")).size());
    }

    @Test
    void roleChangeRevokesExistingSessionPrivilegesAndCannotChangeOwnRole() throws Exception {
        UserAccount adminAccount = seedAccount(Role.ADMIN);
        UserAccount hrAccount = seedAccount(Role.HR);
        Browser admin = new Browser();
        admin.login(adminAccount.getEmail(), PASSWORD);
        Browser hr = new Browser();
        hr.login(hrAccount.getEmail(), PASSWORD);
        assertStatus(200, hr.get("/professors"));
        assertStatus(403, admin.json("PATCH", "/api/users/" + adminAccount.getId() + "/role", "{\"role\":\"STUDENT\"}"));
        assertStatus(400, admin.json("PATCH", "/api/users/" + hrAccount.getId() + "/role", "{\"role\":\"OWNER\"}"));
        assertStatus(404, admin.json("PATCH", "/api/users/9223372036854775807/role", "{\"role\":\"STUDENT\"}"));
        assertStatus(200, admin.json("PATCH", "/api/users/" + hrAccount.getId() + "/role", "{\"role\":\"STUDENT\"}"));
        assertEquals("STUDENT", hr.refreshSession().get("user").get("role").asString());
        assertStatus(403, hr.get("/professors"));
        assertStatus(403, hr.json("POST", "/professors", PROFESSOR));
        assertStatus(403, hr.json("PATCH", "/api/users/" + hrAccount.getId() + "/role", "{\"role\":\"ADMIN\"}"));
        assertStatus(200, hr.get("/universities"));
    }

    private UserAccount seedAccount(Role role) {
        UserAccount account = new UserAccount();
        account.setName("Test " + role);
        account.setEmail(uniqueEmail());
        account.setPasswordHash(passwords.encode(PASSWORD));
        account.setRole(role);
        return accounts.saveAndFlush(account);
    }

    private Browser loggedIn(Role role) throws Exception {
        UserAccount account = seedAccount(role);
        Browser browser = new Browser();
        browser.login(account.getEmail(), PASSWORD);
        return browser;
    }

    private static String uniqueEmail() {
        return "test-" + UUID.randomUUID() + "@campus.test";
    }

    private static String credentials(String email, String password) {
        return "username=" + URLEncoder.encode(email, StandardCharsets.UTF_8)
                + "&password=" + URLEncoder.encode(password, StandardCharsets.UTF_8);
    }

    private static JsonNode body(HttpResponse<String> response) {
        return JSON.readTree(response.body());
    }

    private static void assertStatus(int expected, HttpResponse<String> actual) {
        assertEquals(expected, actual.statusCode(), () -> actual.request().method() + " "
                + actual.request().uri().getPath() + " returned: " + actual.body());
    }

    private final class Browser {
        private final HttpClient client = HttpClient.newBuilder()
                .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
        private String csrfToken;
        private String csrfHeader = "X-CSRF-TOKEN";

        JsonNode refreshSession() throws Exception {
            HttpResponse<String> response = get("/api/auth/session");
            assertStatus(200, response);
            JsonNode session = body(response);
            csrfToken = session.get("csrfToken").asString();
            csrfHeader = session.get("csrfHeader").asString();
            return session;
        }

        void login(String email, String password) throws Exception {
            refreshSession();
            assertStatus(204, form("/api/auth/login", credentials(email, password)));
            assertFalse(refreshSession().get("user").isNull());
        }

        HttpResponse<String> get(String path) throws Exception {
            return request("GET", path, "", "application/json", false);
        }

        HttpResponse<String> json(String method, String path, String data) throws Exception {
            return request(method, path, data, "application/json", true);
        }

        HttpResponse<String> form(String path, String data) throws Exception {
            return request("POST", path, data, "application/x-www-form-urlencoded", true);
        }

        HttpResponse<String> request(String method, String path, String data, String contentType,
                                     boolean includeCsrf) throws Exception {
            HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                    .timeout(Duration.ofSeconds(20))
                    .header("Content-Type", contentType)
                    .method(method, data.isEmpty() ? HttpRequest.BodyPublishers.noBody()
                            : HttpRequest.BodyPublishers.ofString(data));
            if (includeCsrf && csrfToken != null) request.header(csrfHeader, csrfToken);
            return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
        }
    }
}
