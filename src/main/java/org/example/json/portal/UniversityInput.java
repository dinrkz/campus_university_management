package org.example.json.portal;

import jakarta.validation.constraints.*;
import org.example.json.Universities;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Year;

/** Editable fields of the original university entity; IDs are always assigned by the server. */
public record UniversityInput(
        @NotBlank(message = "Введите название университета.")
        @Size(max = 200, message = "Название должно содержать не более 200 символов.") String name,
        @NotBlank(message = "Введите город университета.")
        @Size(max = 255, message = "Город должен содержать не более 255 символов.") String location,
        @NotBlank(message = "Введите направление обучения.")
        @Size(max = 255, message = "Направление должно содержать не более 255 символов.") String education_direction,
        @NotNull(message = "Введите год основания.")
        @Min(value = 1000, message = "Год основания должен быть не меньше 1000.") Integer creation_year,
        @NotBlank(message = "Введите программу обучения.")
        @Size(max = 255, message = "Программа должна содержать не более 255 символов.") String course
) {
    public void applyTo(Universities university) {
        if (creation_year > Year.now().getValue()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Год основания не может быть в будущем.");
        }
        university.setName(name.strip());
        university.setLocation(location.strip());
        university.setEducation_direction(education_direction.strip());
        university.setCreation_year(creation_year);
        university.setCourse(course.strip());
    }
}
