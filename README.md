# Campus — University Management System

A student portfolio project that turns an existing Java university management assignment into a working website. Users can register, sign in, and open a workspace for their role: **Administrator**, **HR**, or **Student**. Records are stored in a database, and permissions are enforced on the server.

The project preserves the original console application, JDBC operations, and the existing `Universities` and `Professor` entities. The web layer adds accounts, role-based access, personal bookmarks, and an analytics dashboard.

## Technology stack

- Java 17+, Spring Boot 4.0.2, and Maven Wrapper 3.9.12
- Spring Security: session authentication, BCrypt passwords, and CSRF protection
- Spring Data JPA with PostgreSQL, or a local H2 database in demo mode
- HTML, CSS, and JavaScript; no frontend build step
- JUnit HTTP integration tests and Node.js data-processing tests

## Quick start: run the complete website

Install **JDK 17 or later** and make sure `java -version` works in your terminal. The first Maven run requires internet access to download dependencies. You do not need PostgreSQL or Node.js for the local demo.

Open PowerShell in the project root, the directory containing `pom.xml`, and run:

```powershell
.\mvnw.cmd spring-boot:run
```

Wait for the application to finish starting, then open:

- [Home page](http://127.0.0.1:8080/)
- [Sign in](http://127.0.0.1:8080/login.html)
- [Create an account](http://127.0.0.1:8080/register.html)

The local `demo` profile is the default, so this command starts the complete website with H2 and does not require a PostgreSQL connection. The explicit command `.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=demo"` also works.

On Windows, you can use the shortcut `.\start-campus.cmd` instead. It selects the demo profile explicitly and uses the project directory, so the same local database is used even when the script is launched from another working directory.

Keep the terminal running while using the website. Press **Ctrl+C** in that terminal to stop it. A second local demo launch detects an already running Campus demo on the same address and port, prints its URL, and exits without opening another database connection. Open that URL to use the existing instance. To apply code changes, stop the original instance and then run again.

### Demo accounts

| Workspace | Email | Password |
| --- | --- | --- |
| Administrator | `admin@campus.local` | `CampusDemo2026!` |
| HR | `hr@campus.local` | `CampusDemo2026!` |
| Student | `student@campus.local` | `CampusDemo2026!` |

The **Admin / HR / Student** buttons on the sign-in page fill in these credentials. Select a role, then click **Sign in to Campus**.

You can also register your own account. The website automatically signs you in and opens the student workspace. Public registration always creates a **Student**; an administrator can assign staff roles from **Access management**.

The `demo` profile uses real server sessions and a file-based H2 database at `.local/campus-demo.mv.db`. Accounts, records, and bookmarks survive restarts when you run from the same project directory. The `.local/` directory is excluded from Git. The initial demo contains three accounts, six universities, and eight professors. Existing demo accounts are not reset on startup.

This profile listens only on `127.0.0.1` and is intended for local demonstrations. Its example accounts are not created when running the explicit `postgres` profile.

### Run from IntelliJ IDEA

1. Open the project as a Maven project and select a JDK 17+.
2. Select the shared **Campus Demo** run configuration and click **Run**. It sets the web main class, the `demo` profile, and the project root as the working directory.
3. Alternatively, run `src/main/java/org/example/json/JsonApplication.java` directly. Without an active profile, it also starts the local demo. For a manually created **Application** configuration, use main class `org.example.json.JsonApplication` and the project root as the working directory.
4. Open [the website](http://127.0.0.1:8080/) after startup completes.

### Run from VS Code

Open the project folder with Java support installed, then select **Run and Debug > Campus: local demo**. The shared launch configuration starts `JsonApplication` with the `demo` profile from the project root. Wait for startup, then open [the website](http://127.0.0.1:8080/).

**`JsonApplication` starts the website. `Main.java` starts the separate, original console program.** Running `Main.java` does not start an HTTP server.

## Workspace features

| Feature | Administrator | HR | Student |
| --- | :---: | :---: | :---: |
| Browse universities and listed courses | Yes | Yes | Yes |
| Add, edit, and delete universities | Yes | — | — |
| View and manage faculty profiles | Yes | Yes | — |
| View accounts and assign roles | Yes | — | — |
| Save universities in a personal collection | — | — | Yes |
| Open live data insights | Yes | Yes | — |

Administrators cannot change their own role. Changes to another user's role take effect on subsequent requests, including requests from an existing session. Bookmarks belong to the signed-in account, and saving the same university twice does not create duplicate entries.

University programs are displayed from the existing `course` field. The project does not introduce enrollment, grades, or a timetable system. The original university and professor records remain independent; professors are not assigned to universities through an invented relationship.

A short demonstration:

1. Sign in as an administrator and add a university.
2. Sign out, sign in as HR, and add a faculty profile.
3. Sign out and register a student account.
4. Find the university and save it to **Saved universities**.
5. Sign in again to confirm that the saved record is still available.

## Run with PostgreSQL

Create a local PostgreSQL database, for example `oop_db`. In the same PowerShell session that will start the application, set:

```powershell
$env:DB_URL = "jdbc:postgresql://localhost:5432/oop_db"
$env:DB_USERNAME = "postgres"
$env:DB_PASSWORD = "your-local-database-password"

# Optional: create the first administrator on startup.
$env:CAMPUS_ADMIN_EMAIL = "admin@example.com"
$env:CAMPUS_ADMIN_PASSWORD = "ChooseYourOwnStrongPassword2026!"

.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=postgres"
```

The `postgres` profile must be selected explicitly. For an IDE run configuration or the executable JAR, use program argument `--spring.profiles.active=postgres`. This profile uses the `DB_*` variables and does not seed the local demo accounts or sample records. Setting `DB_*` variables alone does not switch the default H2 demo to PostgreSQL.

The optional administrator variables must be provided together. They create the first administrator only when no administrator exists and the email is unused. They do not promote an existing student or overwrite an existing password. After that first startup, you can remove these variables; further role assignments are managed in the administrator workspace.

| Environment variable | Default / purpose |
| --- | --- |
| `DB_URL` | `jdbc:postgresql://localhost:5432/oop_db` |
| `DB_USERNAME` | `postgres` |
| `DB_PASSWORD` | Empty; set your own database password |
| `CAMPUS_ADMIN_EMAIL` | Optional first administrator email; no default |
| `CAMPUS_ADMIN_PASSWORD` | Optional first administrator password; no default |
| `SESSION_COOKIE_SECURE` | `false` locally; set to `true` when serving over HTTPS |

The application does **not** load `.env` files automatically. `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` are also used by the legacy JDBC `DatabaseManager`. The current development schema setting is `spring.jpa.hibernate.ddl-auto=update`.

## Analytics dashboard

Administrator and HR workspaces include a **Data insights** link. The dashboard reads the current application database and provides record counts, city distributions, filtering, sorting, pagination, CSV exports, and data-quality checks for missing values, duplicate IDs, and invalid numbers.

A separate, clearly labeled synthetic dataset is available for previewing the dashboard without Java or a database. With Node.js installed:

```powershell
node tools/serve-demo.mjs
```

Open [the static analytics preview](http://127.0.0.1:4173/analytics.html?demo=1).

This static server does not provide registration, authentication, or persistent workspaces. Use the Spring Boot quick start above for the complete website. The synthetic analytics dataset is separate from the H2 demo database.

## Project structure

```text
src/main/java/
  Main.java, Entity.java, University.java, Professor.java
  DatabaseManager.java                 Original console OOP/JDBC application
  org/example/json/
    JsonApplication.java               Web application entry point
    Universities.java, Professor.java  Existing JPA entities
    *Controller.java, *Repository.java REST endpoints and persistence
    auth/                              Accounts, sessions, and roles
    config/                            Security and initial demo data
    portal/                            Bookmarks and record validation
src/main/resources/
  application.properties               Shared configuration; demo by default
  application-demo.properties          Local H2 demo configuration
  application-postgres.properties      Explicit PostgreSQL configuration
  static/
    index.html                         Home page
    login.html, register.html          Sign-in and registration pages
    admin.html, hr.html, student.html   Role-specific workspaces
    portal.js, portal.css              Website interactions and styling
    analytics.html, app.js, data.js     Analytics interface and helpers
    styles.css                         Analytics styling
src/test/
  java/                                HTTP integration tests
  js/data.test.js                      Data-analysis and CSV tests
tools/
  serve-demo.mjs                       Optional static analytics preview
start-campus.cmd                       Windows shortcut for the complete demo
.run/Campus Demo.run.xml               Shared IntelliJ IDEA launch configuration
.vscode/launch.json                    Shared VS Code launch configuration
```

## API overview

| Endpoint | Method | Access / result |
| --- | --- | --- |
| `/api/auth/session` | `GET` | Current user, CSRF token, and demo-mode flag |
| `/api/auth/register` | `POST` | Create a Student account; API login is a separate request |
| `/api/auth/login` | `POST` | Sign in using email and password |
| `/api/auth/logout` | `POST` | End the current session |
| `/api/users` | `GET` | Administrator: list user accounts |
| `/api/users/{id}/role` | `PATCH` | Administrator: change another user's role |
| `/universities` | `GET`, `POST` | Authenticated users: read; Administrator: create |
| `/universities/{id}` | `PUT`, `DELETE` | Administrator: update or delete |
| `/professors` | `GET`, `POST` | Administrator or HR: read or create |
| `/professors/{id}` | `PUT`, `DELETE` | Administrator or HR: update or delete |
| `/api/bookmarks` | `GET` | Authenticated user: read their own saved universities |
| `/api/bookmarks/{universityId}` | `POST`, `DELETE` | Authenticated user: save or remove their own bookmark |

Before a modifying request, the client obtains a token from `/api/auth/session` and sends it in `X-CSRF-TOKEN` together with the session cookie. Sign-in accepts `application/x-www-form-urlencoded` fields `username` (email) and `password`; registration accepts JSON `{ "name": "...", "email": "...", "password": "..." }`.

After login, the client fetches a fresh session/CSRF token. The registration page performs the registration and login requests in sequence. Unauthenticated protected GET requests return `401`; insufficient permissions or an invalid CSRF token result in `403`.

## Tests and executable JAR

Run from the project root:

```powershell
# Run Java integration tests and build the executable application.
.\mvnw.cmd test package

# Optional: run JavaScript tests with Node.js.
node --test src/test/js/data.test.js
```

The nine Java integration tests start a real HTTP server with an isolated in-memory H2 database. They check registration, email normalization, BCrypt hashing, login/logout, CSRF, role restrictions, CRUD validation, bookmark ownership, and role changes in active sessions. They do not modify the local demo database. Separate startup tests check the duplicate-demo detection, profile selection, and behavior when an unrelated service or no service is listening. The eleven JavaScript tests cover filtering, numeric sorting, completeness, duplicates, numeric validation, and CSV escaping.

The build creates `target/campus-university-management-0.0.1-SNAPSHOT.jar`. Once the build is complete, you can run the website without Maven:

```powershell
java -jar target/campus-university-management-0.0.1-SNAPSHOT.jar
```

Run this command from the same project root to reuse the demo database. The JAR uses the local demo by default; `--spring.profiles.active=demo` is also accepted. If Campus is already running, a second demo launch prints its URL and exits. Stop the original instance before starting a rebuilt JAR to apply changes. Open [the website on port 8080](http://127.0.0.1:8080/).

## Common startup issues

- **A numbered console menu appears:** you ran `Main.java`. Use `JsonApplication` or the quick-start command to start the website.
- **PostgreSQL connection fails during a demo:** the demo no longer needs PostgreSQL. Remove an explicit `postgres` profile from the run configuration or `SPRING_PROFILES_ACTIVE` environment variable, or run with `--spring.profiles.active=demo`. For an intended PostgreSQL run, check that the database is running and the `DB_*` values are correct.
- **The terminal says Campus is already running:** the second demo launch has exited normally; open the printed URL. The first instance still serves the website. Stop it before restarting to apply code changes.
- **Port 8080 is already in use:** another application may be using it. Stop that application or choose a different port. The duplicate-launch check reuses only a responding Campus demo; it does not stop other programs.
- **H2 reports that the database is already in use:** stop the other instance using `.local/campus-demo.mv.db`. The duplicate-launch check applies to the same address and port; changing only the HTTP port can still cause a database file lock. Do not delete the database file to fix this error.
- **The browser cannot connect:** keep the application running and use the complete address `http://127.0.0.1:8080/`, including `http` and port `8080`.
- **The demo looks empty or different after restart:** check the working directory; the H2 file path is relative to it.
- **Registration does not work on port 4173:** that is the static analytics preview. Use the Spring Boot site on port 8080.

## Repository maintenance

Keep source code, tests, Maven Wrapper, and shared launch configurations in Git.
Build output (`target/`), personal IDE settings (`.idea/`, `*.iml`), local databases
and backups (`.local/`), logs, and generated modernization reports are ignored.
The `.editorconfig` file defines shared text formatting.

Use `./mvnw clean` (or `.\mvnw.cmd clean` on Windows) to remove generated build
output after stopping the application. Keep `.local/campus-demo.mv.db` if you
want to preserve local accounts and records. Never commit database credentials
or local environment files.

## Portfolio scope

This project demonstrates Java OOP, JDBC, a Spring Boot REST layer, relational persistence, session authentication, role-based authorization, validated forms, a responsive website, basic analytics, and integration testing.

It is a student project. Password recovery, email verification, enrollment, grades, schedules, and large-scale data processing are not implemented. Analytics load complete API responses and calculate results in browser memory. Public deployment would require your own credentials, HTTPS, database migrations, and hosting configuration; the documented demo credentials are for the local `demo` profile.
