import java.util.ArrayList;
import java.util.List;

public class ScoreTracker {
    private final List<Integer> scores = new ArrayList<>();

    public void addScore(int score) {
        if (score < 0 || score > 100) {
            throw new IllegalArgumentException("Score out of range");
        }
        scores.add(score);
    }

    public double average() {
        if (scores.size() == 0) {
            return 0.0;
        }
        double total = 0;
        for (int i = 0; i < scores.size(); i++) {
            total = total + scores.get(i);
        }
        return total / scores.size();
    }

    public int highest() {
        int best = Integer.MIN_VALUE;
        for (int s : scores) {
            if (s > best) {
                best = s;
            }
        }
        return best;
    }

    public int lowest() {
        int worst = Integer.MAX_VALUE;
        for (int s : scores) {
            worst = Math.min(worst, s);
        }
        return worst;
    }

    public int countAbove(double limit) {
        int count = 0;
        int i = 0;
        while (i < scores.size()) {
            if (scores.get(i) >= limit) {
                count += 1;
            }
            i++;
        }
        return count;
    }

    public static void main(String[] args) {
        ScoreTracker tracker = new ScoreTracker();
        int[] input = {72, 88, 95, 61, 79};
        for (int value : input) {
            tracker.addScore(value);
        }
        System.out.println("Average: " + tracker.average());
        System.out.println("Lowest: " + tracker.lowest());
        System.out.println("Highest: " + tracker.highest());
    }
}
