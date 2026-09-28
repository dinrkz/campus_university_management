import java.util.ArrayList;
import java.util.Scanner;
public class Main{
        public static boolean isValidProfessor(int age, int exp) {
                if (age < 18 || age > 100) {
                        System.out.println("Validation Error: Age must be between 18 and 100.");
                        return false;
                }
                if (exp < 0 || exp > age - 18) {
                        System.out.println("Validation Error: Experience is not realistic for this age.");
                        return false;
                }
                return true;
        }






        public static void main(String[] args) {
                Scanner in=new Scanner(System.in);
                ArrayList<Entity>entities=new ArrayList<>();
                DatabaseManager dbManager = new DatabaseManager();
                while(true) {
                        System.out.println("Welcome to University Management System");
                        System.out.println("Write down what service you need.");
                        System.out.println("1-add professor \n" +
                                "2-add university \n" +
                                "3-showing everything in program\n" +
                                "4-sorting tables\n" +
                                "5-delete table from DB \n" +
                                "6-update data(University/Professor)\n" +
                                "7-show statistics\n" +
                                "8-search professor\n" +
                                "9-quit");
                        int a;
                        try {
                                System.out.print("Choose your number:");
                                a = in.nextInt();
                                in.nextLine();
                        } catch (Exception e) {
                                System.out.println("Error: Please enter a NUMBER between 1 and 9.");
                                in.nextLine();
                                continue;
                        }
                        if (a == 1) {
                                System.out.printf("\n1.Name professor:");
                                String name = in.nextLine();
                                System.out.printf("2.Enter the age:");
                                int age = in.nextInt();
                                in.nextLine();
                                System.out.printf("3.Enter the department:");
                                String dep = in.nextLine();
                                System.out.printf("4.Enter the experience years:");
                                int exp = in.nextInt();
                                if (!isValidProfessor(age, exp)) {
                                        System.out.println("Professor was NOT saved due to invalid data.");
                                        continue;
                                }
                                in.nextLine();
                                System.out.printf("5.Enter the knowledge:");
                                String knwl = in.nextLine();
                                System.out.printf("6.Enter your personal qualities (you can leave it blank):");
                                String prq = in.nextLine();
                                System.out.printf("7.Enter the city:");
                                String city=in.nextLine();
                                Professor teach=new Professor(name,age,dep,exp,knwl,prq,city);
                                entities.add(teach);
                                dbManager.saveProfessor(teach);
                                System.out.println("Professor successfully saved!");
                        } else if (a == 2) {
                                System.out.printf("\n1.Name of University:");
                                String name = in.nextLine();
                                System.out.printf("2.Location of University:");
                                String loc = in.nextLine();
                                System.out.printf("3.Enter Education Direction:");
                                String edud = in.nextLine();
                                System.out.printf("4.Enter the creation year:");
                                int year = in.nextInt();
                                in.nextLine();
                                System.out.printf("5.Enter the course:");
                                String cour = in.nextLine();
                                University univer=new University(name, loc, edud, year, cour);
                                entities.add(univer);
                                dbManager.saveUniversity(univer);
                                System.out.println("University successfully saved!");
                        } else if (a == 3) {
                                System.out.println("\nWhat do you need?");
                                System.out.println("1-University " +"2-Professors "+"3-Everything");
                                System.out.printf("Choose your number:");
                                int s=in.nextInt();
                                in.nextLine();
                                if(s==1){
                                        for(Entity e:entities){
                                                if(e instanceof University) e.showInfo();
                                        }
                                }
                                else if(s==2){
                                        for(Entity e:entities){
                                                if(e instanceof Professor) e.showInfo();
                                        }
                                }
                                else if(s==3){
                                        for(Entity e:entities){
                                                System.out.println(e.toString());
                                        }
                                }else{
                                        System.out.println("Choose the number between 1 and 3");
                                }
                        } else if (a == 4) {
                                System.out.println("\nChoose sorting table");
                                System.out.println("1-University table " + "2-Professors table");
                                System.out.printf("Choose your number:");
                                int i=in.nextInt();
                                in.nextLine();
                                if(i==1) dbManager.UniversitiessortedbyYear();
                                if(i==2) dbManager.ProfessorssortedbyYear();
                                else{
                                        System.out.println("Choose number between 1 and 2");
                                        continue;
                                }
                        }else if (a == 5) {
                                System.out.println("\nSelect which database you want to delete?\n" +
                                        "1-Professors " +
                                        "2-Universities");
                                System.out.printf("Choose  your number:");
                                int i = in.nextInt();
                                in.nextLine();
                                if (i == 1) {
                                        System.out.printf("ID Professor:");
                                        int id = in.nextInt();
                                        in.nextLine();
                                        dbManager.deleteProfessor(id);
                                        System.out.println("Professor successfully deleted!");
                                } else if (i == 2) {
                                        System.out.printf("Name University:");
                                        String name = in.nextLine();
                                        dbManager.deleteUniversity(name);
                                        System.out.println("University successfully deleted!");
                                }else{
                                        System.out.println("Choose the number between 1 and 2");
                                }
                        }else if (a == 6) {
                                System.out.println("\nWhat do you want to update?");
                                System.out.println("1-Location University " + "2-Department Professors " + "3-City Professors");
                                System.out.printf("Choose your number:");
                                int p = in.nextInt();
                                in.nextLine();
                                if (p == 1) {
                                        System.out.printf("University id:");
                                        int id = in.nextInt();
                                        in.nextLine();
                                        System.out.printf("Update Location University:");
                                        String loc = in.nextLine();
                                        dbManager.updateUniversityLocation(id, loc);
                                        System.out.println("University location successfully updated!");
                                }
                                if (p == 2) {
                                        System.out.printf("Professor id:");
                                        int id = in.nextInt();
                                        in.nextLine();
                                        System.out.printf("Update Department Professor:");
                                        String dep=in.nextLine();
                                        dbManager.updateProfessorExperience(id,dep);
                                        System.out.println("Department successfully updated!");
                                }if(p==3){
                                        System.out.printf("Professor name:");
                                        String name=in.nextLine();
                                        System.out.printf("Update City Professor:");
                                        String city=in.nextLine();
                                        dbManager.updateProfCity(name,city);
                                        System.out.println("City successfully updated!");
                                }else{
                                        System.out.println("Choose the number between 1 and 3");
                                }
                        }else if(a==7){
                                dbManager.showStatistics();
                        }else if(a==8) {
                                System.out.printf("\nEnter name, department or skill to search:");
                                String keyword = in.nextLine();
                                dbManager.searchProfessor(keyword);
                        }else if (a == 9) {
                                System.out.println("\nProgram terminated");
                                break;
                        }
                        else{
                                System.out.println("Please enter a number between 1 and 9");
                                continue;
                        }
                        System.out.println("\n------------------------------------\n");
                }

        }
}