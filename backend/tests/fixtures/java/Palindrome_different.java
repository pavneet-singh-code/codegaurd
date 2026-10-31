import java.util.Scanner;

public class Palindrome {
    static boolean isPalindrome(String text) {
        String cleaned = text.toLowerCase().replaceAll("[^a-z0-9]", "");
        int left = 0, right = cleaned.length() - 1;
        while (left < right) {
            if (cleaned.charAt(left++) != cleaned.charAt(right--)) {
                return false;
            }
        }
        return true;
    }

    static String reverseWords(String line) {
        String[] parts = line.trim().split("\\s+");
        StringBuilder out = new StringBuilder();
        for (int i = parts.length - 1; i >= 0; i--) {
            out.append(parts[i]);
            if (i > 0) out.append(' ');
        }
        return out.toString();
    }

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        while (in.hasNextLine()) {
            String line = in.nextLine();
            System.out.println(isPalindrome(line) ? "yes" : "no");
            System.out.println(reverseWords(line));
        }
    }
}
