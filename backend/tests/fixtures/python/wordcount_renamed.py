import sys


def normalise(token):
    return "".join(c for c in token.lower() if c.isalnum())


def tally(rows):
    freq = {}
    for row in rows:
        for piece in row.split():
            w = normalise(piece)
            if not w:
                continue
            if w in freq:
                freq[w] += 1
            else:
                freq[w] = 1
    return freq


def best(freq, limit):
    order = sorted(freq.items(), key=lambda kv: (-kv[1], kv[0]))
    return order[:limit]


def run():
    rows = sys.stdin.readlines()
    freq = tally(rows)
    for w, c in best(freq, 5):
        print(w + ": " + str(c))


if __name__ == "__main__":
    run()
