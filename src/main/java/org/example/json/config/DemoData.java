package org.example.json.config;

import org.example.json.Professor;
import org.example.json.ProfessorRepository;
import org.example.json.Universities;
import org.example.json.UniversitiesRepository;
import org.example.json.auth.AccountService;
import org.example.json.auth.Role;
import org.example.json.auth.UserAccountRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** Fictional portfolio data, enabled only by the explicitly selected local demo profile. */
@Component
@Profile("demo")
public class DemoData implements ApplicationRunner {
    private static final String DEMO_PASSWORD = "CampusDemo2026!";
    private final AccountService service;
    private final UserAccountRepository accounts;
    private final UniversitiesRepository universities;
    private final ProfessorRepository professors;

    public DemoData(AccountService service, UserAccountRepository accounts, UniversitiesRepository universities,
                    ProfessorRepository professors) {
        this.service = service;
        this.accounts = accounts;
        this.universities = universities;
        this.professors = professors;
    }

    @Override
    public void run(ApplicationArguments args) {
        seedAccount("Алексей Миронов", "admin@campus.local", Role.ADMIN);
        seedAccount("Диана Садыкова", "hr@campus.local", Role.HR);
        seedAccount("Алихан Нурланов", "student@campus.local", Role.STUDENT);
        if (universities.count() == 0) {
            university("Central Data University", "Алматы", "Data Science", 2004, "Анализ данных и статистика");
            university("Astana Technology Institute", "Астана", "Engineering", 2009, "Инженерия данных");
            university("Caspian Business School", "Актау", "Business", 1998, "Бизнес-аналитика");
            university("Steppe Digital University", "Караганда", "Computer Science", 2012, "Программная инженерия");
            university("Syrdarya Research College", "Кызылорда", "Applied Mathematics", 1995, "Прикладная математика");
            university("South Campus University", "Шымкент", "Information Systems", 2001, "Информационные системы");
        }
        if (professors.count() == 0) {
            professor("Айдана Сейтова", 34, "Data Science", 9, "Python, SQL, статистика", "Внимательность, наставничество", "Алматы");
            professor("Тимур Аскаров", 42, "Engineering", 17, "ETL, PostgreSQL, Apache Spark", "Системность, коммуникация", "Астана");
            professor("Мария Ким", 38, "Business", 12, "Power BI, Excel, аналитика", "Инициативность, организация", "Актау");
            professor("Данияр Омаров", 31, "Computer Science", 6, "Java, Spring, архитектура", "Любознательность, ответственность", "Караганда");
            professor("Елена Волкова", 46, "Applied Mathematics", 21, "Математика, R, моделирование", "Точность, терпение", "Кызылорда");
            professor("Асет Беков", 36, "Information Systems", 11, "Базы данных, SQL, UML", "Сотрудничество, аналитическое мышление", "Шымкент");
            professor("София Ли", 29, "Data Science", 4, "Python, машинное обучение", "Адаптивность, исследовательский подход", "Алматы");
            professor("Руслан Алиев", 40, "Engineering", 15, "Хранилища данных, Docker, Linux", "Дисциплина, наставничество", "Астана");
        }
    }

    private void seedAccount(String name, String email, Role role) {
        if (!accounts.existsByEmail(email)) service.create(name, email, DEMO_PASSWORD, role);
    }

    private void university(String name, String city, String direction, int year, String course) {
        Universities university = new Universities();
        university.setName(name);
        university.setLocation(city);
        university.setEducation_direction(direction);
        university.setCreation_year(year);
        university.setCourse(course);
        universities.save(university);
    }

    private void professor(String name, int age, String department, int experience, String knowledge,
                           String qualities, String city) {
        Professor professor = new Professor();
        professor.setName(name);
        professor.setAge(age);
        professor.setDepartment(department);
        professor.setExperience(experience);
        professor.setKnowledge(knowledge);
        professor.setPersonal_qualities(qualities);
        professor.setCity(city);
        professors.save(professor);
    }
}
