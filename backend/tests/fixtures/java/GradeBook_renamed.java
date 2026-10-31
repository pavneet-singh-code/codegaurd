import java.util.ArrayList;
import java.util.List;

public class Marks {
    private final List<Integer> grades = new ArrayList<>();

    public void record(int mark) {
        if (mark < 0 || mark > 100) {
            throw new IllegalArgumentException("Invalid mark");
        }
        grades.add(mark);
    }

    public double mean() {
        if (grades.isEmpty()) {
            return 0.0;
        }
        int sum = 0;
        for (int g : grades) {
            sum += g;
        }
        return (double) sum / grades.size();
    }

    public int maximum() {
        int top = Integer.MIN_VALUE;
        for (int g : grades) {
            if (g > top) {
                top = g;
            }
        }
        return top;
    }

    public int numberGreater(double cutoff) {
        int n = 0;
        for (int g : grades) {
            if (g > cutoff) {
                n++;
            }
        }
        return n;
    }

    public static void main(String[] a) {
        Marks m = new Marks();
        int[] data = {72, 88, 95, 61, 79};
        for (int x : data) {
            m.record(x);
        }
        System.out.println("Mean: " + m.mean());
        System.out.println("Max: " + m.maximum());
        System.out.println("Over 75: " + m.numberGreater(75));
    }
}
