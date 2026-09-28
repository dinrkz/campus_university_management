import java.util.Objects;

public abstract class Entity {
    protected String name;
    public Entity(String name){
        this.name=name;
    }

    public String getName() {
        return name;
    }
    public abstract void showInfo();
    public abstract boolean equals(Objects obj);
    public abstract int hashCode();
    public abstract String toString();
}
