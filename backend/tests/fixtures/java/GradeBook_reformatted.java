// Student A's gradebook -- same code, different layout and comments
import java.util.ArrayList; import java.util.List;
/* A simple gradebook.
   Written for CS201. */
public class GradeBook
{
    private final List<Integer> scores = new ArrayList<>();
    public void addScore(int score)
    {
        if (score < 0 || score > 100)
        {   throw new IllegalArgumentException("Score out of range");   }
        scores.add(score);   // store it
    }
    public double average()
    {
        if (scores.isEmpty()) { return 0.0; }
        int total = 0;
        for (int s : scores) { total += s; }
        return (double) total / scores.size();
    }
    public int highest()
    {
        int best = Integer.MIN_VALUE;
        for (int s : scores)
        {
            if (s > best) { best = s; }
        }
        return best;
    }
    public int countAbove(double limit)
    {
        int count = 0;
        for (int s : scores) { if (s > limit) { count++; } }
        return count;
    }
    public static void main(String[] args)
    {
        GradeBook book = new GradeBook();
        int[] input = {72, 88, 95, 61, 79};
        for (int value : input) { book.addScore(value); }
        System.out.println("Average: " + book.average());
        System.out.println("Highest: " + book.highest());
        System.out.println("Above 75: " + book.countAbove(75));
    }
}
