package org.example.json;

import jakarta.persistence.*;


@Entity
@Table(name = "professors")
public class Professor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;
    private Integer age;
    private String department;
    private Integer experience;
    private String knowledge;
    private String personal_qualities;
    private String city;

    public void  setId(Integer id) {this.id = id;}
    public Integer getId() {return id;}

    public void setName(String name) {this.name = name;}
    public String getName() {return name;}

    public void setAge(Integer age) {this.age = age;}
    public Integer getAge() {return age;}

    public void setDepartment(String department) {this.department = department;}
    public String getDepartment() {return department;}

    public void setExperience(Integer experience) {this.experience = experience;}
    public Integer getExperience() {return experience;}

    public void setKnowledge(String knowledge) {this.knowledge = knowledge;}
    public String getKnowledge() {return knowledge;}

    public void setPersonal_qualities(String personal_qualities) {this.personal_qualities = personal_qualities;}
    public String getPersonal_qualities() {return personal_qualities;}

    public void setCity(String city) {this.city = city;}
    public String getCity() {return city;}

}