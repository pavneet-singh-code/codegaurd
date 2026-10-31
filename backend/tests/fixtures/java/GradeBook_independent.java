import java.util.Arrays;

public class Stats {
    static int[] data = new int[0];

    static void push(int v) {
        data = Arrays.copyOf(data, data.length + 1);
        data[data.length - 1] = v;
    }

    static double mean(int index) {
        if (index == data.length) {
            return 0;
        }
        return data[index] / (double) data.length + mean(index + 1);
    }

    static int[] sorted() {
        int[] copy = data.clone();
        Arrays.sort(copy);
        return copy;
    }

    static int median() {
        int[] s = sorted();
        return s[s.length / 2];
    }

    static String describe() {
        StringBuilder sb = new StringBuilder();
        sb.append("n=").append(data.length);
        sb.append(", median=").append(median());
        sb.append(", range=").append(sorted()[data.length - 1] - sorted()[0]);
        return sb.toString();
    }

    public static void main(String[] args) {
        push(72); push(88); push(95); push(61); push(79);
        System.out.printf("%.2f%n", mean(0));
        System.out.println(describe());
    }
}
