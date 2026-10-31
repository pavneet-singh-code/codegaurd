import re
from collections import Counter


class Report:
    def __init__(self, text):
        self.tokens = re.findall(r"[a-z0-9']+", text.lower())
        self.freq = Counter(self.tokens)

    def most_common(self, k=5):
        return self.freq.most_common(k)

    def unique_ratio(self):
        if not self.tokens:
            return 0.0
        return len(self.freq) / len(self.tokens)


def read_all():
    chunks = []
    try:
        while True:
            chunks.append(input())
    except EOFError:
        pass
    return "\n".join(chunks)


if __name__ == "__main__":
    rep = Report(read_all())
    print(rep.most_common())
    print(round(rep.unique_ratio(), 3))
