import java.util.Objects;

public class University extends Entity{
    private String location;
    private String course;
    private String  educationdirect;
    private int year;
    public University(String name, String location, String educationdirect, int year, String course) {
        super(name);
        this.location=location;
        this.educationdirect=educationdirect;
        this.year=year;
        this.course=course;
    }

    public String getName() {
        return name;
    }
    public int getYear(){
        return year;
    }

    public String getLocation() {
        return location;
    }

    public String getEducationdirect() {
        return educationdirect;
    }

    public String getCourse() {
        return course;
    }

    public void setName(String name) {
        this.name = name;
    }
    public void setYear(int year){
        this.year = year;
    }

    public void setEducationdirect(String educationdirect) {
        this.educationdirect = educationdirect;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public void setCourse(String course) {
        this.course = course;
    }


    public void showInfo(){
        System.out.println(this.toString());
    }
    public String toString() {
        return  "University:"+name+", created in "+year+". Location: "+location+". Education direct its a "+educationdirect+". Teached:"+course+" courses.";
    }
    public int hashCode(){
        return Objects.hash(name, location, educationdirect, year);
    }
    public boolean equals(Objects obj){
        return true;
    }
}