package org.example.json;

import jakarta.persistence.*;

@Entity
@Table(name = "universities")
public class Universities {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;
    private String location;
    private String education_direction;
    private Integer creation_year;
    private String course;

    public Universities() {}

    public String getName() {return name;}
    public void setName(String name) {this.name = name;}

    public String getLocation() {return location;}
    public void setLocation(String location) {this.location = location;}

    public String getEducation_direction() {return education_direction;}
    public void setEducation_direction(String education_direction) {this.education_direction = education_direction;}

    public Integer getCreation_year() {return creation_year;}

    public void setCreation_year(Integer creation_year) {this.creation_year = creation_year;}

    public String getCourse() {return course;}
    public void setCourse(String course) {this.course = course;}

    public Integer getId() {return id;}
    public void setId(Integer id) {this.id = id;}

}

