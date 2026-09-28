import java.util.Objects;
public class Professor extends Entity {
    private int age;
    private String dep;
    private int experience;
    private String knowledge;
    private String personalqual;
    private String city;
    public Professor(String name, int age, String dep, int experience, String knowledge,String personalqual,String city){
        super(name);
        this.age=age;
        this.dep=dep;
        this.experience=experience;
        this.knowledge=knowledge;
        this.city=city;
        if(personalqual==null|| personalqual.isEmpty() ){
            this.personalqual="Не указан";
        }else{
            this.personalqual=personalqual;
        }
    }

    public int getAge(){
        return age;
    }

    public int getExperience() {
        return experience;
    }

    public String getKnowledge() {
        return knowledge;
    }

    public String getDep() {
        return dep;
    }

    public String getPersonalqual() {
        return personalqual;
    }

    public void setName(String name){
        this.name=name;
    }
    public void setAge(int age){
        this.age=age;
    }

    public void setDep(String dep) {
        this.dep = dep;
    }

    public void setExperience(int experience) {
        this.experience=experience;
    }

    public void setKnowledge(String knowledge) {
        this.knowledge = knowledge;
    }

    public void setPersonalqual(String personalqual) {
        this.personalqual = personalqual;
    }
    public String getCity() { return city; }
    public void setCity(String city){ this.city=city; }


    public void showInfo(){
        System.out.println(this.toString());
    }
    public String toString() {
        return "Professor{"+"name=' "+name+ '\'' +", age=' "+age+'\''+", department=' "+dep+'\''+", experience= '"+experience+'\''+", knowledge=' "+knowledge+'\''+", personal quality=' "+personalqual+'\''+"}";
    }
    public int hashCode(){
        return Objects.hash(name,age,dep,experience);
    }
    public boolean equals(Objects obj){
        return true;
    }
}
