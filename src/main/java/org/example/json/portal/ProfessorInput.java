package org.example.json.portal;

import jakarta.validation.constraints.*;
import org.example.json.Professor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public record ProfessorInput(
        @NotBlank(message = "Введите имя преподавателя.")
        @Size(max = 200, message = "Имя должно содержать не более 200 символов.") String name,
        @NotNull(message = "Введите возраст.")
        @Min(value = 18, message = "Возраст должен быть не меньше 18 лет.")
        @Max(value = 100, message = "Возраст должен быть не больше 100 лет.") Integer age,
        @NotBlank(message = "Введите кафедру.")
        @Size(max = 255, message = "Кафедра должна содержать не более 255 символов.") String department,
        @NotNull(message = "Введите стаж.")
        @Min(value = 0, message = "Стаж не может быть отрицательным.") Integer experience,
        @NotBlank(message = "Введите специализацию.")
        @Size(max = 255, message = "Специализация должна содержать не более 255 символов.") String knowledge,
        @Size(max = 255, message = "Качества должны содержать не более 255 символов.") String personal_qualities,
        @NotBlank(message = "Введите город.")
        @Size(max = 255, message = "Город должен содержать не более 255 символов.") String city
) {
    public void applyTo(Professor professor) {
        if (experience > age - 18) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Стаж не может превышать количество лет после достижения 18 лет.");
        }
        professor.setName(name.strip());
        professor.setAge(age);
        professor.setDepartment(department.strip());
        professor.setExperience(experience);
        professor.setKnowledge(knowledge.strip());
        professor.setPersonal_qualities(personal_qualities == null ? "" : personal_qualities.strip());
        professor.setCity(city.strip());
    }
}
