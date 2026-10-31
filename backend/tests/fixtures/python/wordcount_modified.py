import sys
from collections import defaultdict


def clean(word):
    return "".join(ch for ch in word.lower() if ch.isalnum())


def count_words(lines):
    counts = defaultdict(int)
    for line in lines:
        for raw in line.split():
            word = clean(raw)
            if len(word) > 2:
                counts[word] += 1
    return counts


def top_words(counts, n):
    ranked = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
    return ranked[:n]


def longest_word(counts):
    best = ""
    for word in counts:
        if len(word) > len(best):
            best = word
    return best


def main():
    lines = sys.stdin.readlines()
    counts = count_words(lines)
    for word, total in top_words(counts, 10):
        print(f"{word}: {total}")
    print("longest:", longest_word(counts))


if __name__ == "__main__":
    main()
