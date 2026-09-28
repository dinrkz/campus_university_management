import java.sql.*;

public class DatabaseManager {
    private static final String URL = System.getenv().getOrDefault("DB_URL", "jdbc:postgresql://localhost:5432/oop_db");
    private static final String USER = System.getenv().getOrDefault("DB_USERNAME", "postgres");
    private static final String PASSWORD = System.getenv().getOrDefault("DB_PASSWORD", "");

    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(URL, USER, PASSWORD);
    }




    public void saveUniversity(University uni) {
        String sql = "INSERT INTO universities (name, location, education_direction, creation_year, course) VALUES (?, ?, ?, ?, ?)";
        try (Connection conn = getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, uni.getName());
            pstmt.setString(2, uni.getLocation());
            pstmt.setString(3, uni.getEducationdirect());
            pstmt.setInt(4, uni.getYear());
            pstmt.setString(5, uni.getCourse());
            pstmt.executeUpdate();
        } catch (SQLException e) {
            System.out.println("Error saving university: " + e.getMessage());
        }
    }
    public void saveProfessor(Professor prof) {
        String sql = "INSERT INTO professors (name, age, department, experience, knowledge, personal_qualities,city) VALUES (?, ?,?, ?, ?, ?, ?)";
        try (Connection conn = getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, prof.getName());
            pstmt.setInt(2, prof.getAge());
            pstmt.setString(3, prof.getDep());
            pstmt.setInt(4, prof.getExperience());
            pstmt.setString(5, prof.getKnowledge());
            pstmt.setString(6, prof.getPersonalqual());
            pstmt.setString(7,prof.getCity());
            pstmt.executeUpdate();
        } catch (SQLException e) {
            System.out.println("Error saving professor: " + e.getMessage());
        }
    }








    public void deleteUniversity(String name) {
        String sql = "DELETE FROM universities WHERE name = ?";
        try (Connection conn = getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, name);
            int deleted = pstmt.executeUpdate();
            if (deleted > 0) System.out.println("University deleted from DB.");
        } catch (SQLException e) {
            System.out.println("Error deleting university: " + e.getMessage());
        }
    }
    public void deleteProfessor(int id) {
        String sql = "DELETE FROM professors WHERE id = ?";
        try(Connection conn=getConnection();
            PreparedStatement pstmt=conn.prepareStatement(sql)) {
            pstmt.setInt(1,id);
            int deleted=pstmt.executeUpdate();
            if (deleted > 0) System.out.println("Professor deleted from DB.");
            else System.out.println("Professor not deleted from DB.");
        }catch (SQLException e) {
            System.out.println("Error deleting Professor: " + e.getMessage());
        }

    }




    public void updateUniversityLocation(int id, String location) {
        String sql = "UPDATE universities SET location = ? WHERE id = ?";
        try (Connection conn= getConnection();
             PreparedStatement ps= conn.prepareStatement(sql)){

            ps.setInt(2,id);
            ps.setString(1,location);
            ps.executeUpdate();
        }catch(SQLException e) {
            System.out.println("Error saving university: " + e.getMessage());
        }
    }
    public void updateProfessorExperience(int id, String dep) {
        String sql = "UPDATE professors SET department = ? WHERE id = ?";
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, dep);
            ps.setInt(2, id);
            ps.executeUpdate();
        } catch (SQLException e) {
            System.out.println("Error saving Professor: " + e.getMessage());
        }
    }
    public void updateProfCity(String name,String city){
        String sql="UPDATE professors SET city = ? WHERE name = ?";
        try(Connection conn=getConnection();
        PreparedStatement ps=conn.prepareStatement(sql)){
            ps.setString(1,city);
            ps.setString(2,name);
            ps.executeUpdate();
        }catch(SQLException e){
            System.out.println("Error saving Professor: " + e.getMessage());
        }
    }










    public void UniversitiessortedbyYear(){
        String sql = "SELECT * FROM universities ORDER BY creation_year ASC";
        try(Connection conn=getConnection();
            Statement stmt=conn.createStatement();
            ResultSet rs=stmt.executeQuery(sql)) {
            System.out.println("Universities sorted by year");
            while (rs.next()) {
                System.out.println("ID: " + rs.getInt("id") +
                        "| Name: " + rs.getString("name") +
                        "| Year: " + rs.getInt("creation_year"));
            }
        } catch(SQLException e){
                System.out.println("Error: " + e.getMessage());
        }
    }
    public void ProfessorssortedbyYear(){
        String sql = "SELECT * FROM professors ORDER BY experience ASC";
        try(Connection conn=getConnection();
            Statement stmt=conn.createStatement();
            ResultSet rs=stmt.executeQuery(sql)){
            System.out.println("Professors sorted by year");
            while(rs.next()){
                System.out.println("ID"+ rs.getInt("id")+
                        "|Name "+rs.getString("name")+
                        "|Experience "+rs.getString("experience"));
            }
        }catch(SQLException e){
            System.out.println("Error: " + e.getMessage());
        }
    }










    public void showStatistics() {
        String sqlProf = "SELECT COUNT(*) as count, AVG(experience) as avg_exp FROM professors";
        String sqlUni = "SELECT COUNT(*) as count FROM universities";

        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {
            ResultSet rsP = stmt.executeQuery(sqlProf);
            if (rsP.next()) {
                System.out.println("--- Professor Stats ---");
                System.out.println("Total Professors: " + rsP.getInt("count"));
                System.out.printf("Average Experience: %.1f years\n", rsP.getDouble("avg_exp"));
            }

            ResultSet rsU = stmt.executeQuery(sqlUni);
            if (rsU.next()) {
                System.out.println("--- University Stats ---");
                System.out.println("Total Universities: " + rsU.getInt("count"));
            }
            System.out.println("-----------------------");

        } catch (SQLException e) {
            System.out.println("Statistics error: " + e.getMessage());
        }
    }








    public void searchProfessor(String keyword) {
        String sql = "SELECT * FROM professors WHERE name ILIKE ? OR department ILIKE ? OR knowledge ILIKE ?";

        try (Connection conn = getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            String pattern = "%" + keyword + "%";
            pstmt.setString(1, pattern);
            pstmt.setString(2, pattern);
            pstmt.setString(3, pattern);

            ResultSet rs = pstmt.executeQuery();
            System.out.println("--- Search Results for: " + keyword + " ---");
            boolean found = false;
            while (rs.next()) {
                found = true;
                System.out.println("ID: " + rs.getInt("id") +
                        " | Name: " + rs.getString("name") +
                        " | Dept: " + rs.getString("department") +
                        " | Knowledge: " + rs.getString("knowledge"));
            }
            if (!found) System.out.println("No professors found matching that keyword.");

        } catch (SQLException e) {
            System.out.println("Search error: " + e.getMessage());
        }
    }
}

